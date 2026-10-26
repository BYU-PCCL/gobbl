import { NextResponse } from "next/server";
import {
  BADGES,
  DAILY_BONUS_FEATHERS,
  DAILY_BONUS_XP,
  DIFFICULTIES,
  LEVELS,
  MAX_MESSAGE_CHARS,
  MAX_TURNS,
} from "@/lib/gamification";
import { CATEGORIES, TOPICS } from "@/lib/topics";
import { getDailyTopicForDate, utcDateKey } from "@/lib/daily";
import { SHOP_CATALOG, SHOP_SLOTS } from "@/lib/shop";
import { STAGE_SLOT_OFFSETS } from "@/lib/avatarAnchors";
import { SURVEY_QUESTIONS } from "@/lib/survey/questions";
import { IDEOLOGY_OPTIONS } from "@/lib/prompts/beliefs";
import { DIMENSION_DESCRIPTIONS, DIMENSION_LABELS } from "@/lib/civility";

/**
 * GET /api/config — public, cacheable.
 *
 * Everything a client needs that lives only in TypeScript on the server: game
 * rules, topic list and today's Daily Gobble, level/badge/tier tables, the shop
 * catalog, avatar anchors, survey questions. The web still imports these
 * modules directly; the iOS app reads this instead so game data never has to
 * ship inside an App Store release.
 *
 * Contract: additive changes only. Bump `configVersion` when a field's meaning
 * changes; raise `minClientVersion` to force an app update.
 */
const CONFIG_VERSION = 1;
const MIN_CLIENT_VERSION = { ios: "1.0.0" };

export async function GET() {
  const now = new Date();
  const dailyTopic = getDailyTopicForDate(now);

  const body = {
    configVersion: CONFIG_VERSION,
    minClientVersion: MIN_CLIENT_VERSION,
    rules: {
      maxTurns: MAX_TURNS,
      maxMessageChars: MAX_MESSAGE_CHARS,
      dailyBonusXp: DAILY_BONUS_XP,
      dailyBonusFeathers: DAILY_BONUS_FEATHERS,
    },
    today: { date: utcDateKey(now), dailyTopic },
    topics: TOPICS,
    categories: CATEGORIES,
    difficulties: DIFFICULTIES,
    levels: LEVELS,
    badges: BADGES,
    shop: { slots: SHOP_SLOTS, catalog: SHOP_CATALOG },
    avatarAnchors: STAGE_SLOT_OFFSETS,
    survey: { questions: SURVEY_QUESTIONS },
    ideologyOptions: IDEOLOGY_OPTIONS,
    civility: {
      dimensions: (Object.keys(DIMENSION_LABELS) as (keyof typeof DIMENSION_LABELS)[]).map((key) => ({
        key,
        label: DIMENSION_LABELS[key],
        description: DIMENSION_DESCRIPTIONS[key],
      })),
    },
  };

  return NextResponse.json(body, {
    headers: {
      // `today` rolls over at UTC midnight, so keep the CDN TTL short and let clients
      // hold their own stale copy for offline starts.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
