"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: string;
  /** Login failed because the e-mail isn't confirmed yet: offer to resend the link. */
  needsConfirmation?: boolean;
};

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome."),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

const resendSchema = z.object({
  email: z.email("Informe um e-mail válido."),
});

/** Base URL for links in auth e-mails: the current origin, or the configured site URL. */
function siteOrigin() {
  return headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  weak_password: "Senha muito fraca. Use pelo menos 8 caracteres.",
  over_email_send_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
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

  const supabase = createClient();
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

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteOrigin()}/auth/callback`,
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

  redirect("/app");
}

export async function resendConfirmation(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteOrigin()}/auth/callback` },
  });
  if (error) return { error: translateAuthError(error.code) };

  // Same answer whether or not the account exists, so this can't be used to probe e-mails.
  return {
    success:
      "Se houver uma conta aguardando confirmação com este e-mail, enviamos um novo link. Confira também o spam.",
  };
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
