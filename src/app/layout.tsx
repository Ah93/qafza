import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import { FlowProvider } from "@/components/teacher/FlowProvider";
import { StudentProvider } from "@/components/student/StudentProvider";
import "./globals.css";

const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "قفزة — حوّل أي درس إلى تجربة يلعبها طلابك",
  description: "ارفع ملفك، وتحوّله قفزة في لحظات إلى درس تفاعلي ملعوب.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${readex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <FlowProvider>
          <StudentProvider>{children}</StudentProvider>
        </FlowProvider>
      </body>
    </html>
  );
}
