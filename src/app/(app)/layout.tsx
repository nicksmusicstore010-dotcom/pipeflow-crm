import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware already gates these routes; this is defense in depth.
  if (!user) redirect("/login");

  const sessionUser = {
    name: (user.user_metadata.full_name as string | undefined) || user.email || "Usuário",
    email: user.email ?? "",
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      <AppSidebar user={sessionUser} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={sessionUser} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
