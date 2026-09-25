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
  searchParams: { next?: string | string[]; error?: string | string[] };
}) {
  // Own keys only: `?error=constructor` would otherwise pick up Object.prototype members.
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;
  const initialState = (error && Object.hasOwn(LINK_OUTCOMES, error) && LINK_OUTCOMES[error]) || {};
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;

  return <LoginForm next={next} initialState={initialState} />;
}
