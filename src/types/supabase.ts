// Named row types for each table. The generated schema lives in ./database.ts
// (`npx supabase gen types typescript --linked > src/types/database.ts`);
// this file only gives its rows readable names, so it never needs regenerating.
import type { Enums, Tables, TablesInsert, TablesUpdate } from "@/types/database";

export type { Database, Enums, Tables, TablesInsert, TablesUpdate } from "@/types/database";

export type Profile = Tables<"profiles">;
export type Workspace = Tables<"workspaces">;
export type WorkspaceMember = Tables<"workspace_members">;
export type Lead = Tables<"leads">;
export type Deal = Tables<"deals">;
export type Activity = Tables<"activities">;
export type Subscription = Tables<"subscriptions">;
export type PixPayment = Tables<"pix_payments">;

export type LeadInsert = TablesInsert<"leads">;
export type LeadUpdate = TablesUpdate<"leads">;
export type DealInsert = TablesInsert<"deals">;
export type DealUpdate = TablesUpdate<"deals">;
export type ActivityInsert = TablesInsert<"activities">;
export type ActivityUpdate = TablesUpdate<"activities">;

export type WorkspaceRole = Enums<"workspace_role">;
export type WorkspacePlan = Enums<"workspace_plan">;
export type SubscriptionStatus = Enums<"subscription_status">;
