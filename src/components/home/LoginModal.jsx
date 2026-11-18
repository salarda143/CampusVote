import { useState } from "react";
import { Mail, Lock, User, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

const ROLES = ["Voter", "Admin"];

export default function LoginModal({ onClose, onLogin }) {
  const [role, setRole] = useState("Voter");
  const [ismisId, setIsmisId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (role === "Admin") {
      if (!email.trim() || !password.trim()) {
        setError("Please enter your email and password.");
        return;
      }

      setLoading(true);

      try {
        const { data, error: authError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (authError) throw authError;

        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (
          roleError ||
          !roleData ||
          !["admin", "super_admin"].includes(roleData.role)
        ) {
          await supabase.auth.signOut();
          throw new Error("This account is not authorized as an admin.");
        }

        onClose();
        onLogin("/admin/dashboard");
      } catch (err) {
        setError(err.message || "Admin login failed.");
      } finally {
        setLoading(false);
      }

      return;
    }

    const cleanedLRN = ismisId.trim();

    if (!/^\d{12}$/.test(cleanedLRN)) {
      setError("LRN must contain exactly 12 digits.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("student-lrn-login", {
          body: { lrn: cleanedLRN },
        });

      if (functionError) {
        let message = functionError.message;

        try {
          const details = await functionError.context?.json();
          if (details?.error) message = details.error;
        } catch {
          // Use the original function error message.
        }

        throw new Error(message || "Student login failed.");
      }

      if (!data?.student) {
        throw new Error(data?.error || "Unable to find student record.");
      }

      onClose();
      onLogin("/student/elections", { student: data.student });
    } catch (err) {
      setError(err.message || "Unable to process student login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800/30 backdrop-blur-2xl rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-6 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl font-bold text-white">
            {role} Login
          </h2>
        </div>

        <p className="text-slate-400 text-sm mb-8 text-center">
          {role === "Admin"
            ? "Secure access to your administrative dashboard"
            : "Enter your LRN to access the voting system"}
        </p>

        <div className="flex gap-2 mb-8">
          {ROLES.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => {
                setRole(r);
                setError("");
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
                role === r
                  ? "bg-linear-to-br from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/25 ring-2 ring-blue-500/50"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {role === "Admin" ? (
            <>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  autoComplete="username"
                />
              </div>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                placeholder="Enter 12-digit LRN"
                value={ismisId}
                onChange={(e) =>
                  setIsmisId(e.target.value.replace(/\D/g, "").slice(0, 12))
                }
                className="w-full pl-10 pr-4 py-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                autoComplete="off"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-linear-to-br from-blue-600 to-cyan-600 text-white font-semibold text-lg shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-cyan-500 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
