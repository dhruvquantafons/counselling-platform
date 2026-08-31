import Link from "next/link";

const footerLinks = [
  {
    title: "Platform",
    links: [
      { label: "Find a counsellor", href: "/directory" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Refund & Cancellation Policy", href: "/refund-policy" },
      { label: "Privacy policy", href: "/privacy-policy" },
    ],
  },
  {
    title: "Counsellors",
    links: [
      { label: "Join as counsellor", href: "#join" },
      { label: "Counsellor guidelines", href: "#guidelines" },
      { label: "Resources", href: "#resources" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-sage/10 mt-auto bg-white/40">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-white font-display text-sm font-semibold">
                W
              </div>
              <span className="font-display text-lg text-ink">
                Why<span className="text-sage">beigh</span>
              </span>
            </Link>
            <p className="text-sm text-ink/50 leading-relaxed">
              A quiet place to talk to someone who understands.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-mono text-ink/40 uppercase tracking-wide mb-4">
                {group.title}
              </p>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink/60 hover:text-sage-dark transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-sage/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink/40">
            © {new Date().getFullYear()} Whybeigh. All rights reserved.
          </p>
          <p className="text-xs text-ink/30">
            Not a substitute for professional medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
