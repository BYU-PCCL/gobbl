import { NextResponse } from "next/server";
import { createAccount, UsernameTakenError, validateRegistration } from "@/lib/credentials";

/** Web signup. Creates the account only; the page then calls NextAuth signIn("credentials"). */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const problem = validateRegistration(body);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const user = await createAccount(body.username, body.password);
    return NextResponse.json({ id: user.id, username: user.username });
  } catch (e) {
    if (e instanceof UsernameTakenError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
