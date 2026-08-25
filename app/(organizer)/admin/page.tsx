"use client";

import { useActionState, useState } from "react";
import { searchStudentsAction, revokeTokenAction } from "./actions";
import NfcIssuer from "./nfc-issuer";

const initialState = {
  data: [] as {
    id: string;
    fullName: string;
    email: string;
    role: string;
    purchasedNfc?: boolean;
    nfcIssued?: boolean;
  }[],
};

export default function AdminPage() {
  const [currentTab, setCurrentTab] = useState<"lookup" | "nfc">("nfc");
  const [results, searchAction, pending] = useActionState(
    async (_: typeof initialState, formData: FormData) => {
      return await searchStudentsAction(formData);
    },
    initialState,
  );

  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (userId: string) => {
    setRevoking(userId);
    const result = await revokeTokenAction(userId);
    if (result.success) {
      setRevokedIds((prev) => new Set([...prev, userId]));
    }
    setRevoking(null);
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Admin Control</h1>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setCurrentTab("nfc")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            currentTab === "nfc"
              ? "bg-white text-indigo-700 shadow-xs"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Issue Physical NFC Tags
        </button>
        <button
          onClick={() => setCurrentTab("lookup")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            currentTab === "lookup"
              ? "bg-white text-indigo-700 shadow-xs"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Student Directory &amp; Security
        </button>
      </div>

      {currentTab === "nfc" ? (
        <NfcIssuer />
      ) : (
        <div>
          <form action={searchAction} className="flex gap-2 mb-6">
            <input
              name="query"
              type="text"
              placeholder="Search by name…"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pending ? "…" : "Search"}
            </button>
          </form>

          {results.data.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {results.data.map((student) => (
                <li
                  key={student.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {student.fullName}
                      </p>
                      {student.purchasedNfc && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            student.nfcIssued
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-amber-50 text-amber-700 border border-amber-200/60"
                          }`}
                        >
                          {student.nfcIssued ? "NFC Active" : "NFC Pending"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{student.email}</p>
                  </div>
                  {student.role === "student" && (
                    <button
                      onClick={() => handleRevoke(student.id)}
                      disabled={revoking === student.id}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        revokedIds.has(student.id)
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                      }`}
                    >
                      {revokedIds.has(student.id)
                        ? "✓ Token revoked"
                        : revoking === student.id
                        ? "Revoking…"
                        : "Revoke Tag"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

