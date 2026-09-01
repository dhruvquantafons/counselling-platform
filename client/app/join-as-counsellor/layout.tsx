import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join as a Counsellor — Whybeigh",
  description:
    "Apply to join Whybeigh as a verified counsellor. Tell us about your qualifications, experience and specialisation. We review every application personally.",
  robots: { index: true, follow: true },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
