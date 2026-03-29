"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { personas, criteria, icpPersonaLinks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth";
import { personaSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

function extractPersonaFields(formData: FormData) {
  return {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    goals: (formData.get("goals") as string) || undefined,
    painPoints: (formData.get("painPoints") as string) || undefined,
    triggers: (formData.get("triggers") as string) || undefined,
    decisionCriteria: (formData.get("decisionCriteria") as string) || undefined,
    objections: (formData.get("objections") as string) || undefined,
    desiredOutcome: (formData.get("desiredOutcome") as string) || undefined,
  };
}

/** Create a new persona in the library and optionally link to an ICP */
export async function createPersona(formData: FormData): Promise<ActionResult & { personaId?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const icpId = (formData.get("icpId") as string) || undefined;
  const raw = { ...extractPersonaFields(formData), icpId };

  const parsed = personaSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [created] = await db.insert(personas).values({
    workspaceId: ctx.workspaceId,
    icpId: parsed.data.icpId ?? null, // legacy field — nullable
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    goals: parsed.data.goals ?? null,
    painPoints: parsed.data.painPoints ?? null,
    triggers: parsed.data.triggers ?? null,
    decisionCriteria: parsed.data.decisionCriteria ?? null,
    objections: parsed.data.objections ?? null,
    desiredOutcome: parsed.data.desiredOutcome ?? null,
  }).returning({ id: personas.id });

  // Also create link in icp_persona_links if ICP provided
  if (parsed.data.icpId) {
    await db.insert(icpPersonaLinks).values({
      workspaceId: ctx.workspaceId,
      icpId: parsed.data.icpId,
      personaId: created.id,
    });
  }

  if (parsed.data.icpId) revalidatePath(`/icps/${parsed.data.icpId}`);
  revalidatePath("/icps");
  return { success: true, personaId: created.id };
}

export async function updatePersona(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  const raw = {
    ...extractPersonaFields(formData),
    icpId: existing.icpId ?? undefined,
  };

  const parsed = personaSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(personas)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      goals: parsed.data.goals ?? null,
      painPoints: parsed.data.painPoints ?? null,
      triggers: parsed.data.triggers ?? null,
      decisionCriteria: parsed.data.decisionCriteria ?? null,
      objections: parsed.data.objections ?? null,
      desiredOutcome: parsed.data.desiredOutcome ?? null,
      updatedAt: new Date(),
    })
    .where(eq(personas.id, id));

  // Revalidate all linked ICPs
  const links = await db
    .select({ icpId: icpPersonaLinks.icpId })
    .from(icpPersonaLinks)
    .where(eq(icpPersonaLinks.personaId, id));
  for (const link of links) {
    revalidatePath(`/icps/${link.icpId}`);
  }
  if (existing.icpId) revalidatePath(`/icps/${existing.icpId}`);
  revalidatePath("/icps");
  return { success: true };
}

export async function deletePersona(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.workspaceId, ctx.workspaceId)));
  if (!existing) return { error: "Not found" };

  // Clean up links, criteria, then persona
  await db.delete(icpPersonaLinks).where(eq(icpPersonaLinks.personaId, id));
  await db.delete(criteria).where(eq(criteria.personaId, id));
  await db.delete(personas).where(eq(personas.id, id));

  if (existing.icpId) revalidatePath(`/icps/${existing.icpId}`);
  revalidatePath("/icps");
  return { success: true };
}

// ─── Link operations ────────────────────────────────────────────────────────

/** Attach an existing persona from the library to an ICP */
export async function linkPersonaToIcp(personaId: string, icpId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Check if already linked
  const [existing] = await db
    .select({ id: icpPersonaLinks.id })
    .from(icpPersonaLinks)
    .where(and(eq(icpPersonaLinks.personaId, personaId), eq(icpPersonaLinks.icpId, icpId)));
  if (existing) return { success: true }; // already linked

  await db.insert(icpPersonaLinks).values({
    workspaceId: ctx.workspaceId,
    icpId,
    personaId,
  });

  revalidatePath(`/icps/${icpId}`);
  revalidatePath("/icps");
  return { success: true };
}

/** Detach a persona from an ICP (does not delete the persona) */
export async function unlinkPersonaFromIcp(personaId: string, icpId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .delete(icpPersonaLinks)
    .where(
      and(
        eq(icpPersonaLinks.personaId, personaId),
        eq(icpPersonaLinks.icpId, icpId),
        eq(icpPersonaLinks.workspaceId, ctx.workspaceId),
      ),
    );

  revalidatePath(`/icps/${icpId}`);
  revalidatePath("/icps");
  return { success: true };
}

/** Save ICP-specific override data for a persona */
export async function customizePersonaForIcp(
  personaId: string,
  icpId: string,
  overrideData: Record<string, string>,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Find or create the link
  const [link] = await db
    .select({ id: icpPersonaLinks.id })
    .from(icpPersonaLinks)
    .where(
      and(
        eq(icpPersonaLinks.personaId, personaId),
        eq(icpPersonaLinks.icpId, icpId),
        eq(icpPersonaLinks.workspaceId, ctx.workspaceId),
      ),
    );

  if (link) {
    await db
      .update(icpPersonaLinks)
      .set({ overrideData })
      .where(eq(icpPersonaLinks.id, link.id));
  } else {
    await db.insert(icpPersonaLinks).values({
      workspaceId: ctx.workspaceId,
      icpId,
      personaId,
      overrideData,
    });
  }

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

/** Count how many ICPs use a given persona (via links table) */
export async function getPersonaIcpCount(personaId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(icpPersonaLinks)
    .where(eq(icpPersonaLinks.personaId, personaId));
  return result?.count ?? 0;
}

/** Backfill icp_persona_links from existing personas.icpId for migration */
export async function backfillPersonaLinks(): Promise<ActionResult & { created?: number }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  // Get all personas with icpId set that don't have a link yet
  const personasWithIcp = await db
    .select({ id: personas.id, icpId: personas.icpId })
    .from(personas)
    .where(
      and(
        eq(personas.workspaceId, ctx.workspaceId),
        sql`${personas.icpId} IS NOT NULL`,
        sql`NOT EXISTS (
          SELECT 1 FROM icp_persona_links ipl
          WHERE ipl.persona_id = ${personas.id} AND ipl.icp_id = ${personas.icpId}
        )`,
      ),
    );

  if (personasWithIcp.length === 0) return { success: true, created: 0 };

  await db.insert(icpPersonaLinks).values(
    personasWithIcp.map((p) => ({
      workspaceId: ctx.workspaceId,
      icpId: p.icpId!,
      personaId: p.id,
    })),
  );

  revalidatePath("/icps");
  return { success: true, created: personasWithIcp.length };
}
