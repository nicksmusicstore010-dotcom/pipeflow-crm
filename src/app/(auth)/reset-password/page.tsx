import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Nova senha" };

/** Opened by the reset link (already signed in by /auth/callback). The proxy sends anonymous visitors to /login. */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/forgot-password");

  return <ResetPasswordForm email={user.email ?? ""} />;
}
