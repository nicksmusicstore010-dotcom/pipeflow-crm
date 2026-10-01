import type { Metadata } from "next";

import type { AuthFormState } from "@/actions/auth";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

/** `?error=` set by /auth/callback when a reset link fails. */
const LINK_OUTCOMES: Record<string, AuthFormState> = {
  link_expirado: { error: "Este link expirou ou já foi usado. Peça um novo abaixo." },
  link_invalido: { error: "Link inválido ou já utilizado. Peça um novo abaixo." },
  outro_navegador: {
    error: "Abra o link no mesmo navegador em que você pediu a nova senha — ou peça um novo link por aqui.",
  },
};

export default async function ForgotPasswordPage(props: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { error } = await props.searchParams;
  // Own keys only: `?error=constructor` would otherwise pick up Object.prototype members.
  const initialState = (typeof error === "string" && Object.hasOwn(LINK_OUTCOMES, error) && LINK_OUTCOMES[error]) || {};

  return <ForgotPasswordForm initialState={initialState} />;
}
