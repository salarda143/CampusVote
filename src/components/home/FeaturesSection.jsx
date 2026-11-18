function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition group">
      <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-xl mb-4 group-hover:bg-blue-600/20 transition">
        {icon}
      </div>
      <h4 className="font-bold text-lg mb-2">{title}</h4>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section className="px-6 py-20 bg-slate-900/50 border-y border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-semibold text-blue-400 uppercase tracking-wider mb-4">
            Why choose us
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for Secure Voting
          </h3>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Every component of our platform is designed to ensure security,
            transparency, and efficiency in student elections.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="🛡️"
            title="Military-Grade Security"
            desc="All votes are securely encrypted and protected with enterprise-level security protocols."
          />
          <FeatureCard
            icon="⚡"
            title="Real-Time Counting"
            desc="Instant vote tallying with live analytics dashboards for transparent results monitoring."
          />
          <FeatureCard
            icon="👥"
            title="Multi-Role Support"
            desc="Dedicated interfaces for voters, candidates, and administrators with role-based access."
          />
          <FeatureCard
            icon="🗄️"
            title="Data Integrity"
            desc="Immutable vote records with complete audit trails for absolute transparency."
          />
          <FeatureCard
            icon="📊"
            title="Advanced Analytics"
            desc="Comprehensive voting statistics and insights for election monitoring and analysis."
          />
          <FeatureCard
            icon="🌐"
            title="Accessible Platform"
            desc="User-friendly interface designed for easy access across all devices and technical levels."
          />
        </div>
      </div>
    </section>
  );
}
