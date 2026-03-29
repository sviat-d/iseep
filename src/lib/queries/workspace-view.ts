import { db } from "@/db";
import {
  products,
  icps,
  productIcps,
  personas,
  icpPersonaLinks,
  signals,
  hypotheses,
  icpEvidence,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// ─── Products ──────────────────────────────────────────────────────────────

export async function getWorkspaceProducts(workspaceId: string) {
  return db
    .select({
      id: products.id,
      name: products.name,
      shortDescription: products.shortDescription,
      icpCount: sql<number>`(
        select count(*) from product_icps
        where product_icps.product_id = ${products.id}
      )::int`,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.workspaceId, workspaceId))
    .orderBy(products.createdAt);
}

// ─── ICPs (one row per ICP — never duplicated) ────────────────────────────

export async function getWorkspaceIcps(workspaceId: string) {
  const icpRows = await db
    .select({
      id: icps.id,
      name: icps.name,
      status: icps.status,
      version: icps.version,
      updatedAt: icps.updatedAt,
      personaCount: sql<number>`(select count(*) from personas where personas.icp_id = ${icps.id})::int`,
      signalCount: sql<number>`(select count(*) from signals where signals.icp_id = ${icps.id})::int`,
      criteriaCount: sql<number>`(select count(*) from criteria where criteria.icp_id = ${icps.id})::int`,
      hypothesisCount: sql<number>`(select count(*) from hypotheses where hypotheses.icp_id = ${icps.id})::int`,
      caseCount: sql<number>`(select count(*) from icp_evidence where icp_evidence.icp_id = ${icps.id})::int`,
    })
    .from(icps)
    .where(eq(icps.workspaceId, workspaceId))
    .orderBy(desc(icps.updatedAt));

  // Separate query for product links — avoids row duplication
  const links = await db
    .select({
      icpId: productIcps.icpId,
      productId: productIcps.productId,
      productName: sql<string>`(select p.name from products p where p.id = ${productIcps.productId})`,
    })
    .from(productIcps)
    .where(eq(productIcps.workspaceId, workspaceId));

  const linkMap = new Map<string, { id: string; name: string }[]>();
  for (const link of links) {
    const arr = linkMap.get(link.icpId) ?? [];
    arr.push({ id: link.productId, name: link.productName });
    linkMap.set(link.icpId, arr);
  }

  return icpRows.map((icp) => ({
    ...icp,
    products: linkMap.get(icp.id) ?? [],
  }));
}

// ─── Personas (library model — usage count from icp_persona_links) ────────

export async function getWorkspacePersonas(workspaceId: string) {
  return db
    .select({
      id: personas.id,
      name: personas.name,
      description: personas.description,
      icpCount: sql<number>`(
        select count(*) from icp_persona_links ipl
        where ipl.persona_id = ${personas.id}
      )::int`,
      createdAt: personas.createdAt,
    })
    .from(personas)
    .where(eq(personas.workspaceId, workspaceId))
    .orderBy(personas.name);
}

// ─── Personas for ICP (via links table, with override state) ──────────────

export async function getPersonasForIcp(icpId: string, workspaceId: string) {
  return db
    .select({
      linkId: icpPersonaLinks.id,
      personaId: personas.id,
      name: personas.name,
      description: personas.description,
      goals: personas.goals,
      painPoints: personas.painPoints,
      triggers: personas.triggers,
      decisionCriteria: personas.decisionCriteria,
      objections: personas.objections,
      desiredOutcome: personas.desiredOutcome,
      overrideData: icpPersonaLinks.overrideData,
      isCustomized: sql<boolean>`${icpPersonaLinks.overrideData} IS NOT NULL`,
      icpCount: sql<number>`(
        select count(*) from icp_persona_links ipl2
        where ipl2.persona_id = ${personas.id}
      )::int`,
    })
    .from(icpPersonaLinks)
    .innerJoin(personas, eq(personas.id, icpPersonaLinks.personaId))
    .where(
      and(
        eq(icpPersonaLinks.icpId, icpId),
        eq(icpPersonaLinks.workspaceId, workspaceId),
      ),
    )
    .orderBy(personas.name);
}

// ─── Personas available to attach (not yet linked to this ICP) ────────────

export async function getAvailablePersonas(icpId: string, workspaceId: string) {
  return db
    .select({
      id: personas.id,
      name: personas.name,
      description: personas.description,
      icpCount: sql<number>`(
        select count(*) from icp_persona_links ipl
        where ipl.persona_id = ${personas.id}
      )::int`,
    })
    .from(personas)
    .where(
      and(
        eq(personas.workspaceId, workspaceId),
        sql`NOT EXISTS (
          SELECT 1 FROM icp_persona_links ipl
          WHERE ipl.persona_id = ${personas.id} AND ipl.icp_id = ${icpId}
        )`,
      ),
    )
    .orderBy(personas.name);
}

// ─── Signals (with ICP info — ICP-scoped, visible globally) ──────────────

export async function getWorkspaceSignals(workspaceId: string) {
  return db
    .select({
      id: signals.id,
      label: signals.label,
      type: signals.type,
      strength: signals.strength,
      icpId: signals.icpId,
      icpName: sql<string>`(select i.name from icps i where i.id = ${signals.icpId})`,
    })
    .from(signals)
    .where(eq(signals.workspaceId, workspaceId))
    .orderBy(signals.label);
}

// ─── Hypotheses (recent preview — lightweight) ────────────────────────────

export async function getRecentHypotheses(workspaceId: string, limit = 6) {
  return db
    .select({
      id: hypotheses.id,
      name: hypotheses.name,
      status: hypotheses.status,
      icpId: hypotheses.icpId,
      icpName: sql<string>`(select i.name from icps i where i.id = ${hypotheses.icpId})`,
      productIds: hypotheses.productIds,
      recipients: hypotheses.recipients,
      sqls: hypotheses.sqls,
      wonDeals: hypotheses.wonDeals,
      updatedAt: hypotheses.updatedAt,
    })
    .from(hypotheses)
    .where(eq(hypotheses.workspaceId, workspaceId))
    .orderBy(desc(hypotheses.updatedAt))
    .limit(limit);
}

// ─── Cases (recent preview — lightweight) ─────────────────────────────────

export async function getRecentCases(workspaceId: string, limit = 6) {
  return db
    .select({
      id: icpEvidence.id,
      companyName: icpEvidence.companyName,
      outcome: icpEvidence.outcome,
      icpId: icpEvidence.icpId,
      icpName: sql<string>`(select i.name from icps i where i.id = ${icpEvidence.icpId})`,
      productIds: icpEvidence.productIds,
      productId: icpEvidence.productId, // legacy fallback
      dealValue: icpEvidence.dealValue,
      dealType: icpEvidence.dealType,
      hypothesisId: icpEvidence.hypothesisId,
      updatedAt: icpEvidence.updatedAt,
    })
    .from(icpEvidence)
    .where(eq(icpEvidence.workspaceId, workspaceId))
    .orderBy(desc(icpEvidence.updatedAt))
    .limit(limit);
}
