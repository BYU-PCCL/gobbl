import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  const users = [
    { username: "CivilSam", xp: 3200, level: 5, civilityScore: 7.8, currentStreak: 5, longestStreak: 12 },
    { username: "DebateDana", xp: 1800, level: 4, civilityScore: 8.2, currentStreak: 3, longestStreak: 8 },
    { username: "ReasonRick", xp: 950, level: 3, civilityScore: 6.5, currentStreak: 1, longestStreak: 4 },
    { username: "EmpathyElla", xp: 5500, level: 6, civilityScore: 9.1, currentStreak: 14, longestStreak: 14 },
    { username: "BridgeBot", xp: 420, level: 2, civilityScore: 7.0, currentStreak: 2, longestStreak: 3 },
  ];

  const species = ["eastern", "ocellated", "goulds", "rio", "merriams"];
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const companion = { companionSpecies: species[i % species.length], companionHatchedAt: new Date() };
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        passwordHash: hash,
        xp: u.xp,
        featherBalance: u.xp,
        level: u.level,
        civilityScore: u.civilityScore,
        currentStreak: u.currentStreak,
        longestStreak: u.longestStreak,
        lastActiveDate: new Date(),
        ...companion,
      },
    });
  }

  console.log("Seed data created: 5 sample users (password: password123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
