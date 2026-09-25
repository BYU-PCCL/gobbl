import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAIResponse, scoreCivility, scoreConversationHolistic, ChatMessage } from "@/lib/ai";
import { calculateXP, calculateFeathers, getLevelInfo, checkNewBadges } from "@/lib/gamification";
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

  const debate = await prisma.debate.findFirst({
    where: { id: debateId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!debate) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  const conversationHistory: ChatMessage[] = debate.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const civilityResult = await scoreCivility(message, conversationHistory);

  await prisma.message.create({
    data: {
      debateId,
      role: "user",
      content: message,
      civilityScore: civilityResult.overall,
      dimensions: JSON.stringify(civilityResult.dimensions),
    },
  });

  conversationHistory.push({ role: "user", content: message });

  if (finish) {
    return await finishDebate(userId, debateId, civilityResult.overall);
  }

  const persona =
    getPersonaById(debate.personaId) ??
    pickPersona(isTier(debate.difficulty) ? debate.difficulty : "Friendly Cluck");
  const aiResponse = await getAIResponse(conversationHistory, debate.topic, persona);

  // Partner scoring is informational only — a scoring failure must not break the conversation.
  const partnerCivility = await scoreCivility(aiResponse, conversationHistory, "assistant").catch(
    () => null
  );

  await prisma.message.create({
    data: {
      debateId,
      role: "assistant",
      content: aiResponse,
      civilityScore: partnerCivility?.overall ?? null,
      dimensions: partnerCivility ? JSON.stringify(partnerCivility.dimensions) : null,
    },
  });

  const userMsgCount = debate.messages.filter((m) => m.role === "user").length + 1;

  return NextResponse.json({
    aiResponse,
    aiCivility: partnerCivility,
    civility: civilityResult,
    turnNumber: userMsgCount,
    maxTurns: 8,
  });
}

async function finishDebate(userId: string, debateId: string, lastScore: number) {
  const debate = await prisma.debate.findUnique({
    where: { id: debateId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!debate) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
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

  await prisma.$transaction([
    prisma.debate.update({
      where: { id: debateId },
      data: {
        completed: true,
        overallScore: overallScore,
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
