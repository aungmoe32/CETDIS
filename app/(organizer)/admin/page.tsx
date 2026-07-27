"use client";

import { useActionState, useState } from "react";
import { searchStudentsAction, revokeTokenAction } from "./actions";

const initialState = { data: [] as { id: string; fullName: string; email: string; role: string }[] };

export default function AdminPage() {
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
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Admin — Student Lookup</h1>

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
            <li key={student.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
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
  );
}
