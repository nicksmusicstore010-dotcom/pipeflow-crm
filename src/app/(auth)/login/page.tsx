import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

const ERROR_MESSAGES: Record<string, string> = {
  link_invalido: "Link inválido ou expirado. Faça login ou solicite um novo link.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const initialError = searchParams.error ? ERROR_MESSAGES[searchParams.error] : undefined;

  return <LoginForm next={searchParams.next} initialError={initialError} />;
}
