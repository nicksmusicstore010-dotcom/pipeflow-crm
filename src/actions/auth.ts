"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { RESET_PASSWORD_PATH, safeNextPath } from "@/lib/safe-redirect";
import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: string;
  /** Login failed because the e-mail isn't confirmed yet: offer to resend the link. */
  needsConfirmation?: boolean;
};

// Trimmed and lowercased: a stray space from autofill or the phone keyboard isn't a typo.
const emailField = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."));

// Supabase (bcrypt) rejects passwords longer than 72 characters.
const passwordField = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Informe sua senha."),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome.").max(100, "Use no máximo 100 caracteres no nome."),
  email: emailField,
  password: passwordField,
});

const resendSchema = z.object({
  email: emailField,
});

const newPasswordSchema = z
  .object({ password: passwordField, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "As senhas não conferem.", path: ["confirmPassword"] });

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  email_address_invalid: "Este e-mail não é aceito. Confira o endereço ou use outro.",
  weak_password: "Senha muito fraca. Use pelo menos 8 caracteres.",
  over_email_send_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  same_password: "A nova senha precisa ser diferente da atual.",
};

function translateAuthError(code: string | undefined) {
  return (code && AUTH_ERROR_MESSAGES[code]) || "Não foi possível concluir. Tente novamente.";
}

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error: translateAuthError(error.code),
      needsConfirmation: error.code === "email_not_confirmed",
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  // Where to land after confirming, e.g. back to /invite/<token>.
  const next = safeNextPath(formData.get("next"));
  const callback = `${await siteOrigin()}/auth/callback${next === "/app" ? "" : `?next=${encodeURIComponent(next)}`}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: callback,
    },
  });
  if (error) return { error: translateAuthError(error.code) };

  // With e-mail confirmation on, there is no session until the link is clicked.
  if (!data.session) {
    return {
      success:
        "Conta criada! Enviamos um link de confirmação para o seu e-mail. Pode levar alguns minutos — confira também o spam.",
    };
  }

  redirect(next);
}

export async function resendConfirmation(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error) return { error: translateAuthError(error.code) };

  // Same answer whether or not the account exists, so this can't be used to probe e-mails.
  return {
    success:
      "Se houver uma conta aguardando confirmação com este e-mail, enviamos um novo link. Confira também o spam.",
  };
}

/** "Esqueci minha senha": e-mails a link that signs in and opens /reset-password. */
export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(RESET_PASSWORD_PATH)}`,
  });
  // Only the rate limits are worth telling apart; anything else gets the same answer below.
  if (error && /rate_limit/.test(error.code ?? "")) return { error: translateAuthError(error.code) };
  if (error) console.error("[auth] password reset e-mail failed:", error.code ?? error.message);

  // Same answer whether or not the account exists, so this can't be used to probe e-mails.
  return {
    success:
      "Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora — confira também o spam.",
  };
}

/** New password, set from the session the reset link opened. Other devices are signed out. */
export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error?.code === "session_not_found" || error?.name === "AuthSessionMissingError") {
    return { error: "O link expirou. Peça um novo link para criar a senha." };
  }
  if (error) return { error: translateAuthError(error.code) };

  // Whoever had the old password (another browser, a stolen session) is logged out.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/app");
}

/** `next` (optional form field): where to log in again, e.g. back to an invite. */
export async function logout(formData?: FormData) {
  const next = safeNextPath(formData?.get("next"), "");
  const supabase = await createClient();
  // "local" ends only this browser's session; the default ("global") would also
  // sign the user out on every other device.
  await supabase.auth.signOut({ scope: "local" });
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
