import { db } from "@/db";
import { deals, companies, contacts, icps, segments, dealReasons, meetingNotes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getDeals(workspaceId: string) {
  return db
    .select({
      id: deals.id,
      title: deals.title,
      dealValue: deals.dealValue,
      currency: deals.currency,
      stage: deals.stage,
      outcome: deals.outcome,
      companyName: companies.name,
      companyId: deals.companyId,
      icpId: deals.icpId,
      icpName: icps.name,
      closedAt: deals.closedAt,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(icps, eq(deals.icpId, icps.id))
    .where(eq(deals.workspaceId, workspaceId))
    .orderBy(sql`${deals.updatedAt} desc`);
}

export async function getDeal(id: string, workspaceId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)));
  if (!deal) return null;

  const [company] = await db.select().from(companies).where(eq(companies.id, deal.companyId));

  const contact = deal.contactId
    ? (await db.select().from(contacts).where(eq(contacts.id, deal.contactId)))[0] ?? null
    : null;

  const icp = deal.icpId
    ? (await db.select({ id: icps.id, name: icps.name }).from(icps).where(eq(icps.id, deal.icpId)))[0] ?? null
    : null;

  const segment = deal.segmentId
    ? (await db.select({ id: segments.id, name: segments.name }).from(segments).where(eq(segments.id, deal.segmentId)))[0] ?? null
    : null;

  const reasons = await db
    .select()
    .from(dealReasons)
    .where(and(eq(dealReasons.dealId, id), eq(dealReasons.workspaceId, workspaceId)))
    .orderBy(dealReasons.createdAt);

  const notes = await db
    .select()
    .from(meetingNotes)
    .where(and(eq(meetingNotes.dealId, id), eq(meetingNotes.workspaceId, workspaceId)))
    .orderBy(sql`${meetingNotes.createdAt} desc`);

  return { ...deal, company, contact, icp, segment, reasons, notes };
}

export async function getCompanies(workspaceId: string) {
  return db
    .select()
    .from(companies)
    .where(eq(companies.workspaceId, workspaceId))
    .orderBy(companies.name);
}

export async function getCompany(id: string, workspaceId: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), eq(companies.workspaceId, workspaceId)));
  return company ?? null;
}

export async function getContacts(companyId: string, workspaceId: string) {
  return db
    .select()
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), eq(contacts.workspaceId, workspaceId)))
    .orderBy(contacts.fullName);
}
