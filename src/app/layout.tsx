import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import { FlowProvider } from "@/components/teacher/FlowProvider";
import { StudentProvider } from "@/components/student/StudentProvider";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

/** the address share previews are built against: APP_URL, or the Vercel production domain */
const origin = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "قفزة — من ملف عادي إلى درس لا يُقاوَم",
  description: "ارفع درسك، وتبنيه قفزة في أقل من دقيقة درسًا تفاعليًا يلعبه طلابك. جرّبه مجانًا.",
  applicationName: "قفزة",
  appleWebApp: { capable: true, title: "قفزة", statusBarStyle: "default" },
  icons: { apple: "/pwa-icon/192" },
  openGraph: { siteName: "قفزة", locale: "ar_SA", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#7b26cc" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${readex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        <FlowProvider>
          <StudentProvider>{children}</StudentProvider>
        </FlowProvider>
      </body>
    </html>
  );
}
