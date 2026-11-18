import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  GraduationCap,
  Vote,
  CalendarDays,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export default function ElectionSelection() {
  const location = useLocation();
  const navigate = useNavigate();

  const student = location.state?.student;

  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInstructions, setShowInstructions] = useState(true);
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    if (!student?.lrn) {
      navigate("/", { replace: true });
      return;
    }

    loadElections();
  }, []);

  async function loadElections() {
    setLoading(true);
    setError("");

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("student-lrn-login", {
          body: { lrn: student.lrn },
        });

      if (functionError) {
        let message = functionError.message;

        try {
          const details = await functionError.context?.json();
          if (details?.error) message = details.error;
        } catch {
          // Keep the original error message.
        }

        throw new Error(message || "Unable to load elections.");
      }

      if (!data?.student) {
        throw new Error(data?.error || "Unable to verify student record.");
      }

      setElections(data.elections || []);
    } catch (err) {
      setError(err.message || "Unable to load available elections.");
    } finally {
      setLoading(false);
    }
  }

  function openElection(election) {
    if (election.has_voted) return;

    navigate("/student/ballot", {
      state: {
        student,
        election,
      },
    });
  }

  function formatDate(date) {
    if (!date) return "Not specified";

    return new Date(date).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const studentName = [
    student?.first_name,
    student?.middle_name,
    student?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-700 text-white p-2 rounded-xl">
              <GraduationCap size={24} />
            </div>

            <div>
              <h1 className="font-bold text-slate-900">
                CampusVote
              </h1>
              <p className="text-xs text-slate-500">
                Student Election Portal
              </p>
            </div>
          </div>

        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <section className="bg-blue-950 text-white rounded-2xl p-6 sm:p-8">
          <p className="text-blue-200 text-sm font-medium">
            VOTING PORTAL
          </p>

          <h2 className="text-2xl sm:text-3xl font-bold mt-3">
            Choose Your Election
          </h2>

          <p className="text-blue-100 mt-2">
            Welcome{studentName ? `, ${studentName}` : ""}.
            Select an available election to proceed with voting.
          </p>
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8 mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Available Elections
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Elections where you are eligible to vote.
            </p>
          </div>

          <button
            onClick={loadElections}
            disabled={loading}
            className="border border-slate-300 bg-white rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex gap-3 items-start mb-5">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to load elections</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white border rounded-2xl p-12 text-center">
            <RefreshCw className="animate-spin mx-auto text-blue-700" size={30} />
            <p className="text-slate-500 mt-4">
              Loading available elections...
            </p>
          </div>
        ) : elections.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center">
            <Vote size={42} className="mx-auto text-slate-300" />

            <h4 className="font-bold text-slate-800 mt-4">
              No Available Elections
            </h4>

            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              There are currently no active elections assigned to your
              student record. Please contact the election administrator
              if you believe this is incorrect.
            </p>

            <button
              onClick={loadElections}
              className="mt-6 bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-semibold"
            >
              Check Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {elections.map((election) => (
              <div
                key={election.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="bg-blue-100 text-blue-700 p-3 rounded-xl">
                    <Vote size={25} />
                  </div>

                  {election.has_voted ? (
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      Already Voted
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      Available
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-slate-900 mt-5">
                  {election.title}
                </h4>

                <p className="text-sm text-slate-500 mt-1">
                  School Year: {election.school_year || "Not specified"}
                </p>

                {election.description && (
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                    {election.description}
                  </p>
                )}

                <div className="border-t border-slate-100 mt-5 pt-4 space-y-3">
                  <div className="flex items-start gap-2 text-sm text-slate-500">
                    <CalendarDays size={17} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-700">Start</p>
                      <p>{formatDate(election.start_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-slate-500">
                    <Clock size={17} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-700">End</p>
                      <p>{formatDate(election.end_date)}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openElection(election)}
                  disabled={election.has_voted}
                  className="w-full mt-6 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {election.has_voted ? (
                    <>
                      <CheckCircle2 size={18} />
                      Vote Already Submitted
                    </>
                  ) : (
                    <>
                      Vote Now
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voting-instructions-title"
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Vote size={26} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  CampusVote • Student Portal
                </p>
                <h2
                  id="voting-instructions-title"
                  className="mt-1 text-2xl font-bold text-slate-900"
                >
                  Voting Instructions
                </h2>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-slate-600">
              Please read the following instructions carefully before
              proceeding to the available elections.
            </p>

            <ol className="mt-5 space-y-4 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">1</span>
                <span>Choose only an active election where you are eligible to vote.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">2</span>
                <span>Review the candidates and their information for every position.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">3</span>
                <span>Select your preferred candidate(s) according to the ballot instructions.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">4</span>
                <span>Review your selections carefully before submitting your ballot.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">5</span>
                <span>Submit your ballot only once. Wait for the voting confirmation after submission.</span>
              </li>
            </ol>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Reminder:</strong> Make sure your choices are correct.
              Submitted votes may not be changed.
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-700"
              />
              <span>I have read and understood the voting instructions.</span>
            </label>

            <button
              type="button"
              disabled={!understood}
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Continue to Elections
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
