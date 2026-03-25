// src/lib/drafts/apply.ts

import { db } from "@/db";
import {
  icps,
  criteria,
  personas,
  segments,
  productContext,
  icpSnapshots,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type {
  CreateIcpPayload,
  UpdateProductPayload,
  UpdateIcpPayload,
  CreateSegmentPayload,
} from "./types";

export async function applyCreateIcp(
  workspaceId: string,
  userId: string,
  payload: CreateIcpPayload,
): Promise<{ icpId: string }> {
  const [icp] = await db
    .insert(icps)
    .values({
      workspaceId,
      name: payload.name,
      description: payload.description || null,
      status: "draft",
      createdBy: userId,
    })
    .returning();

  for (const c of payload.criteria) {
    await db.insert(criteria).values({
      workspaceId,
      icpId: icp.id,
      group: c.group,
      category: c.category,
      operator: "equals",
      value: c.value,
      intent: c.intent,
      weight: c.intent === "qualify" ? (c.importance ?? 5) : null,
      note: c.note ?? null,
    });
  }

  for (const p of payload.personas) {
    await db.insert(personas).values({
      workspaceId,
      icpId: icp.id,
      name: p.name,
      description: p.description || null,
    });
  }

  return { icpId: icp.id };
}

export async function applyUpdateProduct(
  workspaceId: string,
  payload: UpdateProductPayload,
): Promise<void> {
  const [existing] = await db
    .select({ id: productContext.id })
    .from(productContext)
    .where(eq(productContext.workspaceId, workspaceId));

  if (!existing) {
    throw new Error("Product context does not exist. Create it first.");
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (payload.companyName !== undefined) updates.companyName = payload.companyName;
  if (payload.website !== undefined) updates.website = payload.website;
  if (payload.productDescription !== undefined) updates.productDescription = payload.productDescription;
  if (payload.targetCustomers !== undefined) updates.targetCustomers = payload.targetCustomers;
  if (payload.coreUseCases !== undefined) updates.coreUseCases = payload.coreUseCases;
  if (payload.keyValueProps !== undefined) updates.keyValueProps = payload.keyValueProps;
  if (payload.industriesFocus !== undefined) updates.industriesFocus = payload.industriesFocus;
  if (payload.geoFocus !== undefined) updates.geoFocus = payload.geoFocus;
  if (payload.pricingModel !== undefined) updates.pricingModel = payload.pricingModel;
  if (payload.avgTicket !== undefined) updates.avgTicket = payload.avgTicket;

  await db.update(productContext).set(updates).where(eq(productContext.id, existing.id));
}

export async function applyUpdateIcp(
  workspaceId: string,
  icpId: string,
  payload: UpdateIcpPayload,
): Promise<void> {
  const [icp] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, workspaceId)));

  if (!icp) throw new Error("ICP not found");

  if (payload.name !== undefined || payload.description !== undefined) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    await db.update(icps).set(updates).where(eq(icps.id, icpId));
  }

  if (payload.removeCriteria && payload.removeCriteria.length > 0) {
    const allCriteria = await db
      .select()
      .from(criteria)
      .where(and(eq(criteria.icpId, icpId), eq(criteria.workspaceId, workspaceId)));

    for (const toRemove of payload.removeCriteria) {
      const match = allCriteria.find(
        (c) =>
          c.category.toLowerCase() === toRemove.category.toLowerCase() &&
          c.value.toLowerCase() === toRemove.value.toLowerCase(),
      );
      if (match) {
        await db.delete(criteria).where(eq(criteria.id, match.id));
      }
    }
  }

  if (payload.addCriteria && payload.addCriteria.length > 0) {
    for (const c of payload.addCriteria) {
      await db.insert(criteria).values({
        workspaceId,
        icpId,
        group: c.group as "firmographic" | "technographic" | "behavioral" | "compliance" | "keyword",
        category: c.category,
        operator: "equals",
        value: c.value,
        intent: c.intent,
        weight: c.intent === "qualify" ? (c.importance ?? 5) : null,
        note: c.note ?? null,
      });
    }
  }

  if (payload.removePersonas && payload.removePersonas.length > 0) {
    const allPersonas = await db
      .select()
      .from(personas)
      .where(and(eq(personas.icpId, icpId), eq(personas.workspaceId, workspaceId)));

    for (const toRemove of payload.removePersonas) {
      const match = allPersonas.find(
        (p) => p.name.toLowerCase() === toRemove.name.toLowerCase(),
      );
      if (match) {
        await db.delete(personas).where(eq(personas.id, match.id));
      }
    }
  }

  if (payload.addPersonas && payload.addPersonas.length > 0) {
    for (const p of payload.addPersonas) {
      await db.insert(personas).values({
        workspaceId,
        icpId,
        name: p.name,
        description: p.description || null,
      });
    }
  }

  // Bump version + create snapshot
  const newVersion = icp.version + 1;
  await db.update(icps).set({ version: newVersion, updatedAt: new Date() }).where(eq(icps.id, icpId));

  const currentCriteria = await db.select().from(criteria).where(eq(criteria.icpId, icpId));
  const currentPersonas = await db.select().from(personas).where(eq(personas.icpId, icpId));

  await db.insert(icpSnapshots).values({
    workspaceId,
    icpId,
    version: newVersion,
    snapshotData: {
      schemaVersion: 1,
      icp: { name: payload.name ?? icp.name, description: payload.description ?? icp.description, status: icp.status },
      criteria: currentCriteria.map((c) => ({
        group: c.group, category: c.category, operator: c.operator,
        value: c.value, intent: c.intent, weight: c.weight, note: c.note,
      })),
      personas: currentPersonas.map((p) => ({ name: p.name, description: p.description })),
      signals: [],
      stats: {
        qualifyCount: currentCriteria.filter((c) => c.intent === "qualify").length,
        excludeCount: currentCriteria.filter((c) => c.intent === "exclude").length,
        personaCount: currentPersonas.length,
        signalCount: 0, dealCount: 0, wonCount: 0, lostCount: 0,
      },
    },
    changeSummary: "Updated via AI suggestion",
    source: "agent",
    tags: ["agent-generated"],
  });
}

export async function applyCreateSegment(
  workspaceId: string,
  payload: CreateSegmentPayload,
): Promise<{ segmentId: string }> {
  const [segment] = await db
    .insert(segments)
    .values({
      workspaceId,
      icpId: payload.icpId,
      name: payload.name,
      description: payload.description || null,
      logicJson: payload.logicJson ?? {},
      status: "draft",
      priorityScore: payload.priorityScore ?? 5,
    })
    .returning();

  return { segmentId: segment.id };
}
