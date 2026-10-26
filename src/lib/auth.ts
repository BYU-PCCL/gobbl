import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import { verifyCredentials } from "./credentials";

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

        const user = await verifyCredentials(credentials.username, credentials.password);
        if (!user) return null;

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
