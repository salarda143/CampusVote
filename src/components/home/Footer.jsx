export default function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-slate-800 bg-slate-900">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            C
          </div>
          <div>
            <div className="font-bold">CampusVote</div>
            <div className="text-xs text-blue-400">
              BISU BILAR CAMPUS
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Empowering fair, secure, and transparent student elections through a
          modern digital platform that streamlines voting, verification, and
          real-time results monitoring.
        </p>
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-500">
        <p>
          © 2026 CampusVote - Paul Jr. E. Salarda. All Rights Reserved.
        </p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition">
            Privacy
          </a>
          <a href="#" className="hover:text-white transition">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
