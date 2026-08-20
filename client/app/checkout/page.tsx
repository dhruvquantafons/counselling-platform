export default function Checkout() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <a href="/directory" className="text-xs font-mono text-sage-dark mb-8 inline-block">&larr; Back to directory</a>

      <div className="grid grid-cols-[1fr_1.2fr] gap-10">
        <div>
          <p className="text-xs font-mono text-ink/40 uppercase mb-4">Booking summary</p>
          <div className="w-11 h-11 rounded-full bg-sage-light flex items-center justify-center font-display text-base text-sage-dark mb-3">AM</div>
          <h1 className="font-display text-2xl mb-1">Dr. Anjali Mehta</h1>
          <p className="text-sm text-ink/60 mb-6">Anxiety & Stress Management</p>

          <div className="space-y-3 text-sm border-t border-sage/15 pt-4">
            <div className="flex justify-between">
              <span className="text-ink/50">Session length</span>
              <span>50 minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50">Format</span>
              <span>Video call</span>
            </div>
            <div className="flex justify-between font-mono text-sage-dark text-base pt-3 border-t border-sage/15">
              <span>Total</span>
              <span>₹1,200</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg mb-4">Your details</h2>
          <form className="space-y-4">
            <div>
              <label className="text-xs text-ink/60 block mb-1.5">Full name</label>
              <input className="w-full border border-sage/30 rounded-lg px-4 py-3 bg-white text-sm" placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs text-ink/60 block mb-1.5">Email</label>
              <input className="w-full border border-sage/30 rounded-lg px-4 py-3 bg-white text-sm" placeholder="name@example.com" />
            </div>
            <div>
              <label className="text-xs text-ink/60 block mb-1.5">Mobile number</label>
              <input className="w-full border border-sage/30 rounded-lg px-4 py-3 bg-white text-sm" placeholder="+91 00000 00000" />
            </div>
            <button type="submit" className="w-full bg-amber text-white rounded-lg py-3.5 font-medium mt-2 hover:bg-amber/90 transition-colors">
              Continue to payment
            </button>
            <p className="text-xs text-ink/40 text-center">You'll choose your time slot after payment is confirmed.</p>
          </form>
        </div>
      </div>
    </main>
  );
}