"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold">發生錯誤</h2>
        <p className="text-gray-400">{error.message || "請稍後再試"}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
        >
          重試
        </button>
      </div>
    </div>
  );
}
