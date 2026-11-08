"use client";

/** the last resort when even the page frame fails: plain, but Arabic and right-to-left */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "Tahoma, Arial, sans-serif", background: "#f4f1fb", color: "#1b0f3d" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div role="alert">
            <h1 style={{ fontSize: 28 }}>حدث خطأ من جهتنا.</h1>
            <p style={{ opacity: 0.7 }}>أعد المحاولة بعد لحظات.</p>
            <button onClick={reset} style={{ marginTop: 16, padding: "12px 32px", borderRadius: 999, border: 0, background: "#6d28d9", color: "#fff", fontWeight: 700, fontSize: 14 }}>
              أعد المحاولة
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
