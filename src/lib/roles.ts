import type { Enums } from "@/types/database";

export type WorkspaceRole = Enums<"workspace_role">;

/** Workspace roles as shown in the UI — safe to import in client components. */
export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: "Admin",
  member: "Membro",
};
