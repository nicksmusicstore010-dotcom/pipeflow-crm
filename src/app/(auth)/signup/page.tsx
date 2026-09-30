import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignupPage(props: {
  searchParams: Promise<{ next?: string | string[]; email?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const email = typeof searchParams.email === "string" ? searchParams.email : undefined;
  return <SignupForm next={next} defaultEmail={email} />;
}
