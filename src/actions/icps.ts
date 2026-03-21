"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { icps, criteria, personas, signals, segments, icpSnapshots, deals, productRequests } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { icpSchema } from "@/lib/validators";
import type { ActionResult, IcpSnapshotData } from "@/lib/types";

export async function createIcp(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    status: (formData.get("status") as string) || "draft",
    parentIcpId: (formData.get("parentIcpId") as string) || undefined,
  };

  const parsed = icpSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [icp] = await db
    .insert(icps)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      parentIcpId: parsed.data.parentIcpId ?? null,
      createdBy: ctx.userId,
    })
    .returning();

  redirect(`/icps/${icp.id}`);
}

export async function updateIcp(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, id), eq(icps.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    status: (formData.get("status") as string) || existing.status,
    parentIcpId: (formData.get("parentIcpId") as string) || undefined,
  };

  const parsed = icpSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(icps)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      parentIcpId: parsed.data.parentIcpId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(icps.id, id));

  revalidatePath(`/icps/${id}`);
  revalidatePath("/icps");
  return { success: true };
}

export async function deleteIcp(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, id), eq(icps.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  // Null out FK references in tables we don't want to cascade-delete
  await db.update(deals).set({ icpId: null }).where(eq(deals.icpId, id));
  await db.update(productRequests).set({ icpId: null }).where(eq(productRequests.icpId, id));

  // Manual cascade for owned children
  await db.delete(icpSnapshots).where(eq(icpSnapshots.icpId, id));
  await db.delete(segments).where(eq(segments.icpId, id));
  await db.delete(signals).where(eq(signals.icpId, id));
  await db.delete(criteria).where(eq(criteria.icpId, id));
  await db.delete(personas).where(eq(personas.icpId, id));
  await db.delete(icps).where(eq(icps.id, id));

  revalidatePath("/icps");
  redirect("/icps");
}

export async function saveIcpSnapshot(icpId: string, note: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [icp] = await db
    .select()
    .from(icps)
    .where(and(eq(icps.id, icpId), eq(icps.workspaceId, ctx.workspaceId)));
  if (!icp) return { error: "Not found" };

  const icpCriteria = await db.select().from(criteria).where(and(eq(criteria.icpId, icpId), eq(criteria.workspaceId, ctx.workspaceId)));
  const icpPersonas = await db.select().from(personas).where(and(eq(personas.icpId, icpId), eq(personas.workspaceId, ctx.workspaceId)));
  const icpSignals = await db.select().from(signals).where(and(eq(signals.icpId, icpId), eq(signals.workspaceId, ctx.workspaceId)));

  const [dealStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      won: sql<number>`count(*) filter (where outcome = 'won')::int`,
      lost: sql<number>`count(*) filter (where outcome = 'lost')::int`,
    })
    .from(deals)
    .where(eq(deals.icpId, icpId));

  const snapshotData: IcpSnapshotData = {
    schemaVersion: 1,
    icp: { name: icp.name, description: icp.description, status: icp.status },
    criteria: icpCriteria.map((c) => ({
      group: c.group, category: c.category, operator: c.operator,
      value: c.value, intent: c.intent, weight: c.weight, note: c.note,
    })),
    personas: icpPersonas.map((p) => ({ name: p.name, description: p.description })),
    signals: icpSignals.map((s) => ({
      type: s.type, label: s.label, description: s.description, strength: s.strength,
    })),
    stats: {
      qualifyCount: icpCriteria.filter((c) => c.intent === "qualify").length,
      excludeCount: icpCriteria.filter((c) => c.intent === "exclude").length,
      personaCount: icpPersonas.length,
      signalCount: icpSignals.length,
      dealCount: dealStats?.total ?? 0,
      wonCount: dealStats?.won ?? 0,
      lostCount: dealStats?.lost ?? 0,
    },
  };

  const [prevSnapshot] = await db
    .select()
    .from(icpSnapshots)
    .where(eq(icpSnapshots.icpId, icpId))
    .orderBy(sql`${icpSnapshots.version} desc`)
    .limit(1);

  let changeSummary = "Initial version";
  if (prevSnapshot) {
    const prev = prevSnapshot.snapshotData as IcpSnapshotData;
    const parts: string[] = [];
    const critDiff = snapshotData.criteria.length - prev.criteria.length;
    if (critDiff > 0) parts.push(`+${critDiff} criteria`);
    if (critDiff < 0) parts.push(`${critDiff} criteria`);
    const persDiff = snapshotData.personas.length - prev.personas.length;
    if (persDiff > 0) parts.push(`+${persDiff} personas`);
    if (persDiff < 0) parts.push(`${persDiff} personas`);
    const sigDiff = snapshotData.signals.length - prev.signals.length;
    if (sigDiff > 0) parts.push(`+${sigDiff} signals`);
    if (sigDiff < 0) parts.push(`${sigDiff} signals`);
    changeSummary = parts.length > 0 ? parts.join(", ") : "No structural changes";
  }

  const newVersion = icp.version + 1;

  await db.insert(icpSnapshots).values({
    workspaceId: ctx.workspaceId,
    icpId,
    version: newVersion,
    snapshotData,
    changeSummary,
    note: note || null,
    createdBy: ctx.userId,
  });

  await db
    .update(icps)
    .set({ version: newVersion, updatedAt: new Date() })
    .where(eq(icps.id, icpId));

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}
