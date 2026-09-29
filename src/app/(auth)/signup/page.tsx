import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string | string[]; email?: string | string[] };
}) {
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const email = typeof searchParams.email === "string" ? searchParams.email : undefined;
  return <SignupForm next={next} defaultEmail={email} />;
}
