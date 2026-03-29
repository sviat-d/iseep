"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/db";
import { personaTemplates, criteriaTemplates, criteria } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ActionResult } from "@/lib/types";

// ─── Persona Templates ─────────────────────────────────────────────────────

export async function savePersonaAsTemplate(formData: FormData): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Template name is required" };

  await db.insert(personaTemplates).values({
    workspaceId: ctx.workspaceId,
    name,
    description: (formData.get("description") as string)?.trim() || null,
    goals: (formData.get("goals") as string)?.trim() || null,
    painPoints: (formData.get("painPoints") as string)?.trim() || null,
    triggers: (formData.get("triggers") as string)?.trim() || null,
    decisionCriteria: (formData.get("decisionCriteria") as string)?.trim() || null,
    objections: (formData.get("objections") as string)?.trim() || null,
    desiredOutcome: (formData.get("desiredOutcome") as string)?.trim() || null,
    createdBy: ctx.userId,
  });

  return { success: true };
}

export async function getPersonaTemplates(workspaceId: string) {
  return db
    .select()
    .from(personaTemplates)
    .where(eq(personaTemplates.workspaceId, workspaceId))
    .orderBy(personaTemplates.name);
}

export async function deletePersonaTemplate(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .delete(personaTemplates)
    .where(and(eq(personaTemplates.id, id), eq(personaTemplates.workspaceId, ctx.workspaceId)));

  return { success: true };
}

// ─── Criteria Templates ─────────────────────────────────────────────────────

type CriterionData = {
  group: string;
  category: string;
  operator: string | null;
  value: string;
  intent: string;
  weight: number | null;
  note: string | null;
};

export async function saveCriteriaAsTemplate(
  name: string,
  description: string | null,
  icpId: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  if (!name.trim()) return { error: "Template name is required" };

  // Read current ICP criteria
  const icpCriteria = await db
    .select({
      group: criteria.group,
      category: criteria.category,
      operator: criteria.operator,
      value: criteria.value,
      intent: criteria.intent,
      weight: criteria.weight,
      note: criteria.note,
    })
    .from(criteria)
    .where(and(eq(criteria.icpId, icpId), eq(criteria.workspaceId, ctx.workspaceId)));

  if (icpCriteria.length === 0) return { error: "No criteria to save" };

  const idealFit = icpCriteria.filter((c) => c.intent === "qualify");
  const needsReview = icpCriteria.filter((c) => c.intent === "risk");
  const notFit = icpCriteria.filter((c) => c.intent === "exclude");

  await db.insert(criteriaTemplates).values({
    workspaceId: ctx.workspaceId,
    name: name.trim(),
    description: description?.trim() || null,
    criteriaData: { idealFit, needsReview, notFit },
    createdBy: ctx.userId,
  });

  return { success: true };
}

export async function getCriteriaTemplates(workspaceId: string) {
  return db
    .select()
    .from(criteriaTemplates)
    .where(eq(criteriaTemplates.workspaceId, workspaceId))
    .orderBy(criteriaTemplates.name);
}

export async function applyCriteriaTemplate(
  templateId: string,
  icpId: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const [template] = await db
    .select()
    .from(criteriaTemplates)
    .where(and(eq(criteriaTemplates.id, templateId), eq(criteriaTemplates.workspaceId, ctx.workspaceId)));

  if (!template) return { error: "Template not found" };

  const data = template.criteriaData as {
    idealFit: CriterionData[];
    needsReview: CriterionData[];
    notFit: CriterionData[];
  };

  const allCriteria = [
    ...(data.idealFit ?? []),
    ...(data.needsReview ?? []),
    ...(data.notFit ?? []),
  ];

  if (allCriteria.length === 0) return { error: "Template is empty" };

  await db.insert(criteria).values(
    allCriteria.map((c) => ({
      workspaceId: ctx.workspaceId,
      icpId,
      group: c.group as "firmographic" | "technographic" | "behavioral" | "compliance" | "keyword",
      category: c.category,
      operator: c.operator as "equals" | "contains" | "gt" | "lt" | "in" | "not_in" | null,
      value: c.value,
      intent: c.intent as "qualify" | "risk" | "exclude",
      weight: c.weight,
      note: c.note,
    })),
  );

  revalidatePath(`/icps/${icpId}`);
  return { success: true };
}

export async function deleteCriteriaTemplate(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  await db
    .delete(criteriaTemplates)
    .where(and(eq(criteriaTemplates.id, id), eq(criteriaTemplates.workspaceId, ctx.workspaceId)));

  return { success: true };
}
