import { NextResponse } from "next/server";
import { getStudioAccess } from "@/lib/studio/access";

// Always 200: the sidebar link asks this for every signed-in user and should
// stay hidden, not error, when the answer is no.
export async function GET() {
  const access = await getStudioAccess();
  return NextResponse.json({ access: access.status === "ok" });
}
