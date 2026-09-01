"use client";

import { useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SPECIALISATIONS = [
  "Anxiety & Stress",
  "Depression",
  "Relationships & Family",
  "Career & Life Transitions",
  "Grief & Loss",
  "Trauma",
  "Self-esteem & Identity",
  "Child & Adolescent",
  "Other",
];

type FormData = {
  fullName: string;
  email: string;
  phone: string;
  qualifications: string;
  yearsOfExperience: string;
  specialisation: string;
  bio: string;
};

type Errors = Partial<Record<keyof FormData, string>>;

function validate(data: FormData): Errors {
  const errors: Errors = {};
  if (!data.fullName.trim()) errors.fullName = "Full name is required.";
  if (!data.email.trim()) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter a valid email address.";
  if (!data.phone.trim()) errors.phone = "Phone number is required.";
  if (!data.qualifications.trim()) errors.qualifications = "Qualifications are required.";
  if (!data.yearsOfExperience) errors.yearsOfExperience = "Years of experience is required.";
  else if (isNaN(Number(data.yearsOfExperience)) || Number(data.yearsOfExperience) < 0)
    errors.yearsOfExperience = "Enter a valid number.";
  if (!data.specialisation) errors.specialisation = "Please select a specialisation.";
  if (!data.bio.trim()) errors.bio = "Bio is required.";
  else if (data.bio.trim().length < 50) errors.bio = "Bio should be at least 50 characters.";
  return errors;
}

export default function JoinAsCounsellorPage() {
  const [form, setForm] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    qualifications: "",
    yearsOfExperience: "",
    specialisation: "",
    bio: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`${API_BASE}/api/counsellor-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, yearsOfExperience: Number(form.yearsOfExperience) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err: any) {
      setServerError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-20 md:py-32 text-center animate-page-enter">
        <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink mb-3">
          Application received
        </h1>
        <p className="text-ink/60 text-base leading-relaxed mb-8">
          Thank you for applying to join Whybeigh. Your application has been received and we'll be in touch soon.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-sage text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-sage-dark transition-colors"
        >
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16 md:py-24 animate-page-enter">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-sage-dark transition-colors mb-10">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </Link>

      <p className="font-mono text-xs tracking-widest text-sage uppercase mb-3">Join our team</p>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
        Join as a Counsellor
      </h1>
      <p className="text-ink/55 text-base mb-10 leading-relaxed">
        Tell us about yourself and your practice. We review every application carefully and will be in touch.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Full name */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Full name <span className="text-rose-500">*</span></label>
          <input
            name="fullName" value={form.fullName} onChange={handleChange}
            placeholder="Dr. Ayesha Khan"
            className={`w-full border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/25 transition-colors ${errors.fullName ? "border-rose-300 bg-rose-50/30" : "border-sage/20 bg-white"}`}
          />
          {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p>}
        </div>

        {/* Email + Phone */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Email <span className="text-rose-500">*</span></label>
            <input
              name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/25 transition-colors ${errors.email ? "border-rose-300 bg-rose-50/30" : "border-sage/20 bg-white"}`}
            />
            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Phone <span className="text-rose-500">*</span></label>
            <input
              name="phone" value={form.phone} onChange={handleChange}
              placeholder="+91 98765 43210"
              className={`w-full border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/25 transition-colors ${errors.phone ? "border-rose-300 bg-rose-50/30" : "border-sage/20 bg-white"}`}
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
          </div>
        </div>

        {/* Qualifications */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Qualifications <span className="text-rose-500">*</span></label>
          <input
            name="qualifications" value={form.qualifications} onChange={handleChange}
            placeholder="M.Sc. Psychology, RCI Licensed Clinical Psychologist"
            className={`w-full border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/25 transition-colors ${errors.qualifications ? "border-rose-300 bg-rose-50/30" : "border-sage/20 bg-white"}`}
          />
          {errors.qualifications && <p className="mt-1 text-xs text-rose-600">{errors.qualifications}</p>}
        </div>

        {/* Years of experience + Specialisation */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Years of experience <span className="text-rose-500">*</span></label>
            <input
              name="yearsOfExperience" type="number" min="0" value={form.yearsOfExperience} onChange={handleChange}
              placeholder="5"
              className={`w-full border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/25 transition-colors ${errors.yearsOfExperience ? "border-rose-300 bg-rose-50/30" : "border-sage/20 bg-white"}`}
            />
            {errors.yearsOfExperience && <p className="mt-1 text-xs text-rose-600">{errors.yearsOfExperience}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Primary specialisation <span className="text-rose-500">*</span></label>
            <select
              name="specialisation" value={form.specialisation} onChange={handleChange}
              className={`w-full border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/25 transition-colors ${errors.specialisation ? "border-rose-300 bg-rose-50/30" : "border-sage/20 bg-white"}`}
            >
              <option value="">Select…</option>
              {SPECIALISATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.specialisation && <p className="mt-1 text-xs text-rose-600">{errors.specialisation}</p>}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            About you <span className="text-rose-500">*</span>
            <span className="font-normal text-ink/40 ml-1">(min. 50 characters)</span>
          </label>
          <textarea
            name="bio" value={form.bio} onChange={handleChange} rows={5}
            placeholder="Tell us about your approach, experience, and what you bring to clients…"
            className={`w-full border rounded-xl px-4 py-3 text-sm text-ink resize-y focus:outline-none focus:ring-2 focus:ring-sage/25 transition-colors ${errors.bio ? "border-rose-300 bg-rose-50/30" : "border-sage/20 bg-white"}`}
          />
          <div className="flex justify-between mt-1">
            {errors.bio ? <p className="text-xs text-rose-600">{errors.bio}</p> : <span />}
            <p className={`text-xs ${form.bio.length < 50 ? "text-ink/30" : "text-sage-dark"}`}>{form.bio.length} chars</p>
          </div>
        </div>

        {serverError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-sage-dark text-white py-3.5 rounded-full font-medium text-sm hover:bg-sage hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        >
          {submitting ? "Submitting…" : "Submit Application"}
        </button>

        <p className="text-xs text-ink/35 text-center leading-relaxed">
          By submitting, you agree to our{" "}
          <Link href="/privacy-policy" className="underline hover:text-sage-dark">Privacy Policy</Link>.
          No account is created at this stage.
        </p>
      </form>
    </main>
  );
}
