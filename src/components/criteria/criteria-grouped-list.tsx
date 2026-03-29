"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteCriterion } from "@/actions/criteria";
import { CriterionFormDialog } from "@/components/criteria/criterion-form-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertTriangle,
  ShieldOff,
  FileText,
  Bookmark,
} from "lucide-react";
import {
  PROPERTY_OPTIONS,
  KEY_BASICS,
  KEY_BASICS_LABELS,
  weightToStrength,
} from "@/lib/constants";
import { applyCriteriaTemplate, saveCriteriaAsTemplate } from "@/actions/templates";
import { Input } from "@/components/ui/input";

type Criterion = {
  id: string;
  group: string;
  category: string;
  operator: string | null;
  value: string;
  intent: string;
  weight: number | null;
  note: string | null;
  workspaceId: string;
  icpId: string | null;
  personaId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAttributeLabel(category: string): string {
  return PROPERTY_OPTIONS.find((p) => p.category === category)?.label ?? category;
}

const STRENGTH_DISPLAY: Record<string, { label: string; className: string }> = {
  strong: { label: "Strong signal", className: "text-green-600 dark:text-green-400" },
  medium: { label: "Medium signal", className: "text-muted-foreground" },
  weak: { label: "Weak signal", className: "text-muted-foreground/60" },
};

// ─── Signal Row ───────────────────────────────────────────────────────────────

function SignalRow({
  signal,
  showStrength,
  onEdit,
  onDelete,
  isPending,
}: {
  signal: Criterion;
  showStrength: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [showNote, setShowNote] = useState(false);
  const strength = weightToStrength(signal.weight);
  const strengthDisplay = STRENGTH_DISPLAY[strength];

  return (
    <div className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{signal.value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getAttributeLabel(signal.category)}
            {showStrength && strengthDisplay && (
              <> · <span className={strengthDisplay.className}>{strengthDisplay.label}</span></>
            )}
            {signal.note && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setShowNote(!showNote)}
                  className="text-muted-foreground hover:text-foreground underline"
                >
                  why?
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
          <Button variant="ghost" size="icon-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onDelete} disabled={isPending}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
      {showNote && signal.note && (
        <p className="mt-1 text-xs text-muted-foreground italic">{signal.note}</p>
      )}
    </div>
  );
}

// ─── Intent Section ───────────────────────────────────────────────────────────

function IntentSection({
  icon: Icon,
  iconClass,
  title,
  titleClass,
  emptyText,
  signals,
  showStrength,
  onEdit,
  onDelete,
  isPending,
}: {
  icon: typeof Check;
  iconClass: string;
  title: string;
  titleClass?: string;
  emptyText: string;
  signals: Criterion[];
  showStrength: boolean;
  onEdit: (c: Criterion) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <h3 className={`text-sm font-semibold ${titleClass ?? ""}`}>{title}</h3>
        {signals.length > 0 && (
          <span className="text-xs text-muted-foreground">{signals.length}</span>
        )}
      </div>
      {signals.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 py-2">{emptyText}</p>
      ) : (
        <div className="divide-y divide-border/50">
          {signals.map((s) => (
            <SignalRow
              key={s.id}
              signal={s}
              showStrength={showStrength}
              onEdit={() => onEdit(s)}
              onDelete={() => onDelete(s.id)}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type CriteriaTemplateItem = {
  id: string;
  name: string;
  description: string | null;
  idealFitCount: number;
  needsReviewCount: number;
  notFitCount: number;
};

export function CriteriaGroupedList({
  criteria,
  icpId,
  criteriaTemplates = [],
}: {
  criteria: Criterion[];
  icpId: string;
  criteriaTemplates?: CriteriaTemplateItem[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [isPending, startTransition] = useTransition();
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const goodFit = criteria.filter((c) => c.intent === "qualify");
  const risk = criteria.filter((c) => c.intent === "risk");
  const notAFit = criteria.filter((c) => c.intent === "exclude");

  // Completeness
  const existingCategories = new Set(criteria.map((c) => c.category));
  const definedBasics = KEY_BASICS.filter((c) => existingCategories.has(c));
  const missingBasics = KEY_BASICS.filter((c) => !existingCategories.has(c));

  function handleAdd() {
    setEditingCriterion(null);
    setDialogOpen(true);
  }

  function handleEdit(criterion: Criterion) {
    setEditingCriterion(criterion);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCriterion(id);
    });
  }

  return (
    <div className="space-y-6">
      {/* Completeness hint */}
      {criteria.length > 0 && missingBasics.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ICP completeness: {definedBasics.length} of {KEY_BASICS.length} basics defined
          <> · Consider adding: {missingBasics.map((c) => KEY_BASICS_LABELS[c]).join(", ")}</>
        </p>
      )}

      {/* Signals by intent */}
      <div className="rounded-lg border divide-y">
        {/* Good fit */}
        <div className="px-4 py-4">
          <IntentSection
            icon={Check}
            iconClass="text-green-600"
            title="Good fit"
            signals={goodFit}
            showStrength={true}
            emptyText="No signals yet. Describe what makes a company a good fit."
            onEdit={handleEdit}
            onDelete={handleDelete}
            isPending={isPending}
          />
        </div>

        {/* Risk */}
        <div className="px-4 py-4">
          <IntentSection
            icon={AlertTriangle}
            iconClass="text-amber-500"
            title="Risk"
            signals={risk}
            showStrength={true}
            emptyText="No risk signals yet."
            onEdit={handleEdit}
            onDelete={handleDelete}
            isPending={isPending}
          />
        </div>

        {/* Not a fit */}
        <div className="px-4 py-4">
          <IntentSection
            icon={ShieldOff}
            iconClass="text-destructive"
            title="Not a fit"
            titleClass="text-destructive"
            signals={notAFit}
            showStrength={false}
            emptyText="No exclusion signals yet."
            onEdit={handleEdit}
            onDelete={handleDelete}
            isPending={isPending}
          />
        </div>
      </div>

      {/* Template picker */}
      {templatePickerOpen && criteriaTemplates.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Apply a saved fit-definition starter set and edit it for this ICP. Templates are copied into this ICP and remain editable locally.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {criteriaTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await applyCriteriaTemplate(t.id, icpId);
                    setTemplatePickerOpen(false);
                  });
                }}
                className="flex items-start gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="font-medium">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {[
                      t.idealFitCount > 0 && `${t.idealFitCount} ideal fit`,
                      t.needsReviewCount > 0 && `${t.needsReviewCount} needs review`,
                      t.notFitCount > 0 && `${t.notFitCount} not a fit`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save as template inline */}
      {saveTemplateOpen && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Save the current criteria as a reusable template.
          </p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-sm h-8"
            />
            <Button
              size="sm"
              disabled={templateSaving || !templateName.trim()}
              onClick={async () => {
                setTemplateSaving(true);
                await saveCriteriaAsTemplate(templateName, null, icpId);
                setTemplateSaving(false);
                setTemplateSaved(true);
                setSaveTemplateOpen(false);
                setTemplateName("");
                setTimeout(() => setTemplateSaved(false), 2000);
              }}
            >
              {templateSaving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSaveTemplateOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add signal
        </Button>
        {criteriaTemplates.length > 0 && (
          <Button variant="outline" onClick={() => { setTemplatePickerOpen(!templatePickerOpen); setSaveTemplateOpen(false); }}>
            <FileText className="mr-1.5 h-4 w-4" />
            Use template
          </Button>
        )}
        {criteria.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => { setSaveTemplateOpen(!saveTemplateOpen); setTemplatePickerOpen(false); }}
          >
            <Bookmark className="mr-1 h-3 w-3" />
            {templateSaved ? "Saved!" : "Save as template"}
          </Button>
        )}
      </div>

      {/* Dialog */}
      <CriterionFormDialog
        icpId={icpId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={
          editingCriterion
            ? {
                id: editingCriterion.id,
                group: editingCriterion.group,
                category: editingCriterion.category,
                operator: editingCriterion.operator,
                value: editingCriterion.value,
                intent: editingCriterion.intent,
                weight: editingCriterion.weight,
                note: editingCriterion.note,
              }
            : undefined
        }
      />
    </div>
  );
}
