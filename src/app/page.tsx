import { Suspense } from "react";
import { LookupForm } from "@/components/LookupForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">
            台灣公司統編查詢
          </h1>
          <p className="text-gray-400">
            Taiwan Company Lookup by Tax ID
          </p>
        </header>

        <Suspense fallback={<div className="text-center text-gray-500">載入中...</div>}>
          <LookupForm />
        </Suspense>

        <footer className="mt-16 text-center text-xs text-gray-600">
          資料來源：經濟部商工行政資料開放平臺 ·{" "}
          <a
            href="https://github.com/bytetcm/company-lookup-by-taxid"
            className="underline hover:text-gray-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}
