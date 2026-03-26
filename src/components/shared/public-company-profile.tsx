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
  Package,
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

type ProductWithIcps = {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  coreUseCases: string[];
  keyValueProps: string[];
  icps: IcpCard[];
};

type CompanyProfile = {
  workspace: {
    name: string;
    website: string | null;
    companyDescription: string | null;
    targetCustomers: string | null;
    industriesFocus: string[];
    geoFocus: string[];
    shareMode: string | null;
  };
  products: ProductWithIcps[];
  unlinkedIcps: IcpCard[];
  showStats: boolean;
};

export function PublicCompanyProfile({
  profile,
  shareToken,
}: {
  profile: CompanyProfile;
  shareToken: string;
}) {
  const { workspace, products, unlinkedIcps, showStats } = profile;

  return (
    <div className="space-y-10">
      {/* Company Hero */}
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{workspace.name}</h1>
        {workspace.website && (
          <p className="text-sm text-muted-foreground">
            <Globe className="mr-1 inline h-3.5 w-3.5" />
            {workspace.website}
          </p>
        )}
        {workspace.companyDescription && (
          <p className="max-w-3xl text-muted-foreground leading-relaxed">
            {workspace.companyDescription}
          </p>
        )}
      </section>

      {/* Company Info Cards */}
      {(workspace.targetCustomers || workspace.industriesFocus.length > 0 || workspace.geoFocus.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspace.targetCustomers && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4 text-primary" />
                  Target customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{workspace.targetCustomers}</p>
              </CardContent>
            </Card>
          )}
          {workspace.industriesFocus.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Factory className="h-4 w-4 text-primary" />
                  Industries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {workspace.industriesFocus.map((ind, i) => (
                    <Badge key={i} variant="secondary">{ind}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {workspace.geoFocus.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  Regions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {workspace.geoFocus.map((geo, i) => (
                    <Badge key={i} variant="outline">{geo}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Products → ICPs */}
      {products.map((product) => (
        <section key={product.id} className="space-y-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Package className="h-5 w-5 text-primary" />
              {product.name}
            </h2>
            {product.description && (
              <p className="text-sm text-muted-foreground max-w-3xl">{product.description}</p>
            )}
          </div>

          {/* Product details */}
          {(product.coreUseCases.length > 0 || product.keyValueProps.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {product.coreUseCases.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Use cases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {product.coreUseCases.map((uc, i) => (
                        <li key={i} className="text-sm text-muted-foreground before:mr-2 before:content-['•']">{uc}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {product.keyValueProps.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Value propositions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {product.keyValueProps.map((vp, i) => (
                        <Badge key={i} variant="secondary">{vp}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ICPs for this product */}
          {product.icps.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Users className="h-4 w-4" />
                Ideal Customer Profiles
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.icps.map((icp) => (
                  <IcpCardView key={icp.id} icp={icp} shareToken={shareToken} showStats={showStats} />
                ))}
              </div>
            </div>
          )}

          {product.icps.length === 0 && (
            <p className="text-sm text-muted-foreground">No ICPs defined for this product yet.</p>
          )}
        </section>
      ))}

      {/* Unlinked ICPs (legacy) */}
      {unlinkedIcps.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Users className="h-5 w-5" />
            Ideal Customer Profiles
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {unlinkedIcps.map((icp) => (
              <IcpCardView key={icp.id} icp={icp} shareToken={shareToken} showStats={showStats} />
            ))}
          </div>
        </section>
      )}

      {products.length === 0 && unlinkedIcps.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          This company profile is not yet configured.
        </div>
      )}
    </div>
  );
}

function IcpCardView({ icp, shareToken, showStats }: { icp: IcpCard; shareToken: string; showStats: boolean }) {
  const winRate =
    icp.dealStats.won + icp.dealStats.lost > 0
      ? Math.round((icp.dealStats.won / (icp.dealStats.won + icp.dealStats.lost)) * 100)
      : null;

  return (
    <Link href={`/share/company/${shareToken}/${icp.id}`} className="group">
      <Card className="h-full transition-colors group-hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{icp.name}</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
          {icp.description && (
            <CardDescription className="line-clamp-2">{icp.description}</CardDescription>
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
}
