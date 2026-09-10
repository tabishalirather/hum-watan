import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "mentee" | "mentor" | "admin";
      verified: boolean;
      pendingReferralCount: number;
      pendingReceivedRequestsCount: number;
      newConnectionsCount: number;
      newMessageThreadsCount: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "mentee" | "mentor" | "admin";
    verified?: boolean;
    pendingReferralCount?: number;
    pendingReceivedRequestsCount?: number;
    newConnectionsCount?: number;
    newMessageThreadsCount?: number;
  }
}
