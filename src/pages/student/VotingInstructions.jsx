
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Vote,
  ArrowRight,
} from "lucide-react";

export default function StudentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Supports both the previous and updated login navigation formats.
  const loginData = location.state || {};
  const student = loginData.student || loginData;

  const [understood, setUnderstood] = useState(false);
  const [showVoting, setShowVoting] = useState(false);

  const studentName = [
    student.first_name,
    student.middle_name,
    student.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  function handleContinue() {
  if (!understood) return;

  navigate("/student/elections", {
    state: { student },
  });
}

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center gap-3">
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <section className="bg-blue-950 text-white rounded-2xl p-6 sm:p-8">
          <p className="text-blue-200 text-sm font-medium">
            STUDENT ELECTION PORTAL
          </p>

          <h2 className="text-2xl sm:text-3xl font-bold mt-3">
            Welcome{studentName ? `, ${studentName}` : ", Student"}!
          </h2>

          <p className="text-blue-100 mt-2">
            Your voice matters. Make your vote count.
          </p>

          {student.lrn && (
            <div className="mt-5 text-sm text-blue-100 space-y-1">
              <p>LRN: {student.lrn}</p>
              <p>
                Grade {student.grade_level || "—"}{" "}
                {student.section ? `- ${student.section}` : ""}
              </p>
            </div>
          )}
        </section>

        {!showVoting ? (
          <>
            {/* Instructions */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 mt-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-blue-100 text-blue-700 p-3 rounded-xl">
                  <BookOpen size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Voting Instructions
                  </h3>
                  <p className="text-sm text-slate-500">
                    Please read carefully before proceeding.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Instruction
                  number="01"
                  title="Choose the correct election"
                  description="Make sure you are participating in the intended school election."
                />

                <Instruction
                  number="02"
                  title="Read candidate information"
                  description="Review each candidate's name, position, and platform before making your selection."
                />

                <Instruction
                  number="03"
                  title="Follow the voting limit"
                  description="Select only the allowed number of candidates for each position."
                />

                <Instruction
                  number="04"
                  title="Review your ballot"
                  description="Check all your selections carefully before submitting your vote."
                />

                <Instruction
                  number="05"
                  title="Submit your vote only once"
                  description="After successful submission, your ballot cannot be changed or submitted again."
                />

                <Instruction
                  number="06"
                  title="Keep your receipt code"
                  description="After voting, save your confirmation receipt code for your records."
                />
              </div>

              {/* Acknowledgment */}
              <div className="mt-7 border-t border-slate-200 pt-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    className="mt-1 h-5 w-5 accent-blue-700"
                  />

                  <span className="text-sm text-slate-700">
                    I have read and understood all the voting instructions.
                    I agree to follow the rules of the election.
                  </span>
                </label>

                <button
                  onClick={handleContinue}
                  disabled={!understood}
                  className="w-full mt-6 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  I Understand – Continue
                  <ArrowRight size={18} />
                </button>
              </div>
            </section>
          </>
        ) : (
          /* Ready to vote */
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mt-7 text-center">
            <div className="bg-green-100 text-green-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={34} />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mt-5">
              You're Ready to Vote!
            </h3>

            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              You have acknowledged the voting instructions.
              You may now proceed to the election selection stage.
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-6 text-left flex gap-3">
              <ShieldCheck className="text-blue-700 shrink-0" size={22} />
              <p className="text-sm text-blue-900">
                Remember to review your choices carefully before submitting
                your ballot.
              </p>
            </div>

            <button
              onClick={() =>
                setShowVoting(false)
              }
              className="w-full mt-6 border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50"
            >
              Review Instructions Again
            </button>

            <p className="text-xs text-slate-400 mt-4">
              Election selection will be connected in the next step.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function Instruction({ number, title, description }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
        {number}
      </div>

      <div>
        <h4 className="font-semibold text-slate-800">
          {title}
        </h4>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
