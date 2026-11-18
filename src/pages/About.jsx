import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="font-bold text-lg tracking-tight">CampusVote</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <Link to="/" className="hover:text-blue-400 transition">Home</Link>
          <Link to="/about" className="text-blue-400">About</Link>
          <Link to="/results" className="hover:text-blue-400 transition">Results</Link>
          <Link to="/login" className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 transition text-white font-medium">
            Login
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">About</h1>
        <p className="text-slate-400 leading-relaxed mb-6">
          CampusVote is a secure, transparent, and efficient electronic voting platform designed for student elections at COMSELEC - BISU Bilar Campus.
        </p>
        <p className="text-slate-400 leading-relaxed">
          Our mission is to empower fair and transparent student elections through modern digital tooling.
        </p>
        <div className="mt-8">
          <Link to="/" className="text-blue-400 hover:underline">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
