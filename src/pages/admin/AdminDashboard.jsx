import { useCallback, useEffect, useState } from "react";
import { Users, UserCheck, Vote, ClipboardCheck, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";

function StatCard({ label, value, icon: Icon, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <Icon className="mb-3 text-blue-700" size={25} />
      <p className="text-sm text-slate-500">{label}</p>
      <h3 className="mt-1 text-2xl font-bold text-slate-900">{value}</h3>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalEligibility: 0,
    totalVoters: 0,
  });
  const [electionTitle, setElectionTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [studentsResult, electionsResult] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("elections").select("id, title, status, created_at").order("created_at", { ascending: false }),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (electionsResult.error) throw electionsResult.error;

      const elections = electionsResult.data || [];
      const selectedElection =
        elections.find((item) => item.status === "active") ||
        elections.find((item) => item.status === "closed") ||
        elections[0] ||
        null;

      let totalEligibility = 0;
      let totalVoters = 0;

      if (selectedElection) {
        setElectionTitle(selectedElection.title);

        const [eligibilityResult, participationResult, ballotsResult] = await Promise.all([
          supabase.from("voter_eligibility").select("id", { count: "exact", head: true }).eq("election_id", selectedElection.id),
          supabase.from("voting_participation").select("student_id", { count: "exact", head: true }).eq("election_id", selectedElection.id),
          supabase.from("ballots").select("id", { count: "exact", head: true }).eq("election_id", selectedElection.id),
        ]);

        if (eligibilityResult.error) throw eligibilityResult.error;
        if (participationResult.error) throw participationResult.error;
        if (ballotsResult.error) throw ballotsResult.error;

        totalEligibility = eligibilityResult.count || 0;
        totalVoters = participationResult.count || 0;
      } else {
        setElectionTitle("");
      }

      setStats({
        totalStudents: studentsResult.count || 0,
        totalEligibility,
        totalVoters,
      });
    } catch (err) {
      setError(err.message || "Unable to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  const items = [
    { label: "Total Students", value: stats.totalStudents, icon: Users, description: "Active student records" },
    { label: "Total Eligibility", value: stats.totalEligibility, icon: UserCheck, description: "Eligible students in the selected election" },
    { label: "Total Voters", value: stats.totalVoters, icon: Vote, description: "Students who submitted a ballot" },
  ];

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="mt-1 text-slate-500">Manage your school's election activities.</p>
          {electionTitle && (
            <p className="mt-2 text-xs text-slate-500">
              Election statistics: <strong>{electionTitle}</strong>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={loadDashboardStats}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={loading ? "…" : item.value.toLocaleString()}
            icon={item.icon}
            description={item.description}
          />
        ))}
      </div>

      {!loading && !electionTitle && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          No elections have been created yet. Election eligibility and voting statistics will appear here once an election is available.
        </div>
      )}
    </div>
  );
}
