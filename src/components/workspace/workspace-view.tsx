"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Target,
  Users,
  Radio,
  Lightbulb,
  Briefcase,
  Plus,
  ArrowRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type WorkspaceProduct = {
  id: string;
  name: string;
  shortDescription: string | null;
  icpCount: number;
};

type WorkspaceIcp = {
  id: string;
  name: string;
  status: string;
  version: number;
  updatedAt: Date;
  personaCount: number;
  signalCount: number;
  criteriaCount: number;
  hypothesisCount: number;
  caseCount: number;
  products: { id: string; name: string }[];
};

type WorkspacePersona = {
  id: string;
  name: string;
  description: string | null;
  icpCount: number;
};

type WorkspaceSignal = {
  id: string;
  label: string;
  type: string;
  strength: number | null;
  icpId: string | null;
  icpName: string;
};

type HypothesisPreview = {
  id: string;
  name: string;
  status: string;
  icpId: string;
  icpName: string;
  productIds: unknown;
  recipients: number | null;
  sqls: number | null;
  wonDeals: number | null;
  updatedAt: Date;
};

type CasePreview = {
  id: string;
  companyName: string;
  outcome: string;
  icpId: string;
  icpName: string;
  productIds: unknown;
  productId: string | null;
  dealValue: string | null;
  dealType: string | null;
  hypothesisId: string | null;
  updatedAt: Date;
};

export type WorkspaceViewProps = {
  products: WorkspaceProduct[];
  icps: WorkspaceIcp[];
  personas: WorkspacePersona[];
  signals: WorkspaceSignal[];
  hypotheses: HypothesisPreview[];
  cases: CasePreview[];
  productMap: Map<string, string>;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

const hypothesisStatusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  validated: "default",
  testing: "secondary",
  draft: "outline",
  rejected: "destructive",
};

const outcomeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  won: "default",
  lost: "destructive",
  in_progress: "secondary",
};

const SIGNAL_DOT: Record<string, string> = {
  positive: "bg-emerald-500",
  negative: "bg-red-500",
  neutral: "bg-muted-foreground/40",
};

function strengthLabel(strength: number | null): string | null {
  if (strength == null) return null;
  if (strength >= 8) return "Strong";
  if (strength >= 4) return "Medium";
  return "Weak";
}

function resolveProductNames(
  productIds: unknown,
  legacyProductId: string | null | undefined,
  productMap: Map<string, string>,
): string[] {
  const ids = Array.isArray(productIds) ? (productIds as string[]) : [];
  const resolved = ids.length > 0 ? ids : legacyProductId ? [legacyProductId] : [];
  return resolved.map((id) => productMap.get(id) ?? "Unknown").filter(Boolean);
}

function metricSummary(h: HypothesisPreview): string | null {
  const parts: string[] = [];
  if (h.recipients && h.recipients > 0) parts.push(`${h.recipients} sent`);
  if (h.sqls && h.sqls > 0) parts.push(`${h.sqls} SQLs`);
  if (h.wonDeals && h.wonDeals > 0) parts.push(`${h.wonDeals} won`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// ─── Shared chip ────────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground leading-none">
      {children}
    </span>
  );
}

// ─── Stat pill (compact count) ──────────────────────────────────────────────

