export default function Session() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="grid grid-cols-[1fr_260px] gap-8">
        <div className="aspect-video bg-ink rounded-2xl flex items-center justify-center">
          <p className="text-white/40 font-mono text-sm">Video room — connects automatically at start time</p>
        </div>

        <div>
          <p className="text-xs font-mono text-sage-dark uppercase mb-2">Your session</p>
          <div className="w-11 h-11 rounded-full bg-sage-light flex items-center justify-center font-display text-base text-sage-dark mb-3">AM</div>
          <h1 className="font-display text-xl mb-1">Dr. Anjali Mehta</h1>
          <p className="text-sm text-ink/50 mb-6">Starts 4:00 PM · Room opens 5 min early</p>

          <div className="space-y-3">
            <button className="w-full bg-sage-dark text-white rounded-full py-2.5 text-sm">Join session</button>
            <button className="w-full border border-sage/30 rounded-full py-2.5 text-sm">Test camera & mic</button>
          </div>

          <div className="mt-8 pt-6 border-t border-sage/15 text-xs text-ink/50 space-y-1.5">
            <p>Anxiety & Stress Management</p>
            <p>50 minute session</p>
          </div>
        </div>
      </div>
    </main>
  );
}