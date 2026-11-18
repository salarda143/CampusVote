export default function AboutSection() {
  return (
    <section
      id="about"
      className="px-6 py-20 border-t border-slate-800 scroll-mt-24"
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          About CampusVote
        </h2>
        <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-2xl mx-auto">
          CampusVote is a secure, transparent, and efficient electronic voting
          platform designed for student elections at BISU Bilar Campus.
          Our mission is to empower fair and transparent student
          elections through modern digital tooling.
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-6 max-w-lg mx-auto">
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            📘
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            ✉️
          </a>
        </div>
      </div>
    </section>
  );
}
