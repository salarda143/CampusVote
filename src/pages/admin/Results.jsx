import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Trophy,
  Users,
  Vote,
  Printer,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon size={20} className="text-blue-700" />
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

export default function Results() {
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [results, setResults] = useState(null);
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [resultsOverlayOpen, setResultsOverlayOpen] = useState(false);

  const selectedElection = useMemo(
    () => elections.find((item) => item.id === selectedElectionId) || null,
    [elections, selectedElectionId]
  );

  const loadElections = useCallback(async () => {
    setLoadingElections(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("elections")
      .select("id, title, school_year, status, start_date, end_date, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setElections([]);
      setSelectedElectionId("");
    } else {
      const activeElections = data || [];

      // Automatically select the newest active election.
      const activeElection = activeElections[0] || null;

      setElections(activeElections);
      setSelectedElectionId(activeElection?.id || "");
    }

    setLoadingElections(false);
  }, []);

  const loadResults = useCallback(async (electionId, { silent = false } = {}) => {
    if (!electionId) {
      setResults(null);
      return;
    }

    if (!silent) setLoadingResults(true);
    setError("");

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("admin-election-results", {
          body: { election_id: electionId },
        });

      if (functionError) {
        let message = functionError.message;
        try {
          const details = await functionError.context?.json();
          if (details?.error) message = details.error;
        } catch {
          // Keep the original function error message.
        }
        throw new Error(message || "Unable to load election results.");
      }

      if (data?.error) throw new Error(data.error);

      setResults(data);
      setLastUpdated(new Date());
    } catch (err) {
      setResults(null);
      setError(err.message || "Unable to load election results.");
    } finally {
      if (!silent) setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    loadElections();
  }, [loadElections]);

  useEffect(() => {
    loadResults(selectedElectionId);
  }, [selectedElectionId, loadResults]);

  // Subscribe to new ballot records and silently reload the aggregate results.
  // The debounce combines the ballot-selection and participation events from one submission.
  useEffect(() => {
    if (!selectedElectionId) return undefined;

    let refreshTimer;

    const refreshResults = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        loadResults(selectedElectionId, { silent: true });
      }, 300);
    };

    const channel = supabase
      .channel(`live-election-results-${selectedElectionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ballot_selections",
          filter: `election_id=eq.${selectedElectionId}`,
        },
        refreshResults
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "voting_participation",
          filter: `election_id=eq.${selectedElectionId}`,
        },
        refreshResults
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [selectedElectionId, loadResults]);

  const refreshAll = async () => {
    await loadElections();
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const printResults = (mode = "all") => {
    if (!results) return;

    setPrintMenuOpen(false);

    const allPositions = results.positions || [];

    const positions =
      mode === "winners"
        ? allPositions.map((position) => {
            const winnerIds = position.tied
              ? new Set((position.leaders || []).map((leader) => leader.id))
              : position.winner?.id
                ? new Set([position.winner.id])
                : new Set();

            return {
              ...position,
              candidates: (position.candidates || []).filter((candidate) =>
                winnerIds.has(candidate.id)
              ),
            };
          })
        : allPositions;

    const positionsHtml = positions.map((position) => {
      const winnerText = position.tied
        ? `Tie — ${(position.leaders || []).length} candidates`
        : position.winner
          ? `Winner: ${escapeHtml(position.winner.first_name)} ${escapeHtml(position.winner.last_name)}`
          : "No winner";

      const candidatesHtml = (position.candidates || [])
        .map(
          (candidate) => `
            <tr>
              <td>${escapeHtml(candidate.first_name)} ${escapeHtml(candidate.last_name)}</td>
              <td>${escapeHtml(candidate.party_name || "Independent")}</td>
              <td class="votes">${candidate.votes ?? 0}</td>
              <td class="votes">${candidate.percentage ?? 0}%</td>
            </tr>
          `
        )
        .join("");

      return `
        <section class="position">
          <div class="position-header">
            <div>
              <h2>${escapeHtml(position.position_name)}</h2>
              <p>${position.total_votes ?? 0} vote${position.total_votes === 1 ? "" : "s"} recorded</p>
            </div>
            <strong>${winnerText}</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Party</th>
                <th>Votes</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>${candidatesHtml}</tbody>
          </table>
        </section>
      `;
    }).join("");

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      setError("Unable to open the print window. Please allow pop-ups for CampusVote.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(results.election?.title || "Election Results")} — ${mode === "winners" ? "Winner Candidates" : "All Candidates"}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              background: #fff;
            }
            .header {
              border-bottom: 2px solid #172554;
              padding-bottom: 18px;
              margin-bottom: 22px;
            }
            .brand {
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 1px;
              color: #1d4ed8;
              text-transform: uppercase;
            }
            h1 { margin: 6px 0; font-size: 28px; }
            .meta { color: #475569; font-size: 13px; }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin: 20px 0 28px;
            }
            .stat {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 14px;
            }
            .stat-label { color: #64748b; font-size: 11px; text-transform: uppercase; }
            .stat-value { font-size: 22px; font-weight: 700; margin-top: 5px; }
            .position {
              margin-bottom: 28px;
              break-inside: avoid;
            }
            .position-header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .position-header h2 { margin: 0; font-size: 18px; }
            .position-header p { margin: 4px 0 0; color: #64748b; font-size: 12px; }
            .position-header strong { font-size: 12px; text-align: right; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; }
            .votes { text-align: right; }
            .footer {
              margin-top: 36px;
              padding-top: 12px;
              border-top: 1px solid #cbd5e1;
              color: #64748b;
              font-size: 11px;
            }
            @media print {
              body { padding: 18px; }
              .position { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">CampusVote — Official Election Results</div>
            <h1>${escapeHtml(results.election?.title || "Election Results")}</h1>
            <div class="print-type">${mode === "winners" ? "Winner Candidates" : "All Candidates"}</div>
            <div class="meta">
              School Year: ${escapeHtml(results.election?.school_year || "—")}
              &nbsp;•&nbsp;
              Printed: ${escapeHtml(formatDateTime(new Date()))}
            </div>
          </div>

          <div class="summary">
            <div class="stat">
              <div class="stat-label">Eligible Voters</div>
              <div class="stat-value">${results.summary?.eligible_voters ?? 0}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Ballots Submitted</div>
              <div class="stat-value">${results.summary?.ballots_submitted ?? 0}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Voter Turnout</div>
              <div class="stat-value">${results.summary?.turnout_percentage ?? 0}%</div>
            </div>
          </div>

          ${positionsHtml}

          <div class="footer">
            Generated from CampusVote Election Results.
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Election Results</h1>
          <p className="mt-1 text-sm text-slate-500">
            Showing results for the active election.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={refreshAll}
            disabled={loadingElections || loadingResults}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loadingElections || loadingResults ? "animate-spin" : ""}
            />
            Refresh Results
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingElections ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading active election...
        </div>
      ) : !selectedElection ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">No Active Election</h2>
          <p className="mt-1 text-sm text-slate-500">
            Results will automatically appear here when an election is active.
          </p>
        </div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Active Election
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {selectedElection.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                School Year: {selectedElection.school_year}
              </p>
            </div>
            <span className="w-fit rounded-full bg-green-100 px-3 py-2 text-xs font-bold uppercase text-green-700">
              Live Results
            </span>
          </div>
        </section>
      )}

      {loadingResults ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Loading election results...
        </div>
      ) : results ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Users}
              label="Eligible Voters"
              value={results.summary?.eligible_voters ?? 0}
              helper="Students eligible for this election"
            />
            <StatCard
              icon={Vote}
              label="Ballots Submitted"
              value={results.summary?.ballots_submitted ?? 0}
              helper="Recorded voting participation"
            />
            <StatCard
              icon={Activity}
              label="Voter Turnout"
              value={`${results.summary?.turnout_percentage ?? 0}%`}
              helper="Submitted ballots ÷ eligible voters"
            />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-slate-900">
              {results.election?.title}
            </h2>
            <p className="text-sm text-slate-500">
              School Year: {results.election?.school_year}
              {lastUpdated && ` • Updated ${formatDateTime(lastUpdated)}`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Election Results</h3>
                <p className="mt-1 text-sm text-slate-500">
                  View candidate vote counts and winners in an overlay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResultsOverlayOpen(true)}
                disabled={!results.positions || results.positions.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BarChart3 size={17} />
                View Results
              </button>
            </div>
          </div>

          {resultsOverlayOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setResultsOverlayOpen(false);
                }
              }}
            >
              <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      Election Results
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {results.election?.title}
                    </h2>
                    <p className="text-sm text-slate-500">
                      School Year: {results.election?.school_year}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPrintMenuOpen((open) => !open)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        <Printer size={16} />
                        Print Results
                      </button>

                      {printMenuOpen && (
                        <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => printResults("all")}
                            className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            All Candidates
                          </button>
                          <button
                            type="button"
                            onClick={() => printResults("winners")}
                            className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Winner Candidates
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPrintMenuOpen(false);
                        setResultsOverlayOpen(false);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto p-4 sm:p-6">
                  {!results.positions || results.positions.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                      No positions have been configured for this election.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {results.positions.map((position) => (
                        <section
                          key={position.id}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">
                                {position.position_name}
                              </h3>
                              <p className="text-sm text-slate-500">
                                {position.total_votes} vote
                                {position.total_votes === 1 ? "" : "s"} recorded
                              </p>
                            </div>
                            {position.winner ? (
                              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                                <Trophy size={15} />
                                Winner: {position.winner.first_name} {position.winner.last_name}
                              </span>
                            ) : position.tied ? (
                              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800">
                                <Award size={15} />
                                Tie — {position.leaders.length} candidates
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-500">
                                No votes recorded
                              </span>
                            )}
                          </div>

                          <div className="divide-y divide-slate-100">
                            {position.candidates.map((candidate) => (
                              <div key={candidate.id} className="p-5">
                                <div className="flex items-start gap-3">
                                  {candidate.photo_url ? (
                                    <img
                                      src={candidate.photo_url}
                                      alt={`${candidate.first_name} ${candidate.last_name}`}
                                      className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                                      {candidate.first_name?.[0]}
                                      {candidate.last_name?.[0]}
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                      <div>
                                        <p className="font-semibold text-slate-900">
                                          {candidate.first_name} {candidate.last_name}
                                          {position.winner?.id === candidate.id && (
                                            <CheckCircle2
                                              size={16}
                                              className="ml-2 inline text-green-600"
                                            />
                                          )}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {candidate.party_name || "Independent"}
                                          {candidate.grade_level
                                            ? ` • Grade ${candidate.grade_level}`
                                            : ""}
                                          {candidate.section ? ` - ${candidate.section}` : ""}
                                        </p>
                                      </div>
                                      <div className="text-left sm:text-right">
                                        <p className="font-bold tabular-nums text-slate-900">
                                          {candidate.votes} vote{candidate.votes === 1 ? "" : "s"}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {candidate.percentage}%
                                        </p>
                                      </div>
                                    </div>

                                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className="h-full rounded-full bg-blue-600 transition-all"
                                        style={{
                                          width: `${Math.max(
                                            0,
                                            Math.min(100, candidate.percentage || 0)
                                          )}%`,
                                        }}
                                      />
                                    </div>

                                    {position.tied &&
                                      position.leaders.some((leader) => leader.id === candidate.id) && (
                                        <p className="mt-2 text-xs font-semibold text-orange-700">
                                          Joint leader
                                        </p>
                                      )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : !error && selectedElectionId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No results to display.
        </div>
      ) : null}
    </div>
  );
}
