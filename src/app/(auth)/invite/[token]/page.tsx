import type { Metadata } from "next";
import Link from "next/link";

import { logout } from "@/actions/auth";
import { AcceptInviteButton } from "@/components/members/accept-invite-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitePreview } from "@/lib/members";
import { ROLE_LABELS } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Convite" };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function Notice({ title, description, user }: { title: string; description: string; user: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl" role="heading" aria-level={1}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={user ? "/app" : "/login"}>{user ? "Ir para o app" : "Entrar"}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

/** Invite landing page: works without a session (sign up / log in and come back here). */
export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const { token } = params;
  const [preview, user] = await Promise.all([
    TOKEN_PATTERN.test(token) ? getInvitePreview(token) : null,
    getCurrentUser(),
  ]);

  if (!preview) {
    return (
      <Notice
        title="Convite não encontrado"
        description="O link está incompleto ou o convite foi cancelado. Peça um novo convite a quem te convidou."
        user={!!user}
      />
    );
  }
  if (preview.status === "expired") {
    return (
      <Notice
        title="Convite expirado"
        description={`O convite para ${preview.workspaceName} venceu. Peça a um admin do workspace para enviar outro.`}
        user={!!user}
      />
    );
  }
  if (preview.status === "accepted") {
    return (
      <Notice
        title="Convite já usado"
        description={`Este convite para ${preview.workspaceName} já foi aceito.`}
        user={!!user}
      />
    );
  }

  const here = `/invite/${token}`;
  const inviter = preview.inviterName?.trim() || "Um admin";
  const role = ROLE_LABELS[preview.role].toLowerCase();
  const wrongAccount = user && user.email?.toLowerCase() !== preview.email;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl" role="heading" aria-level={1}>Convite para {preview.workspaceName}</CardTitle>
        <CardDescription>
          {inviter} convidou <strong className="font-medium text-foreground">{preview.email}</strong> para participar
          do workspace como {role}.
        </CardDescription>
      </CardHeader>

      {!user && (
        <CardFooter className="flex-col gap-3">
          <Button asChild className="w-full">
            <Link href={`/signup?next=${encodeURIComponent(here)}&email=${encodeURIComponent(preview.email)}`}>
              Criar conta e aceitar
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/login?next=${encodeURIComponent(here)}`}>Já tenho conta — entrar</Link>
          </Button>
        </CardFooter>
      )}

      {user && wrongAccount && (
        <>
          <CardContent>
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Você está conectado como <strong className="font-medium">{user.email}</strong>. Para aceitar, entre com a
              conta de {preview.email}.
            </p>
          </CardContent>
          <CardFooter>
            <form action={logout} className="w-full">
              <input type="hidden" name="next" value={here} />
              <Button type="submit" variant="outline" className="w-full">
                Sair e entrar com outra conta
              </Button>
            </form>
          </CardFooter>
        </>
      )}

      {user && !wrongAccount && (
        <CardFooter>
          <AcceptInviteButton token={token} workspaceName={preview.workspaceName} />
        </CardFooter>
      )}
    </Card>
  );
}
