export default function HeroSection({ onGetStarted }) {
  return (
    <header className="relative px-6 py-16 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900/50" />
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-600/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Student Election Portal
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Every vote is{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            transparent
          </span>{" "}
          |
        </h1>
        <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          A secure, transparent, and efficient electronic voting platform
          designed for the modern era.
        </p>
        <button
          onClick={onGetStarted}
          className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 transition text-white font-semibold text-lg shadow-lg shadow-blue-600/25"
        >
          Get Started
        </button>
      </div>
    </header>
  );
}
