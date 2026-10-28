import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAIResponse, scoreCivility, scoreConversationHolistic, ChatMessage } from "@/lib/ai";
import { calculateXP, calculateFeathers, getLevelInfo, checkNewBadges } from "@/lib/gamification";
import { parseEquippedCosmetics } from "@/lib/shop";
import { fallbackHolisticFromUserMessages, parseStoredDimensions } from "@/lib/civility";
import { maxTurnsForDebate } from "@/lib/debates";
import { MIN_TURNS_TO_FINISH } from "@/lib/conversation";
import { isMoveId } from "@/lib/moves";
import { getPersonaById, pickPersona, isTier } from "@/lib/personas/pool";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { debateId, message, finish, moveId } = await req.json();
  const hasMessage = typeof message === "string" && message.trim().length > 0;

  if (!hasMessage && !finish) {
    return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  }

  const debate = await prisma.debate.findFirst({
    where: { id: debateId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!debate) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const maxTurns = maxTurnsForDebate(debate.trainingMode);
  const priorUserCount = debate.messages.filter((m) => m.role === "user").length;

  if (debate.completed) {
    // A lost "wrap up" response must not strand the user: replay the stored summary (no new rewards).
    if (finish) return await alreadyFinished(userId, debate);
    return NextResponse.json({ error: "This conversation is already finished" }, { status: 409 });
  }

  // "Wrap up" carries no new message. Don't record a blank one — it would be scored,
  // stored in the transcript, and counted toward the user's message total (feathers).
  if (!hasMessage) {
    if (priorUserCount < Math.min(MIN_TURNS_TO_FINISH, maxTurns)) {
      return NextResponse.json({ error: "Say a little more before wrapping up" }, { status: 400 });
    }
    return await finishDebate(userId, debateId, 5);
  }

  if (priorUserCount >= maxTurns && !finish) {
    return NextResponse.json({ error: "Round limit reached" }, { status: 409 });
  }

  const conversationHistory: ChatMessage[] = debate.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const historyWithUser: ChatMessage[] = [...conversationHistory, { role: "user", content: message }];

  const persona =
    getPersonaById(debate.personaId) ??
    pickPersona(isTier(debate.difficulty) ? debate.difficulty : "Friendly Cluck");

  // Scoring the user's message and generating the reply don't depend on each other,
  // so run them concurrently instead of making the user wait for both back to back.
  const [civilityResult, aiResponse] = await Promise.all([
    scoreCivility(message, conversationHistory),
    finish ? null : getAIResponse(historyWithUser, debate.topic, persona, {
          allowProfanity: debate.allowProfanity,
          moduleKey: debate.trainingMode,
          userStance: debate.userStance === "for" || debate.userStance === "against" ? debate.userStance : null,
        }),
  ]);

  await prisma.message.create({
    data: {
      debateId,
      role: "user",
      content: message,
      moveId: isMoveId(moveId) ? moveId : null,
      civilityScore: civilityResult.overall,
      dimensions: JSON.stringify(civilityResult.dimensions),
    },
  });

  if (finish || aiResponse === null) {
    return await finishDebate(userId, debateId, civilityResult.overall);
  }

  const aiMessage = await prisma.message.create({
    data: { debateId, role: "assistant", content: aiResponse },
  });

  // Partner scoring is informational only, so it runs after the response is sent rather
  // than holding up the reply. The score is saved to the message and shows on reload.
  waitUntil(
    scoreCivility(aiResponse, historyWithUser, "assistant")
      .then((partnerCivility) =>
        prisma.message.update({
          where: { id: aiMessage.id },
          data: {
            civilityScore: partnerCivility.overall,
            dimensions: JSON.stringify(partnerCivility.dimensions),
          },
        })
      )
      .catch((err) => console.error("[chat] partner scoring failed", err))
  );

  return NextResponse.json({
    aiResponse,
    turnNumber: priorUserCount + 1,
    maxTurns,
  });
}

async function finishDebate(userId: string, debateId: string, lastScore: number) {
  const debate = await prisma.debate.findUnique({
    where: { id: debateId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!debate) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const userMessages = debate.messages.filter((m) => m.role === "user");
  const transcript = debate.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");

  let holisticResult = await scoreConversationHolistic(transcript);
  if (!holisticResult) {
    holisticResult = fallbackHolisticFromUserMessages(
      userMessages.map((m) => ({ civilityScore: m.civilityScore, dimensions: m.dimensions }))
    );
  }
  if (userMessages.length === 0) {
    holisticResult = fallbackHolisticFromUserMessages([
      { civilityScore: lastScore, dimensions: null },
    ]);
  }

  const overallScore = holisticResult.overall;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { badges: true, debates: { where: { completed: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userMessageCount = userMessages.length;

  const xpResult = calculateXP(
    overallScore,
    debate.difficulty,
    debate.isDaily,
    user.currentStreak
  );

  const featherResult = calculateFeathers(userMessageCount, debate.difficulty, debate.isDaily);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (lastActive) lastActive.setHours(0, 0, 0, 0);

  let newStreak = user.currentStreak;
  if (!lastActive || today.getTime() - lastActive.getTime() > 86400000 * 2) {
    newStreak = 1;
  } else if (today.getTime() - lastActive.getTime() >= 86400000) {
    newStreak = user.currentStreak + 1;
  }

  const newXp = user.xp + xpResult.total;
  const newLevel = getLevelInfo(newXp).level;

  const completedDebates = user.debates.filter((d) => d.completed);
  const recentScores = completedDebates
    .slice(0, 19)
    .map((d) => d.overallScore)
    .filter((s): s is number => s !== null);
  recentScores.push(overallScore);
  const newCivility = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  const parsedPerMessage = userMessages
    .map((m) => parseStoredDimensions(m.dimensions))
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const maxMutualExchange =
    parsedPerMessage.length > 0 ? Math.max(...parsedPerMessage.map((d) => d.mutualExchange)) : 0;
  const maxSelfExpressionReason =
    parsedPerMessage.length > 0 ? Math.max(...parsedPerMessage.map((d) => d.selfExpressionReason)) : 0;

  const stats = {
    totalDebates: completedDebates.length + 1,
    civilDebates: completedDebates.filter((d) => (d.overallScore || 0) >= 7).length + (overallScore >= 7 ? 1 : 0),
    devilsAdvocateCount: completedDebates.filter((d) => d.difficulty === "Devil's Advocate").length +
      (debate.difficulty === "Devil's Advocate" ? 1 : 0),
    dailyChallengeCount: completedDebates.filter((d) => d.isDaily).length + (debate.isDaily ? 1 : 0),
    maxMutualExchange,
    maxSelfExpressionReason,
    currentStreak: newStreak,
    level: newLevel,
  };

  const existingBadgeKeys = user.badges.map((b) => b.badgeKey);
  const newBadges = checkNewBadges(stats, existingBadgeKeys);

  // Two racing "finish" calls (double tap, two tabs) must pay out once: the guarded updateMany picks the winner.
  const paid = await prisma.$transaction(async (tx) => {
    const won = await tx.debate.updateMany({
      where: { id: debateId, completed: false },
      data: {
        completed: true,
        dimensions: holisticResult.dimensions as unknown as Prisma.InputJsonObject,
        overallScore: overallScore,
        xpEarned: xpResult.total,
        feathersEarned: featherResult.total,
        completedAt: new Date(),
      },
    });
    if (won.count === 0) return false;
    await tx.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xpResult.total },
        featherBalance: { increment: featherResult.total },
        level: newLevel,
        civilityScore: newCivility,
        currentStreak: newStreak,
        longestStreak: Math.max(user.longestStreak, newStreak),
        lastActiveDate: new Date(),
      },
    });
    for (const badgeKey of newBadges) {
      await tx.userBadge.create({ data: { userId, badgeKey } });
    }
    return true;
  });
  if (!paid) {
    const fresh = await prisma.debate.findUnique({ where: { id: debateId } });
    if (fresh) return await alreadyFinished(userId, fresh);
  }

  const dimensionsOut = {
    participation: holisticResult.dimensions.participation,
    selfExpressionReason: holisticResult.dimensions.selfExpressionReason,
    mutualExchange: holisticResult.dimensions.mutualExchange,
    interrogation: holisticResult.dimensions.interrogation,
  };

  return NextResponse.json({
    finished: true,
    overallScore,
    dimensions: dimensionsOut,
    xp: xpResult,
    feathers: featherResult,
    previousLevel: user.level,
    newLevel,
    newBadges,
    streak: newStreak,
    civilityScore: newCivility,
    equippedCosmetics: parseEquippedCosmetics(user.equippedCosmetics),
  });
}

/** Replays the stored summary of a finished conversation so a lost response never strands the client. */
async function alreadyFinished(
  userId: string,
  debate: { overallScore: number | null; dimensions: Prisma.JsonValue | null }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  // Debate.dimensions is a Json column (object), unlike Message.dimensions (JSON string).
  const dims = parseStoredDimensions(debate.dimensions ? JSON.stringify(debate.dimensions) : null) ?? {
    participation: 0,
    selfExpressionReason: 0,
    mutualExchange: 0,
    interrogation: 0,
  };
  return NextResponse.json({
    finished: true,
    alreadyCompleted: true,
    overallScore: debate.overallScore ?? 0,
    dimensions: dims,
    xp: { base: 0, difficultyBonus: 0, dailyBonus: 0, streakMultiplier: 1, total: 0 },
    feathers: { base: 0, difficultyBonus: 0, dailyBonus: 0, total: 0 },
    previousLevel: user.level,
    newLevel: user.level,
    newBadges: [],
    streak: user.currentStreak,
    civilityScore: user.civilityScore,
    equippedCosmetics: parseEquippedCosmetics(user.equippedCosmetics),
  });
}
