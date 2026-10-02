"use client";

import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyEmail() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setMessage("Verification link is missing a token.");
        return;
      }

      try {
        const response = await fetch(
          `/api/verify-email?token=${encodeURIComponent(token)}`
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Unable to verify email.");
          return;
        }

        setSuccess(true);
        setMessage("Your email has been verified successfully.");
      } catch {
        setMessage("Unable to verify email. Please try again.");
      }
    }

    verifyEmail();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">
          Pickleball Group Finder
        </h1>

        <div
          className={`mt-6 rounded-lg p-4 ${
            success
              ? "bg-green-100 text-green-900"
              : "bg-gray-100 text-gray-900"
          }`}
        >
          {message}
        </div>

        {success && (
          <a
            href="/"
            className="mt-6 inline-block rounded-lg bg-black px-5 py-3 font-semibold text-white"
          >
            Back to Registration
          </a>
        )}
      </div>
    </main>
  );
}