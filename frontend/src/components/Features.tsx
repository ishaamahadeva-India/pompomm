export default function Features() {
  return (
    <section id="features" className="bg-[#0B0B0C] py-32 px-6 text-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-semibold mb-16">
          Built for Performance
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Measurable ROI",
              desc: "Track conversions, revenue and campaign performance in real time.",
            },
            {
              title: "Creator Infrastructure",
              desc: "Tools designed for scalable creator partnerships.",
            },
            {
              title: "Automated Payouts",
              desc: "Smart contract-based transparent performance payouts.",
            }
          ].map((item, i) => (
            <div
              key={i}
              className="p-8 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition"
            >
              <h3 className="text-xl font-medium mb-4">{item.title}</h3>
              <p className="text-stone-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
