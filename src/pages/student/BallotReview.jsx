import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap, ArrowLeft, Pencil, CheckCircle2,
  AlertCircle, LoaderCircle, ShieldCheck, Vote
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function BallotReview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { student, election, positions = [], selections = {} } = location.state || {};

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedRows = useMemo(() => positions.map((position) => ({
    ...position,
    selectedCandidates: (position.candidates || []).filter((candidate) =>
      (selections[position.id] || []).includes(candidate.id)
    ),
  })), [positions, selections]);

  const selectedCount = selectedRows.reduce(
    (total, position) => total + position.selectedCandidates.length, 0
  );

  if (!student?.lrn || !election?.id || positions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <section className="mx-auto mt-16 max-w-lg rounded-2xl border bg-white p-8 text-center">
          <AlertCircle className="mx-auto text-amber-600" size={36} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Review data unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">Please return to the election ballot and review your selections again.</p>
          <button onClick={() => navigate("/student/elections", { replace: true })} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">
            Back to Elections
          </button>
        </section>
      </main>
    );
  }

  function editBallot() {
    navigate("/student/ballot", {
      state: { student, election, selections },
    });
  }

  async function submitBallot() {
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        lrn: student.lrn,
        election_id: election.id,
        selections: positions.map((position) => ({
          position_id: position.id,
          candidate_ids: selections[position.id] || [],
        })),
      };

      const { data, error: functionError } = await supabase.functions.invoke(
        "student-submit-ballot",
        { body: payload }
      );

      if (functionError) {
        let message = functionError.message;
        try {
          const details = await functionError.context?.json();
          if (details?.error) message = details.error;
        } catch {
          // Keep the original error.
        }
        throw new Error(message || "Unable to submit your ballot.");
      }

      if (!data?.receipt_code) {
        throw new Error(data?.error || "The server did not return a voting receipt.");
      }

      navigate("/student/confirmation", {
        replace: true,
        state: { election, receiptCode: data.receipt_code },
      });
    } catch (err) {
      setError(err.message || "Your ballot could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-700 p-2 text-white"><GraduationCap size={24} /></div>
            <div><h1 className="font-bold text-slate-900">CampusVote</h1><p className="text-xs text-slate-500">Ballot Review</p></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <button
          onClick={editBallot}
          disabled={submitting}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50"
        >
          <ArrowLeft size={17} /> Back
        </button>

        <section className="rounded-2xl bg-blue-950 p-6 text-white sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">Final Check</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Review Your Ballot</h2>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldCheck size={20} className="mt-0.5 shrink-0" />
            <p>Check every position and candidate carefully. Once submitted, your vote cannot be changed.</p>
          </div>
        </section>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={20} className="shrink-0" /><p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {selectedRows.map((position) => (
            <section key={position.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Position</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{position.position_name}</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {position.selectedCandidates.length} selected · Max {position.max_votes || 1}
                </span>
              </div>
              {position.selectedCandidates.length ? (
                <div className="mt-4 space-y-3">
                  {position.selectedCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                        {candidate.photo_url ? <img src={candidate.photo_url} alt="" className="h-full w-full object-cover" /> : <GraduationCap className="text-slate-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{candidate.first_name} {candidate.last_name}</p>
                        <p className="text-xs text-slate-500">Grade {candidate.grade_level || "—"} · {candidate.section || "No section"}</p>
                        {candidate.party_name && <p className="mt-1 text-xs text-slate-600">{candidate.party_name}</p>}
                      </div>
                      <CheckCircle2 className="shrink-0 text-green-600" size={20} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No candidate selected for this position.</p>
              )}
            </section>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={selectedCount === 0 || submitting}
            className="w-full rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          >
            Confirm and Submit Ballot
          </button>
        </div>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700"><ShieldCheck size={28} /></div>
            <h2 id="confirm-title" className="mt-4 text-center text-xl font-bold text-slate-900">Submit Your Ballot?</h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">You are about to submit {selectedCount} selection(s) for {election.title}. This action is final and cannot be undone.</p>
            {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmOpen(false)} disabled={submitting} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 disabled:opacity-50">
                <span className="sm:hidden">Cancel</span>
                <span className="hidden sm:inline">Go Back</span>
              </button>
              <button onClick={submitBallot} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                {submitting ? <><LoaderCircle className="animate-spin" size={18} /> Submitting...</> : "Yes, Submit"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
