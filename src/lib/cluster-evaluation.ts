import type { InferSelectModel } from "drizzle-orm";
import type { productContext as pcTable, criteria as criteriaTable } from "@/db/schema";

type ProductCtx = InferSelectModel<typeof pcTable>;
type Criterion = InferSelectModel<typeof criteriaTable>;

export type ClusterEvaluation = {
  icpSimilarity: "high" | "medium" | "low" | "none";
  productFit: "high" | "medium" | "low" | "none" | "unknown";
  explanation: string;
  productFitReason?: string;
};

export function evaluateCluster(
  clusterIndustry: string,
  clusterCountries: string[],
  existingCriteria: Criterion[],
  productCtx: ProductCtx | null
): ClusterEvaluation {
  // --- ICP Similarity ---
  const industryValues = existingCriteria
    .filter((c) => c.category === "industry" && c.intent === "qualify")
    .flatMap((c) => c.value.split(",").map((v) => v.trim().toLowerCase()));

  const regionValues = existingCriteria
    .filter((c) => (c.category === "region" || c.category === "country") && c.intent === "qualify")
    .flatMap((c) => c.value.split(",").map((v) => v.trim().toLowerCase()));

  const clusterLower = clusterIndustry.toLowerCase();
  const clusterCountriesLower = clusterCountries.map((c) => c.toLowerCase());

  let icpScore = 0;
  // Industry overlap
  if (industryValues.some((v) => v.includes(clusterLower) || clusterLower.includes(v))) {
    icpScore += 3;
  }
  // Geo overlap
  const geoOverlap = clusterCountriesLower.some((c) =>
    regionValues.some((r) => r.includes(c) || c.includes(r))
  );
  if (geoOverlap) icpScore += 2;

  let icpSimilarity: ClusterEvaluation["icpSimilarity"];
  if (icpScore >= 4) icpSimilarity = "high";
  else if (icpScore >= 2) icpSimilarity = "medium";
  else if (icpScore >= 1) icpSimilarity = "low";
  else icpSimilarity = "none";

  // --- Product Fit ---
  if (!productCtx) {
    return {
      icpSimilarity,
      productFit: "unknown",
      explanation: `${clusterCountries.length > 0 ? clusterCountries.slice(0, 2).join(", ") + " " : ""}${clusterIndustry} companies not in your current ICPs.`,
    };
  }

  let productScore = 0;
  const productReasons: string[] = [];

  const productDesc = productCtx.productDescription.toLowerCase();
  const targetDesc = (productCtx.targetCustomers ?? "").toLowerCase();
  const useCases = ((productCtx.coreUseCases ?? []) as string[]).map((s) => s.toLowerCase());
  const focusIndustries = ((productCtx.industriesFocus ?? []) as string[]).map((s) => s.toLowerCase());
  const focusGeo = ((productCtx.geoFocus ?? []) as string[]).map((s) => s.toLowerCase());

  // Industry in focus
  if (focusIndustries.some((fi) => fi.includes(clusterLower) || clusterLower.includes(fi))) {
    productScore += 3;
    productReasons.push(`${clusterIndustry} is in your focus industries`);
  }

  // Industry mentioned in product/target description
  if (productDesc.includes(clusterLower) || targetDesc.includes(clusterLower)) {
    productScore += 2;
    productReasons.push(`${clusterIndustry} appears in your product description`);
  }

  // Geo overlap
  if (focusGeo.length > 0 && clusterCountriesLower.some((c) =>
    focusGeo.some((g) => g.includes(c) || c.includes(g))
  )) {
    productScore += 1;
    productReasons.push("Geographic overlap with your focus regions");
  }

  // Use case heuristics
  const paymentKeywords = ["payment", "payout", "settlement", "transaction", "billing", "subscription"];
  const hasPaymentUseCase = useCases.some((uc) => paymentKeywords.some((kw) => uc.includes(kw)));
  const clusterSuggestsPayments = ["fintech", "igaming", "ecommerce", "e-commerce", "payments", "crypto", "affiliate", "lending", "banking"].includes(clusterLower);
  if (hasPaymentUseCase && clusterSuggestsPayments) {
    productScore += 2;
    productReasons.push("Industry typically has strong payment/payout needs");
  }

  let productFit: ClusterEvaluation["productFit"];
  if (productScore >= 5) productFit = "high";
  else if (productScore >= 3) productFit = "medium";
  else if (productScore >= 1) productFit = "low";
  else productFit = "none";

  const explanation = productReasons.length > 0
    ? productReasons.join(". ") + "."
    : `${clusterIndustry} companies not in your ICPs -- no clear product-fit signals detected.`;

  return {
    icpSimilarity,
    productFit,
    explanation,
    productFitReason: productReasons.length > 0 ? productReasons[0] : undefined,
  };
}
