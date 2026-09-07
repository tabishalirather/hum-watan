import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client";
import { auditEvents } from "@/db/schema/audit";
import { profiles } from "@/db/schema/profiles";
import { mentorReferrals } from "@/db/schema/referrals";
import { users } from "@/db/schema/auth";

export async function getAdminDashboard(search = "") {
  const normalizedSearch = search.trim();
  const userSearch = normalizedSearch
    ? or(ilike(users.name, `%${normalizedSearch}%`), ilike(users.email, `%${normalizedSearch}%`))
    : undefined;

  const [referrals, accounts, auditHistory] = await Promise.all([
    db
      .select({
        id: mentorReferrals.id,
        status: mentorReferrals.status,
        createdAt: mentorReferrals.createdAt,
        reviewedAt: mentorReferrals.reviewedAt,
        mentorId: mentorReferrals.mentorUserId,
        mentorName: users.name,
        mentorEmail: users.email,
        mentorVerified: profiles.verified,
        mentorActive: users.isActive,
        refereeEmail: mentorReferrals.refereeEmail,
      })
      .from(mentorReferrals)
      .innerJoin(users, eq(users.id, mentorReferrals.mentorUserId))
      .leftJoin(profiles, eq(profiles.userId, mentorReferrals.mentorUserId))
      .orderBy(desc(mentorReferrals.createdAt)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        isActive: users.isActive,
        role: profiles.role,
        verified: profiles.verified,
        visibleOnMap: profiles.visibleOnMap,
        subject: profiles.subject,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(userSearch)
      .orderBy(desc(users.createdAt))
      .limit(100),
    db
      .select({
        id: auditEvents.id,
        action: auditEvents.action,
        entityType: auditEvents.entityType,
        entityId: auditEvents.entityId,
        metadata: auditEvents.metadata,
        createdAt: auditEvents.createdAt,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorUserId))
      .orderBy(desc(auditEvents.createdAt))
      .limit(100),
  ]);

  return { referrals, accounts, auditHistory };
}
