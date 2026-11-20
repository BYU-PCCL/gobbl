import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { isTestMode, parseTesterId } from "./testMode";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Test mode stores usernames as canonical tester IDs, so "p14" must find "P014".
        const username = isTestMode()
          ? parseTesterId(credentials.username) ?? credentials.username
          : credentials.username;
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.username };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { onboardingCompletedAt: true },
        });
        token.onboardingCompletedAt = dbUser?.onboardingCompletedAt?.toISOString() ?? null;
      }
      if (trigger === "update" && session && typeof session === "object") {
        const next = (session as { onboardingCompletedAt?: string }).onboardingCompletedAt;
        if (next) token.onboardingCompletedAt = next;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