function Stat({ n, label }: { n: number; label: string }) {
  if (n === 0) return null;
  return <span className="text-[11px] text-muted-foreground">{n} {label}</span>;
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
  href,
  linkText,
  secondary,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  href?: string;
  linkText?: string;
  secondary?: boolean;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${secondary ? "text-muted-foreground/50" : "text-muted-foreground"}`} />
        <h2 className={`font-semibold ${secondary ? "text-sm text-muted-foreground" : "text-base"}`}>{title}</h2>
        <span className="text-[11px] text-muted-foreground/60">{count}</span>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {linkText ?? "View all"} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ─── Empty Section ──────────────────────────────────────────────────────────

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 py-5 text-center text-xs text-muted-foreground/70">
      {message}
    </div>
  );
}

// ─── Product Card ───────────────────────────────────────────────────────────

function ProductCard({ product }: { product: WorkspaceProduct }) {
  return (
    <Card size="sm" className="transition-colors hover:ring-foreground/20">
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        {product.shortDescription && (
          <CardDescription className="line-clamp-1 text-xs">
            {product.shortDescription}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <span className="text-[11px] text-muted-foreground">
          {product.icpCount} {product.icpCount === 1 ? "ICP" : "ICPs"}
        </span>
      </CardContent>
    </Card>
  );
}

// ─── ICP Card ───────────────────────────────────────────────────────────────

function IcpCard({ icp }: { icp: WorkspaceIcp }) {
  return (
    <Card size="sm" className="transition-colors hover:ring-foreground/20">
      <CardHeader>
        <CardTitle>
          <Link href={`/icps/${icp.id}`} className="hover:underline">
            {icp.name}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Badge variant={statusVariant[icp.status] ?? "outline"}>
            {icp.status}
          </Badge>
          {icp.version > 1 && (
            <span className="text-[10px] text-muted-foreground/50">v{icp.version}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {icp.products.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {icp.products.map((p) => (
              <Chip key={p.id}>{p.name}</Chip>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-x-2.5 gap-y-0">
          <Stat n={icp.criteriaCount} label="criteria" />
          <Stat n={icp.personaCount} label="personas" />
          <Stat n={icp.signalCount} label="signals" />
          <Stat n={icp.hypothesisCount} label="hypotheses" />
          <Stat n={icp.caseCount} label="cases" />
        </div>
        <p className="text-[10px] text-muted-foreground/40">
          {timeAgo(icp.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Persona Card ───────────────────────────────────────────────────────────

function PersonaCard({ persona }: { persona: WorkspacePersona }) {
  return (
    <Card size="sm" className="transition-colors hover:ring-foreground/20">
      <CardHeader>
        <CardTitle>
          <Link href={`/personas/${persona.id}`} className="hover:underline">
            {persona.name}
          </Link>
        </CardTitle>
        {persona.description && (
          <CardDescription className="line-clamp-1 text-xs">
            {persona.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <span className="text-[11px] text-muted-foreground">
          {persona.icpCount === 0
            ? "Not linked"
            : `Used in ${persona.icpCount} ${persona.icpCount === 1 ? "ICP" : "ICPs"}`}
        </span>
      </CardContent>
    </Card>
  );
}

// ─── Signal Card ────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: WorkspaceSignal }) {
  const strength = strengthLabel(signal.strength);
  return (
    <Card size="sm" className="transition-colors hover:ring-foreground/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${SIGNAL_DOT[signal.type] ?? SIGNAL_DOT.neutral}`} />
          {signal.label}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          {strength && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{strength}</Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Chip>{signal.icpName}</Chip>
      </CardContent>
    </Card>
  );
}

// ─── Hypothesis Preview Card ────────────────────────────────────────────────

