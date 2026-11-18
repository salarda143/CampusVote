import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw,
  Vote,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function CandidateBallot() {
  const location = useLocation();
  const navigate = useNavigate();
  const student = location.state?.student;
  const election = location.state?.election;

  const [positions, setPositions] = useState([]);
  const [selections, setSelections] = useState(location.state?.selections || {});
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!student?.lrn || !election?.id) {
      navigate("/student/elections", { replace: true });
      return;
    }
    loadBallot();
  }, []);

  async function loadBallot() {
    setLoading(true);
    setError("");

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "student-ballot-data",
        { body: { lrn: student.lrn, election_id: election.id } }
      );

      if (functionError) {
        let message = functionError.message;
        try {
          const details = await functionError.context?.json();
          if (details?.error) message = details.error;
        } catch {
          // Keep the original function error.
        }
        throw new Error(message || "Unable to load the ballot.");
      }

      if (!data?.positions) {
        throw new Error(data?.error || "The ballot data is incomplete.");
      }

      setPositions(data.positions);
      setCurrentPage(0);
    } catch (err) {
      setError(err.message || "Unable to load candidates.");
    } finally {
      setLoading(false);
    }
  }

  function toggleCandidate(position, candidateId) {
    setError("");
    setSelections((current) => {
      const selected = current[position.id] || [];
      const alreadySelected = selected.includes(candidateId);
      const maxVotes = Number(position.max_votes) || 1;

      let next;
      if (alreadySelected) {
        next = selected.filter((id) => id !== candidateId);
      } else if (selected.length < maxVotes) {
        next = [...selected, candidateId];
      } else {
        next = selected;
      }

      return { ...current, [position.id]: next };
    });
  }

  const completedPositions = useMemo(
    () => positions.filter((position) => (selections[position.id] || []).length > 0).length,
    [positions, selections]
  );

  // Show only 6 positions at a time.
  const POSITIONS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(positions.length / POSITIONS_PER_PAGE));
  const startIndex = currentPage * POSITIONS_PER_PAGE;
  const visiblePositions = positions.slice(
    startIndex,
    startIndex + POSITIONS_PER_PAGE
  );
  const isLastPage = currentPage >= totalPages - 1;

  // Every position on the current page must have at least one selection.
  const currentPageComplete = visiblePositions.every(
    (position) => (selections[position.id] || []).length > 0
  );

  // Every position in the entire ballot must be selected before review.
  const allPositionsComplete =
    positions.length > 0 &&
    positions.every((position) => (selections[position.id] || []).length > 0);

  function continueToReview() {
    if (!allPositionsComplete) {
      setError("Please select at least one candidate for every position before continuing.");
      return;
    }
    navigate("/student/ballot/review", {
      state: { student, election, positions, selections },
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-700 p-2 text-white">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">CampusVote</h1>
              <p className="text-xs text-slate-500">Student Election Portal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        <div className="my-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <Vote className="mt-0.5 shrink-0" size={20} />
          <p>
            Select your preferred candidate for each position. Follow the selection limit shown
            for each position. You can review your choices before final submission.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Unable to load ballot</p>
              <p className="mt-1 text-sm">{error}</p>
              <button onClick={loadBallot} className="mt-3 text-sm font-semibold underline">Try again</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border bg-white p-12 text-center">
            <RefreshCw className="mx-auto animate-spin text-blue-700" size={30} />
            <p className="mt-4 text-sm text-slate-500">Loading ballot and candidates...</p>
          </div>
        ) : !error && positions.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center">
            <Vote className="mx-auto text-slate-300" size={40} />
            <h3 className="mt-4 font-bold text-slate-900">No Positions Available</h3>
            <p className="mt-2 text-sm text-slate-500">
              There are no positions or candidates configured for this election yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visiblePositions.map((position, pageIndex) => {
              const index = startIndex + pageIndex;
              const selectedIds = selections[position.id] || [];
              const maxVotes = Number(position.max_votes) || 1;

              return (
                <section key={position.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Position {index + 1}</p>
                        <h3 className="mt-1 text-lg font-bold text-slate-900">{position.position_name}</h3>
                        {position.description && <p className="mt-1 text-sm text-slate-500">{position.description}</p>}
                      </div>
                      <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800">
                        Select up to {maxVotes}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
                    {(position.candidates || []).map((candidate) => {
                      const selected = selectedIds.includes(candidate.id);
                      const atLimit = selectedIds.length >= maxVotes;

                      return (
                        <button
                          type="button"
                          key={candidate.id}
                          onClick={() => toggleCandidate(position, candidate.id)}
                          disabled={!selected && atLimit}
                          aria-pressed={selected}
                          className={`relative rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-blue-700">
                              {candidate.photo_url ? (
                                <img src={candidate.photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <GraduationCap size={23} />
                              )}
                            </div>
                            {selected ? (
                              <CheckCircle2 className="shrink-0 text-blue-700" size={22} />
                            ) : (
                              <Circle className="shrink-0 text-slate-300" size={22} />
                            )}
                          </div>
                          <h4 className="mt-4 font-bold text-slate-900">
                            {candidate.first_name} {candidate.last_name}
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Grade {candidate.grade_level || "—"} · {candidate.section || "No section"}
                          </p>
                          {candidate.party_name && (
                            <p className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {candidate.party_name}
                            </p>
                          )}
                          {candidate.platform && (
                            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                              {candidate.platform}
                            </p>
                          )}
                          <span className={`mt-4 block text-xs font-semibold ${selected ? "text-blue-700" : "text-slate-400"}`}>
                            {selected ? "Selected" : "Select candidate"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {(!position.candidates || position.candidates.length === 0) && (
                    <p className="px-6 pb-6 text-sm text-amber-700">No candidates have been added for this position.</p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {!loading && !error && positions.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">
                Positions {startIndex + 1}–{Math.min(startIndex + POSITIONS_PER_PAGE, positions.length)}
              </span>
              <span>of {positions.length}</span>
            </div>

            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              {currentPage > 0 && (
                <button
                  onClick={() => setCurrentPage((page) => page - 1)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={18} /> Previous
                </button>
              )}

              {isLastPage ? (
                <button
                  onClick={continueToReview}
                  disabled={!allPositionsComplete}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Continue to Review <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (currentPageComplete) {
                      setError("");
                      setCurrentPage((page) => page + 1);
                    } else {
                      setError("Please select at least one candidate for every position on this page.");
                    }
                  }}
                  disabled={!currentPageComplete}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Next <ArrowRight size={18} />
                </button>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-1">
                {Array.from({ length: totalPages }).map((_, page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Go to positions ${page * POSITIONS_PER_PAGE + 1}–${Math.min(
                      (page + 1) * POSITIONS_PER_PAGE,
                      positions.length
                    )}`}
                    className={`h-2.5 rounded-full transition-all ${
                      page === currentPage
                        ? "w-8 bg-blue-700"
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
