"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ShieldCheck,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { advanceOnboarding } from "@/actions/onboarding";

type RevealProps = {
  product: {
    companyName: string | null;
    productDescription: string;
    coreUseCases: string[];
    keyValueProps: string[];
    industriesFocus: string[];
    geoFocus: string[];
  };
  icp: {
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
};

const INTENT_CONFIG = {
  qualify: { icon: CheckCircle2, label: "Good fit", color: "text-green-600" },
  risk: { icon: AlertTriangle, label: "Risk", color: "text-yellow-600" },
  exclude: { icon: Ban, label: "Exclude", color: "text-red-600" },
};

export function StepReveal({ product, icp }: RevealProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAction(redirect?: string) {
    startTransition(async () => {
      await advanceOnboarding(3);
      if (redirect) {
        router.push(redirect);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Your GTM profile is ready
        </h2>
        <p className="mt-2 text-muted-foreground">
          iseep created your company profile and first ICP from your context. Everything is editable.
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
          {product.companyName && (
            <p className="text-lg font-semibold">{product.companyName}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {product.productDescription}
          </p>

          {product.coreUseCases.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Use cases</p>
              <div className="flex flex-wrap gap-1.5">
                {product.coreUseCases.map((uc) => (
                  <Badge key={uc} variant="secondary" className="text-xs">
                    {uc}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {product.industriesFocus.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Industries</p>
                <div className="flex flex-wrap gap-1">
                  {product.industriesFocus.map((ind) => (
                    <Badge key={ind} variant="outline" className="text-xs">
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {product.geoFocus.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Regions</p>
                <div className="flex flex-wrap gap-1">
                  {product.geoFocus.map((geo) => (
                    <Badge key={geo} variant="outline" className="text-xs">
                      <Globe className="mr-0.5 h-2.5 w-2.5" />
                      {geo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active ICP */}
      <Card className="border-primary/30 bg-primary/[0.02]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              {icp.name}
            </CardTitle>
            <Badge className="bg-green-500/10 text-green-700 border-green-200">
              Active
            </Badge>
          </div>
          {icp.description && (
            <p className="text-sm text-muted-foreground">{icp.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Qualify criteria */}
          {icp.qualifyCriteria.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-green-600 mb-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Good fit signals ({icp.qualifyCriteria.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {icp.qualifyCriteria.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-green-500/5">
                    {c.category}: {c.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Risk criteria */}
          {icp.riskCriteria.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 mb-1.5">
                <AlertTriangle className="h-3 w-3" />
                Risk flags ({icp.riskCriteria.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {icp.riskCriteria.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-yellow-500/5">
                    {c.category}: {c.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Exclude criteria */}
          {icp.excludeCriteria.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 mb-1.5">
                <Ban className="h-3 w-3" />
                Exclusions ({icp.excludeCriteria.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {icp.excludeCriteria.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-red-500/5">
                    {c.category}: {c.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Personas */}
          {icp.personas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                <ShieldCheck className="inline h-3 w-3 mr-0.5" />
                Buyer personas ({icp.personas.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {icp.personas.map((p) => (
                  <Badge key={p.name} variant="secondary" className="text-xs">
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                <p className="text-xs text-muted-foreground">Score real companies against your ICP</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
            onClick={() => !isPending && handleAction(`/icps/${icp.id}`)}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <Pencil className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Review & edit ICP</p>
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
              <Share2 className="h-5 w-5 text-muted-foreground" />
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
