import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { isTestMode, parseTesterId, TESTER_ID_HELP } from "@/lib/testMode";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = body.password;
    let username = body.username;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }
    if (isTestMode()) {
      // On the tester deployment the username is the tester ID, so no names are stored.
      username = parseTesterId(username);
      if (!username) {
        return NextResponse.json({ error: TESTER_ID_HELP }, { status: 400 });
      }
    }
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: "Username must be 3-20 characters" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, passwordHash },
    });

    return NextResponse.json({ id: user.id, username: user.username });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
