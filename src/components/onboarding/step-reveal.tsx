"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Target,
  Building2,
  Upload,
  Users,
  Globe,
  Pencil,
  Share2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Link2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { advanceOnboarding } from "@/actions/onboarding";
import { enableCompanySharing } from "@/actions/company-sharing";

type IcpReveal = {
  id: string;
  name: string;
  description: string | null;
  criteriaCount: number;
  personaCount: number;
  qualifyCriteria: Array<{ category: string; value: string }>;
  riskCriteria: Array<{ category: string; value: string }>;
  excludeCriteria: Array<{ category: string; value: string }>;
  personas: Array<{ name: string }>;
};

type RevealProduct = {
  name: string;
  shortDescription: string | null;
  description: string;
  coreUseCases: string[];
  keyValueProps: string[];
  pricingModel: string | null;
  avgTicket: string | null;
};

type RevealProps = {
  company: {
    name: string | null;
    website: string | null;
    description: string | null;
    targetCustomers: string | null;
    industriesFocus: string[];
    geoFocus: string[];
  };
  products: RevealProduct[];
  icps: IcpReveal[];
};

export function StepReveal({ company, products, icps }: RevealProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, startSharing] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleAction(redirect?: string) {
    startTransition(async () => {
      await advanceOnboarding(3);
      if (redirect) {
        router.push(redirect);
      }
    });
  }

  function handleEnableSharing() {
    startSharing(async () => {
      const result = await enableCompanySharing("without_stats", null);
      if (result.success && result.shareToken) {
        const url = `${window.location.origin}/share/company/${result.shareToken}`;
        setShareLink(url);
      }
    });
  }

  async function handleCopyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Your GTM profile is ready
        </h2>
        <p className="mt-2 text-muted-foreground">
          iseep created your company profile, {products.length} product{products.length > 1 ? "s" : ""}, and {icps.length} ICP{icps.length > 1 ? "s" : ""} from your context. Everything is editable.
        </p>
      </div>

      {/* Company Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Company Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.name && (
            <p className="text-lg font-semibold">
              {company.name}
              {company.website && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">{company.website}</span>
              )}
            </p>
          )}
          {company.description && (
            <p className="text-sm text-muted-foreground">{company.description}</p>
          )}
          {company.targetCustomers && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Target customers</p>
              <p className="text-sm">{company.targetCustomers}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {company.industriesFocus.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Industries</p>
                <div className="flex flex-wrap gap-1">
                  {company.industriesFocus.map((ind) => (
                    <Badge key={ind} variant="outline" className="text-xs">{ind}</Badge>
                  ))}
                </div>
              </div>
            )}
            {company.geoFocus.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Regions</p>
                <div className="flex flex-wrap gap-1">
                  {company.geoFocus.map((geo) => (
                    <Badge key={geo} variant="outline" className="text-xs">
                      <Globe className="mr-0.5 h-2.5 w-2.5" />{geo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      {products.length > 0 && products.map((prod, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{prod.name}</CardTitle>
            {prod.shortDescription && (
              <p className="text-sm text-muted-foreground">{prod.shortDescription}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {prod.description && prod.description !== prod.shortDescription && (
              <p className="text-sm text-muted-foreground">{prod.description}</p>
            )}
            <div className="flex flex-wrap gap-3">
              {prod.coreUseCases.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Use cases</p>
                  <div className="flex flex-wrap gap-1">
                    {prod.coreUseCases.map((uc) => (
                      <Badge key={uc} variant="secondary" className="text-xs">{uc}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {prod.keyValueProps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Value props</p>
                  <div className="flex flex-wrap gap-1">
                    {prod.keyValueProps.map((vp) => (
                      <Badge key={vp} variant="outline" className="text-xs">{vp}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(prod.pricingModel || prod.avgTicket) && (
              <p className="text-xs text-muted-foreground">
                {[prod.pricingModel, prod.avgTicket].filter(Boolean).join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Share Link — prominent CTA */}
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="flex items-center gap-4 py-4">
          <Share2 className="h-6 w-6 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Share your company profile</p>
            <p className="text-xs text-muted-foreground">
              Get a public link to share with partners, investors, or your team.
            </p>
          </div>
          {shareLink ? (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-8 items-center rounded-md border bg-background px-2.5 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                {shareLink}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(shareLink, "_blank")}>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableSharing}
              disabled={isSharing}
              className="shrink-0"
            >
              {isSharing ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Link2 className="mr-1 h-3 w-3" />
              )}
              Generate link
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ICPs */}
      {icps.map((icp) => (
        <Card key={icp.id} className="border-green-200/50 bg-green-500/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                {icp.name}
              </CardTitle>
              <Badge className="bg-green-500/10 text-green-700 border-green-200">Active</Badge>
            </div>
            {icp.description && (
              <p className="text-sm text-muted-foreground">{icp.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {icp.qualifyCriteria.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-green-600 mb-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Good fit ({icp.qualifyCriteria.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {icp.qualifyCriteria.slice(0, 6).map((c, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] bg-green-500/5">
                      {c.category}: {c.value}
                    </Badge>
                  ))}
                  {icp.qualifyCriteria.length > 6 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{icp.qualifyCriteria.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {icp.riskCriteria.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 mb-1">
                  <AlertTriangle className="h-3 w-3" />
                  Risk ({icp.riskCriteria.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {icp.riskCriteria.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] bg-yellow-500/5">
                      {c.category}: {c.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {icp.excludeCriteria.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 mb-1">
                  <Ban className="h-3 w-3" />
                  Exclude ({icp.excludeCriteria.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {icp.excludeCriteria.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] bg-red-500/5">
                      {c.category}: {c.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {icp.personas.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {icp.personas.map((p) => (
                  <Badge key={p.name} variant="secondary" className="text-xs">{p.name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Next actions */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">What&apos;s next?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
            onClick={() => !isPending && handleAction("/scoring/upload")}
          >
            <CardContent className="flex items-center gap-3 py-4">
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Upload className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="text-sm font-semibold">Upload leads</p>
                <p className="text-xs text-muted-foreground">Score companies against your ICPs</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
            onClick={() => !isPending && handleAction("/icps")}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <Pencil className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Review & edit ICPs</p>
                <p className="text-xs text-muted-foreground">Fine-tune criteria and personas</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
            onClick={() => !isPending && handleAction("/settings/team")}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Invite team</p>
                <p className="text-xs text-muted-foreground">Collaborate with your team</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
            onClick={() => !isPending && handleAction()}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Explore dashboard</p>
                <p className="text-xs text-muted-foreground">See your workspace overview</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
