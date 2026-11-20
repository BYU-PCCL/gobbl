-- Tester deployment only. One row per thing a tester did, in time order: page views and
-- taps from test_events, merged with what the app already saves (account, conversations,
-- message times and scores, module sessions). No message text or typed answers.
--
-- Export: Supabase → Table Editor → tester_timeline → filter tester_id → Export to CSV.
--
-- Apply by hand to the tester database (not part of the build):
--   npx prisma db execute --file prisma/tester-timeline.sql --schema prisma/schema.prisma
-- If a later `prisma db push` complains that a column is used by this view, drop the view,
-- push, and run this file again.

DROP VIEW IF EXISTS public.tester_timeline;

CREATE VIEW public.tester_timeline WITH (security_invoker = true) AS
SELECT * FROM (
  SELECT
    e."testerId"                         AS tester_id,
    e."clientTime"                       AS "time",
    e.event                              AS event,
    e.route                              AS route,
    e.target                             AS target,
    e.detail::text                       AS detail,
    e."sessionId"                        AS session_id,
    e."serverTime"                       AS server_time
  FROM public.test_events e

  UNION ALL
  SELECT upper(u.username), u."createdAt", 'account_created', NULL, NULL, NULL, NULL, u."createdAt"
  FROM public."User" u

  UNION ALL
  SELECT upper(u.username), u."onboardingCompletedAt", 'onboarding_completed', NULL, NULL,
         u."surveyResponses"::text, NULL, u."onboardingCompletedAt"
  FROM public."User" u
  WHERE u."onboardingCompletedAt" IS NOT NULL

  UNION ALL
  SELECT upper(u.username), d."createdAt",
         CASE WHEN d."isTraining" THEN 'module_conversation_started' ELSE 'conversation_started' END,
         '/chat/' || d.id, d.category,
         json_build_object('difficulty', d.difficulty, 'persona', d."personaId", 'daily', d."isDaily",
                           'module', d."trainingMode")::text,
         NULL, d."createdAt"
  FROM public."Debate" d JOIN public."User" u ON u.id = d."userId"

  UNION ALL
  SELECT upper(u.username), d."completedAt", 'conversation_finished', '/chat/' || d.id, d.category,
         json_build_object('score', d."overallScore", 'xp', d."xpEarned", 'feathers', d."feathersEarned")::text,
         NULL, d."completedAt"
  FROM public."Debate" d JOIN public."User" u ON u.id = d."userId"
  WHERE d."completedAt" IS NOT NULL

  UNION ALL
  SELECT upper(u.username), m."createdAt",
         CASE WHEN m.role = 'user' THEN 'message_sent' ELSE 'reply_received' END,
         '/chat/' || d.id, NULL,
         json_build_object('civility', m."civilityScore", 'chars', length(m.content))::text,
         NULL, m."createdAt"
  FROM public."Message" m
  JOIN public."Debate" d ON d.id = m."debateId"
  JOIN public."User" u ON u.id = d."userId"

  UNION ALL
  SELECT upper(u.username), s."createdAt", 'module_started', '/skills/' || s."skillKey", s."skillKey",
         json_build_object('variant', s.variant)::text, NULL, s."createdAt"
  FROM public."SkillSession" s JOIN public."User" u ON u.id = s."userId"

  UNION ALL
  SELECT upper(u.username), s."completedAt", 'module_completed', '/skills/' || s."skillKey", s."skillKey",
         json_build_object('variant', s.variant, 'preStress', s."preStressRating", 'postStress', s."postStressRating",
                           'preCivility', s."preCivility", 'postCivility', s."postCivility")::text,
         NULL, s."completedAt"
  FROM public."SkillSession" s JOIN public."User" u ON u.id = s."userId"
  WHERE s."completedAt" IS NOT NULL
) t
ORDER BY tester_id NULLS LAST, "time";
