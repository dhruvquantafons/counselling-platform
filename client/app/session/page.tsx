export default function Session() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 animate-fade-in">
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="relative aspect-video bg-ink rounded-2xl overflow-hidden flex items-center justify-center shadow-soft-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-sage-dark/30 to-ink/70" />
          <div className="relative text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-white/80"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <p className="text-white/70 font-mono text-sm">
              Video room — connects automatically at start time
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs font-mono text-sage-dark uppercase tracking-wide mb-3">
              Your session
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center font-display text-base text-sage-dark ring-2 ring-sage/15">
                AM
              </div>
              <div>
                <h1 className="font-display text-xl text-ink">
                  Dr. Anjali Mehta
                </h1>
                <p className="text-sm text-ink/50 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-sage animate-pulse-soft" />
                  Starts 4:00 PM · Room opens 5 min early
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full bg-sage text-white rounded-full py-3 text-sm font-medium hover:bg-sage-dark transition-colors flex items-center justify-center gap-2 active:scale-[0.98]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Join session
            </button>
            <button className="w-full border border-sage/20 text-ink rounded-full py-3 text-sm font-medium hover:bg-sage-light/50 transition-colors">
              Test camera & mic
            </button>
          </div>

          <div className="pt-6 border-t border-sage/15 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/50">Specialisation</span>
              <span className="text-ink font-medium">
                Anxiety & Stress Management
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/50">Duration</span>
              <span className="text-ink font-medium">50 minutes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/50">Session ID</span>
              <span className="font-mono text-ink/60">#S-2024-001</span>
            </div>
          </div>

          <div className="bg-amber-light/50 rounded-xl p-4 text-sm text-ink/70 border border-amber/10">
            <p className="font-medium text-ink mb-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Need to reschedule?
            </p>
            <p>
              You can reschedule up to 2 hours before your session without any
              charge.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
