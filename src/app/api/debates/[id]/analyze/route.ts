import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeDebate } from "@/lib/ai";
import type { Prisma } from "@prisma/client";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const debate = await prisma.debate.findFirst({
    where: { id: params.id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!debate) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }
  if (!debate.completed) {
    return NextResponse.json({ error: "Finish the conversation before analyzing it" }, { status: 409 });
  }

  // Cached from a previous request — analysis never changes for a finished debate.
  if (debate.analysis) {
    return NextResponse.json({ analysis: debate.analysis });
  }

  let turn = 0;
  const transcript = debate.messages
    .filter((m) => m.content.trim() !== "") // older debates have a blank "Wrap up" message
    .map((m) => {
      if (m.role === "user") turn += 1;
      return m.role === "user" ? `Turn ${turn} (user): ${m.content}` : `(partner): ${m.content}`;
    })
    .join("\n\n");

  const analysis = await analyzeDebate(transcript, turn);
  if (!analysis) {
    return NextResponse.json({ error: "Analysis isn't available right now — try again in a moment" }, { status: 502 });
  }

  await prisma.debate.update({
    where: { id: debate.id },
    data: { analysis: analysis as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ analysis });
}
