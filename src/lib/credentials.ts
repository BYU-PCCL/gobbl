import bcrypt from "bcryptjs";
import { prisma } from "./db";

/**
 * Username/password rules and checks shared by the NextAuth credentials provider
 * (web cookie login), `/api/register` (web signup) and `/api/mobile/auth/*`
 * (bearer-token login/signup for the iOS app). One code path, one set of rules.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 6;
const BCRYPT_COST = 10;

export type RegistrationInput = { username?: unknown; password?: unknown };

/** Returns an error message, or null when the input is acceptable. */
export function validateRegistration(input: RegistrationInput): string | null {
  const { username, password } = input;
  if (!username || !password) return "Username and password are required";
  if (typeof username !== "string" || typeof password !== "string") {
    return "Username and password are required";
  }
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`;
  }
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  return null;
}

export type AuthenticatedUser = {
  id: string;
  username: string;
  onboardingCompletedAt: Date | null;
};

/** Looks the user up and checks the password. Null on unknown user or wrong password. */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, passwordHash: true, onboardingCompletedAt: true },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, username: user.username, onboardingCompletedAt: user.onboardingCompletedAt };
}

export class UsernameTakenError extends Error {
  constructor() {
    super("Username already taken");
    this.name = "UsernameTakenError";
  }
}

/** Creates the account. Throws UsernameTakenError on a duplicate username. */
export async function createAccount(username: string, password: string): Promise<AuthenticatedUser> {
  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) throw new UsernameTakenError();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: { username, passwordHash },
    select: { id: true, username: true, onboardingCompletedAt: true },
  });
  return user;
}
