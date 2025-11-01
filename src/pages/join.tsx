import React, { useState } from "react";

export default function Join() {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;

    const formData = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      timestamp: new Date().toISOString(),
    };

    await fetch("/api/sendBetaSignup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171710] text-[#E3DAC9] px-6">
        <h1 className="text-center text-xl">
          🟩 Thank you for joining the beta!
          <br />We&apos;ll reach out soon.
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171710] text-[#E3DAC9] flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-[#1F3B1D]/30 backdrop-blur-sm p-8 rounded-xl border border-[#1F3B1D]/70 shadow-lg"
      >
        <h1 className="text-2xl font-bold mb-6 text-center text-[#FFBF00]">
          Request Beta Access
        </h1>

        <label className="block mb-4">
          <span>Name</span>
          <input
            name="name"
            required
            className="w-full p-2 rounded bg-[#171710] border border-[#1F3B1D] text-[#E3DAC9]"
          />
        </label>

        <label className="block mb-4">
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full p-2 rounded bg-[#171710] border border-[#1F3B1D] text-[#E3DAC9]"
          />
        </label>

        <label className="block mb-4">
          <span>Additional Notes (optional)</span>
          <textarea
            name="notes"
            className="w-full p-2 rounded bg-[#171710] border border-[#1F3B1D] text-[#E3DAC9]"
          ></textarea>
        </label>

        <button
          type="submit"
          className="w-full bg-[#1F3B1D] hover:bg-[#2c5730] text-[#E3DAC9] border border-[#FFBF00] py-3 rounded font-bold"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
