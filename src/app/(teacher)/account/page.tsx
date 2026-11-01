import type { Metadata } from "next";
import { AccountView } from "@/components/teacher/account/AccountView";

export const metadata: Metadata = { title: "حسابي — قفزة" };

export default function AccountPage() {
  return <AccountView />;
}
