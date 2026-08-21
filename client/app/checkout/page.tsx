'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const steps = ["Select Counsellor", "Your Details", "Payment", "Choose Slot"];

export default function Checkout() {
  const searchParams = useSearchParams();
  const counsellorId = searchParams.get('counsellorId');

  const [counsellor, setCounsellor] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!counsellorId) return;
    fetch(`http://localhost:4000/api/counsellors/${counsellorId}`)
      .then(res => res.json())
      .then(setCounsellor);
  }, [counsellorId]);

  function validate() {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = "Name is required.";

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!phone.trim()) {
      newErrors.phone = "Mobile number is required.";
    } else if (!/^[0-9]{10}$/.test(phone)) {
      newErrors.phone = "Enter a valid 10-digit mobile number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleProceed() {
    if (!validate()) return;
    // Gateway only opens once validation passes (AC for this task)
    alert("Validated! Payment gateway would open here (built in a later task).");
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      {/* Progress rail */}
      <div className="flex items-center mb-12">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono ${
                  i === 1 ? "bg-sage text-white" : i < 1 ? "bg-sage-light text-sage-dark" : "bg-gray-200 text-gray-400"
                }`}
              >
                {i + 1}
              </div>
              <span className="text-xs mt-1 text-center text-ink/60">{step}</span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      <h1 className="font-display text-2xl mb-2">Your Details</h1>
      {counsellor && (
        <p className="text-ink/60 mb-8">
          Booking with <strong>{counsellor.name}</strong> · ₹{counsellor.fee}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <input
            type="tel"
            placeholder="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>

        <button
          onClick={handleProceed}
          className="w-full bg-sage text-white py-3 rounded-full mt-4"
        >
          Proceed to Pay
        </button>
      </div>
    </main>
  );
}