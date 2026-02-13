export default function Testimonials() {
  return (
    <section className="bg-black py-28 px-6 text-white">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-semibold mb-16">
          Trusted by Top Creators
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-stone-300">
              &ldquo;Pom Pomm transformed our brand partnerships with real performance metrics.&rdquo;
            </p>
            <div className="mt-6 text-sm text-stone-400">
              — Growth Lead, D2C Brand
            </div>
          </div>

          <div className="p-8 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-stone-300">
              &ldquo;Finally a platform that rewards creators based on measurable impact.&rdquo;
            </p>
            <div className="mt-6 text-sm text-stone-400">
              — Top YouTube Creator
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
