import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Users,
  Target,
  Lightbulb,
  MapPin,
  Factory,
  ArrowRight,
  BarChart3,
  TrendingUp,
} from "lucide-react";

type IcpCard = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  criteriaCount: number;
  personaCount: number;
  dealStats: { total: number; won: number; lost: number; open: number };
};

type Product = {
  companyName: string | null;
  website: string | null;
  productDescription: string;
  targetCustomers: string | null;
  coreUseCases: string[];
  keyValueProps: string[];
  industriesFocus: string[];
  geoFocus: string[];
};

type CompanyProfile = {
  workspace: { name: string; shareMode: string | null };
  product: Product | null;
  icps: IcpCard[];
  showStats: boolean;
};

export function PublicCompanyProfile({
  profile,
  shareToken,
}: {
  profile: CompanyProfile;
  shareToken: string;
}) {
  const { product, icps, showStats } = profile;
  const companyName = product?.companyName ?? profile.workspace.name;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{companyName}</h1>
        {product?.website && (
          <p className="text-sm text-muted-foreground">
            <Globe className="mr-1 inline h-3.5 w-3.5" />
            {product.website}
          </p>
        )}
        {product?.productDescription && (
          <p className="max-w-3xl text-muted-foreground leading-relaxed">
            {product.productDescription}
          </p>
        )}
      </section>

      {/* Product Overview */}
      {product && (
        <section className="grid gap-4 sm:grid-cols-2">
          {/* Who we help */}
          {product.targetCustomers && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4 text-primary" />
                  Who we help
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {product.targetCustomers}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Core use cases */}
          {product.coreUseCases.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Core use cases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {product.coreUseCases.map((uc, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground before:mr-2 before:content-['•']"
                    >
                      {uc}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Industries */}
          {product.industriesFocus.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Factory className="h-4 w-4 text-primary" />
                  Industries in focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {product.industriesFocus.map((ind, i) => (
                    <Badge key={i} variant="secondary">
                      {ind}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regions */}
          {product.geoFocus.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  Regions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {product.geoFocus.map((geo, i) => (
                    <Badge key={i} variant="outline">
                      {geo}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Value props */}
          {product.keyValueProps.length > 0 && (
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Why companies choose us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {product.keyValueProps.map((vp, i) => (
                    <div
                      key={i}
                      className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      {vp}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ICPs Section */}
      {icps.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Users className="h-5 w-5" />
              Ideal Customer Profiles
            </h2>
            <p className="text-sm text-muted-foreground">
              The types of companies we work best with
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {icps.map((icp) => {
              const winRate =
                icp.dealStats.won + icp.dealStats.lost > 0
                  ? Math.round(
                      (icp.dealStats.won /
                        (icp.dealStats.won + icp.dealStats.lost)) *
                        100,
                    )
                  : null;

              return (
                <Link
                  key={icp.id}
                  href={`/share/company/${shareToken}/${icp.id}`}
                  className="group"
                >
                  <Card className="h-full transition-colors group-hover:border-primary/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{icp.name}</CardTitle>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      {icp.description && (
                        <CardDescription className="line-clamp-2">
                          {icp.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{icp.criteriaCount} criteria</span>
                        <span className="text-border">|</span>
                        <span>{icp.personaCount} personas</span>
                        {showStats && icp.dealStats.total > 0 && (
                          <>
                            <span className="text-border">|</span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              {icp.dealStats.total} deals
                              {winRate != null && ` (${winRate}% win)`}
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!product && icps.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          This company profile is not yet configured.
        </div>
      )}
    </div>
  );
}
