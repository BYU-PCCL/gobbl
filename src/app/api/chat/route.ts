import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAIResponse, scoreCivility, scoreConversationHolistic, ChatMessage } from "@/lib/ai";
import { calculateXP, calculateFeathers, getLevelInfo, checkNewBadges, getMaxTurns, TOP_TIER } from "@/lib/gamification";
import { parseEquippedCosmetics } from "@/lib/shop";
import { fallbackHolisticFromUserMessages, parseStoredDimensions } from "@/lib/civility";
import { getPersonaById, pickPersona, isTier } from "@/lib/personas/pool";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { debateId, message, finish } = await req.json();
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

  // Without this, re-posting "finish" re-awards XP/feathers every time.
  if (debate.completed) {
    return NextResponse.json({ error: "This conversation is already finished" }, { status: 409 });
  }

  // "Wrap up" carries no new message. Don't record a blank one — it would be scored,
  // stored in the transcript, and counted toward the user's message total (feathers).
  if (!hasMessage) {
    return await finishDebate(userId, debateId, 5);
  }

  const conversationHistory: ChatMessage[] = debate.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const historyWithUser: ChatMessage[] = [...conversationHistory, { role: "user", content: message }];

  // The turn limit is per tier. The client stops sending at the limit; this holds it for
  // anyone posting directly, by scoring the extra message and wrapping up instead of replying.
  const maxTurns = getMaxTurns(debate.difficulty);
  const priorUserTurns = debate.messages.filter((m) => m.role === "user").length;
  const mustFinish = finish === true || priorUserTurns >= maxTurns;

  const persona =
    getPersonaById(debate.personaId) ??
    pickPersona(isTier(debate.difficulty) ? debate.difficulty : "Friendly Cluck");

  // Scoring the user's message and generating the reply don't depend on each other,
  // so run them concurrently instead of making the user wait for both back to back.
  const [civilityResult, aiResponse] = await Promise.all([
    scoreCivility(message, conversationHistory),
    mustFinish ? null : getAIResponse(historyWithUser, debate.topic, persona, {
          allowProfanity: debate.allowProfanity,
          moduleKey: debate.trainingMode,
        }),
  ]);

  await prisma.message.create({
    data: {
      debateId,
      role: "user",
      content: message,
      civilityScore: civilityResult.overall,
      dimensions: JSON.stringify(civilityResult.dimensions),
      feedback: civilityResult.feedback,
    },
  });

  if (mustFinish || aiResponse === null) {
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
            feedback: partnerCivility.feedback,
          },
        })
      )
      .catch((err) => console.error("[chat] partner scoring failed", err))
  );

  return NextResponse.json({
    aiResponse,
    aiCivility: null,
    civility: civilityResult,
    turnNumber: priorUserTurns + 1,
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

  const modelResult = userMessages.length > 0 ? await scoreConversationHolistic(transcript) : null;
  let holisticResult = modelResult;
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
  // The fallback's feedback strings describe the fallback itself; only the model's is worth showing.
  const feedback = modelResult?.feedback ?? null;

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
  const newFeatherBalance = user.featherBalance + featherResult.total;
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
    topTierCount: completedDebates.filter((d) => d.difficulty === TOP_TIER).length +
      (debate.difficulty === TOP_TIER ? 1 : 0),
    dailyChallengeCount: completedDebates.filter((d) => d.isDaily).length + (debate.isDaily ? 1 : 0),
    maxMutualExchange,
    maxSelfExpressionReason,
    currentStreak: newStreak,
    level: newLevel,
  };

  const existingBadgeKeys = user.badges.map((b) => b.badgeKey);
  const newBadges = checkNewBadges(stats, existingBadgeKeys);

  await prisma.$transaction([
    prisma.debate.update({
      where: { id: debateId },
      data: {
        completed: true,
        overallScore: overallScore,
        feedback,
        xpEarned: xpResult.total,
        feathersEarned: featherResult.total,
        completedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        featherBalance: newFeatherBalance,
        level: newLevel,
        civilityScore: newCivility,
        currentStreak: newStreak,
        longestStreak: Math.max(user.longestStreak, newStreak),
        lastActiveDate: new Date(),
      },
    }),
    ...newBadges.map((badgeKey) =>
      prisma.userBadge.create({
        data: { userId, badgeKey },
      })
    ),
  ]);

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
    feedback,
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
