import { cn } from "@/lib/utils";

export function FormMessage({
  type,
  children,
}: {
  type: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        type === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {children}
    </p>
  );
}