function HypothesisPreviewCard({
  hypothesis,
  productMap,
}: {
  hypothesis: HypothesisPreview;
  productMap: Map<string, string>;
}) {
  const productNames = resolveProductNames(hypothesis.productIds, undefined, productMap);
  const metrics = metricSummary(hypothesis);

  return (
    <Card size="sm" className="transition-colors hover:ring-foreground/20">
      <CardHeader>
        <CardTitle className="truncate">
          <Link href={`/icps/${hypothesis.icpId}`} className="hover:underline">
            {hypothesis.name}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Badge variant={hypothesisStatusVariant[hypothesis.status] ?? "outline"}>
            {hypothesis.status}
          </Badge>
          <Chip>{hypothesis.icpName}</Chip>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {productNames.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {productNames.map((name) => <Chip key={name}>{name}</Chip>)}
          </div>
        )}
        {metrics && (
          <p className="text-[11px] text-muted-foreground">{metrics}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Case Preview Card ──────────────────────────────────────────────────────

function CasePreviewCard({
  caseItem,
  productMap,
}: {
  caseItem: CasePreview;
  productMap: Map<string, string>;
}) {
  const productNames = resolveProductNames(caseItem.productIds, caseItem.productId, productMap);

  return (
    <Card size="sm" className="transition-colors hover:ring-foreground/20">
      <CardHeader>
        <CardTitle className="truncate">
          <Link href={`/icps/${caseItem.icpId}`} className="hover:underline">
            {caseItem.companyName}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Badge variant={outcomeVariant[caseItem.outcome] ?? "outline"}>
            {caseItem.outcome === "in_progress" ? "In progress" : caseItem.outcome}
          </Badge>
          <Chip>{caseItem.icpName}</Chip>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        {productNames.length > 0 && <Chip>{productNames[0]}</Chip>}
        {caseItem.dealValue && (
          <span className="text-[11px] font-medium text-muted-foreground">
            ${Number(caseItem.dealValue).toLocaleString()}
            {caseItem.dealType ? ` ${caseItem.dealType.toUpperCase()}` : ""}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Workspace View ────────────────────────────────────────────────────

export function WorkspaceView({
  products,
  icps,
  personas,
  signals,
  hypotheses,
  cases,
  productMap,
}: WorkspaceViewProps) {
  if (products.length === 0 && icps.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to iseep</h1>
            <p className="mt-2 text-muted-foreground">
              Start by creating your first product, then define Ideal Customer Profiles to organize your GTM strategy.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/icps/new"
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-6 text-center transition-colors hover:bg-muted"
            >
              <Target className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Create ICP</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Define your ideal customer step by step
                </p>
              </div>
            </Link>
            <Link
              href="/icps/import"
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-6 text-center transition-colors hover:bg-muted"
            >
              <Lightbulb className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Import from text</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paste a description or upload a document
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>

      {/* ── PRIMARY: Products ─────────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Package} title="Products" count={products.length} />
        {products.length === 0 ? (
          <EmptySection message="No products yet. Add your first product to get started." />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            <Link
              href="/icps"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/50 py-6 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add product
            </Link>
          </div>
        )}
      </section>

      {/* ── PRIMARY: ICPs ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={Target}
          title="ICPs"
          count={icps.length}
          href="/icps/new"
          linkText="Create new"
        />
        {icps.length === 0 ? (
          <EmptySection message="No ICPs defined yet." />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {icps.map((icp) => (
              <IcpCard key={icp.id} icp={icp} />
            ))}
          </div>
        )}
      </section>

      {/* ── PRIMARY: Personas + Signals side by side ──────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader icon={Users} title="Personas" count={personas.length} />
          {personas.length === 0 ? (
            <EmptySection message="No personas yet." />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {personas.map((p) => (
                <PersonaCard key={p.id} persona={p} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader icon={Radio} title="Signals" count={signals.length} />
          {signals.length === 0 ? (
            <EmptySection message="No signals yet." />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {signals.map((s) => (
                <SignalCard key={s.id} signal={s} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── SECONDARY ─────────────────────────────────────────────────── */}
      {(hypotheses.length > 0 || cases.length > 0) && (
        <div className="border-t pt-5 space-y-5">
          {hypotheses.length > 0 && (
            <section>
              <SectionHeader
                icon={Lightbulb}
                title="Recent Hypotheses"
                count={hypotheses.length}
                secondary
              />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {hypotheses.map((h) => (
                  <HypothesisPreviewCard key={h.id} hypothesis={h} productMap={productMap} />
                ))}
              </div>
            </section>
          )}

          {cases.length > 0 && (
            <section>
              <SectionHeader
                icon={Briefcase}
                title="Recent Cases"
                count={cases.length}
                secondary
              />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {cases.map((c) => (
                  <CasePreviewCard key={c.id} caseItem={c} productMap={productMap} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
