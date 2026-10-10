import React from "react";
import Navbar from "../../components/Navbar";
import AdminVerificationQueue from "./AdminVerificationQueue";

export default function AdminVerifications() {
  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">
            Credential Verification Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review university student credentials and partner clinic licenses to ensure platform trust and security.
          </p>
        </div>

        <AdminVerificationQueue />
      </main>
    </div>
  );
}
