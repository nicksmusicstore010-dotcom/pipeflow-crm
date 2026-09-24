import type { Metadata } from "next";

import type { AuthFormState } from "@/actions/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

/** `?error=` values set by /auth/callback. `needsConfirmation` shows the "resend link" box. */
const LINK_OUTCOMES: Record<string, AuthFormState> = {
  link_expirado: {
    error:
      "Este link expirou ou já foi usado. Se você já confirmou o e-mail, é só entrar com sua senha; senão, peça um novo link abaixo.",
    needsConfirmation: true,
  },
  link_invalido: {
    error:
      "Link inválido ou já utilizado. Se você já confirmou o e-mail, é só entrar com sua senha; senão, peça um novo link abaixo.",
    needsConfirmation: true,
  },
  outro_navegador: {
    success:
      "Seu e-mail foi confirmado! Como o link foi aberto em outro navegador, entre com seu e-mail e senha.",
  },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const initialState = (searchParams.error && LINK_OUTCOMES[searchParams.error]) || {};

  return <LoginForm next={searchParams.next} initialState={initialState} />;
}
