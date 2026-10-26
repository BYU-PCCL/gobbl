import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SURVEY_QUESTIONS, isAnswerValid } from "@/lib/survey/questions";

export async function POST(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();
  const userId = sessionUser.id;

  let body: { responses?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const responses = body?.responses ?? {};

  const fieldErrors: Record<string, string> = {};
  for (const question of SURVEY_QUESTIONS) {
    const answer = responses[question.key];
    if (!isAnswerValid(question, answer)) {
      fieldErrors[question.key] = "Required";
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (existing.onboardingCompletedAt) {
    return NextResponse.json(
      { error: "Survey already completed" },
      { status: 409 },
    );
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      surveyResponses: responses,
      onboardingCompletedAt: now,
    },
  });

  return NextResponse.json({ onboardingCompletedAt: now.toISOString() });
}
