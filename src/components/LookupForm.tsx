"use client";

import { useState, useTransition } from "react";
import { lookup } from "@/app/actions";

interface CompanyResult {
  taxId: string;
  name: string;
  type: string;
  status: string;
  capital: string;
  address: string;
  representative: string;
  setupDate: string;
}

export function LookupForm() {
  const [taxId, setTaxId] = useState("");
  const [result, setResult] = useState<CompanyResult | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = taxId.replace(/\D/g, "");
    if (cleaned.length !== 8) {
      setError("請輸入 8 位數統一編號");
      return;
    }
    setError("");
    setResult(null);

    startTransition(async () => {
      const res = await lookup(cleaned);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setResult(res.data);
      }
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          placeholder="輸入統一編號（如 23531327）"
          maxLength={8}
          className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg tracking-wider"
          autoFocus
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 font-medium transition-colors"
        >
          {isPending ? "查詢中..." : "查詢"}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-800 text-red-300 mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="p-6 rounded-xl bg-gray-800/50 border border-gray-700 space-y-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold">{result.name}</h2>
            <div className="flex gap-2">
              <span className="text-sm px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400">
                {result.type}
              </span>
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                result.status === "核准設立" || result.status === "營業中"
                  ? "bg-green-900/50 text-green-400"
                  : "bg-yellow-900/50 text-yellow-400"
              }`}>
                {result.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="統一編號" value={result.taxId} mono />
            <Field label="代表人" value={result.representative} />
            <Field label="資本額" value={result.capital} />
            <Field label="設立日期" value={result.setupDate} />
            <Field label="地址" value={result.address} span2 />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  span2,
}: {
  label: string;
  value: string;
  mono?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <dt className="text-gray-500 text-xs mb-1">{label}</dt>
      <dd className={mono ? "font-mono" : ""}>{value || "—"}</dd>
    </div>
  );
}
