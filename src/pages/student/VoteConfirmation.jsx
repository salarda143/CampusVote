import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { GraduationCap, CheckCircle2 } from "lucide-react";

export default function VotingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { election } = location.state || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-700 p-2 text-white"><GraduationCap size={24} /></div>
            <div><h1 className="font-bold text-slate-900">CampusVote</h1><p className="text-xs text-slate-500">Student Election Portal</p></div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700"><CheckCircle2 size={44} /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-green-700">Vote successfully recorded</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Thank You for Voting!</h2>
          <button onClick={() => navigate("/", { replace: true })} className="mt-8 w-full rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white hover:bg-blue-800">Return to Home</button>
        </section>
      </main>
    </div>
  );
}
