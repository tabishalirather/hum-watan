import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, accounts, sessions, verificationTokens } from "@/db/schema/auth";
import { profiles } from "@/db/schema/profiles";
import { loginSchema } from "@/features/auth/validators/auth-schema";
import { isAlwaysVerified } from "@/features/auth/lib/roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        });
        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.sub = user.id;
      }

      if (token.sub) {
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.userId, token.sub),
        });
        token.role = profile?.role ?? "mentee";
        token.verified = isAlwaysVerified(profile?.role) || Boolean(profile?.verified);
        // Unread counts deliberately live outside the token. They changed on
        // every message and forced four queries per JWT refresh, so the
        // notification bell polls /api/notifications for them instead.
      }

      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "mentee" | "mentor" | "admin";
        session.user.verified = Boolean(token.verified);
      }
      return session;
    },
  },
});
