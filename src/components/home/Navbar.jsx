import { Link } from "react-router-dom";

export default function Navbar({ onLoginClick }) {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          C
        </div>
        <span className="font-bold text-lg tracking-tight">CampusVote</span>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <Link
          to="/"
          className="hover:text-blue-400 transition"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Home
        </Link>
        <a href="#about" className="hover:text-blue-400 transition">
          About
        </a>
        <Link to="/results" className="hover:text-blue-400 transition">
          Results
        </Link>
        <button
          onClick={onLoginClick}
          className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 transition text-white font-medium"
        >
          Login
        </button>
      </div>
      <button className="md:hidden text-slate-400" onClick={onLoginClick}>
        ☰
      </button>
    </nav>
  );
}
