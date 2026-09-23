import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The middleware already gates these routes; this is defense in depth.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return children;
}
