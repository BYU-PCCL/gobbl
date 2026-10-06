import { redirect } from "next/navigation";
import { getStudioAccess } from "@/lib/studio/access";
import { StudioShell } from "@/components/studio/StudioShell";

export const metadata = { title: "Module Studio" };

/**
 * Module Studio lives in its own route group so it renders outside the Gobbl
 * AppShell. This layout is the gate: every /studio page passes through it.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const access = await getStudioAccess();
  if (access.status === "unauthenticated") redirect("/");
  if (access.status === "forbidden") redirect("/dashboard");

  return <StudioShell username={access.user.username}>{children}</StudioShell>;
}
