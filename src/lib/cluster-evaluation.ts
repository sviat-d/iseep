import type { InferSelectModel } from "drizzle-orm";
import type { productContext as pcTable, criteria as criteriaTable } from "@/db/schema";
import { resolveIndustry, hasTag } from "@/lib/taxonomy/lookup";

type ProductCtx = InferSelectModel<typeof pcTable>;
type Criterion = InferSelectModel<typeof criteriaTable>;

export type ClusterEvaluation = {
  icpSimilarity: "high" | "medium" | "low" | "none";
  productFit: "high" | "medium" | "low" | "none" | "unknown";
  explanation: string;
  productFitReason?: string;
  isExcluded?: boolean;
  confidence: "high" | "medium" | "low";
};

// Keywords that signal payment/payout product relevance
const PRODUCT_PAYMENT_KEYWORDS = [
  "payment", "payout", "pay-out", "settlement", "transaction",
  "billing", "subscription", "processing", "merchant", "acquiring",
  "crypto", "blockchain", "wallet", "transfer", "remittance",
  "disbursement", "mass payout", "mass payment", "commission",
  "withdrawal", "deposit", "checkout", "gateway", "processor",
];

// Keywords that signal the cluster might need the product (keyed by taxonomy id)
const INDUSTRY_NEED_SIGNALS: Record<string, string[]> = {
  "creator-platforms": ["mass payouts to creators", "cross-border payments", "multi-currency disbursements"],
  "content-monetization": ["creator payouts", "monetization settlements", "cross-border payments"],
  "affiliate-networks": ["mass commission payouts", "partner payments at scale", "cross-border settlements"],
  "igaming": ["player withdrawals", "mass payouts", "multi-currency processing", "high-risk payment processing"],
  "online-casinos": ["player withdrawals", "mass payouts", "multi-currency processing"],
  "gambling-facilities": ["player withdrawals", "mass payouts", "regulatory compliance for payments"],
  "sports-betting": ["mass payouts", "fast withdrawals", "multi-currency"],
  "e-commerce-platforms": ["merchant settlements", "cross-border payments", "multi-currency checkout"],
  "online-retail": ["merchant settlements", "cross-border payments", "multi-currency checkout"],
  "marketplace": ["seller payouts", "escrow", "split payments", "mass disbursements"],
  "fintech": ["payment infrastructure", "API integrations", "compliance"],
  "saas": ["subscription billing", "recurring payments", "usage-based billing"],
  "payment-processing": ["payment orchestration", "multi-PSP routing", "settlement optimization"],
  "crypto-blockchain": ["fiat on/off ramps", "crypto settlements", "stablecoin payments"],
  "lending": ["loan disbursements", "repayment processing", "collections"],
  "freelance-marketplaces": ["freelancer payouts", "cross-border payments", "multi-currency"],
  "gig-platforms": ["gig worker payouts", "instant settlements", "cross-border"],
  "neobanking": ["card issuing", "payments infrastructure", "multi-currency accounts"],
  "insurance": ["claims disbursements", "premium processing", "multi-currency"],
};

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function textContainsAny(text: string, keywords: string[]): boolean {
  const t = norm(text);
  return keywords.some((kw) => t.includes(norm(kw)));
}

function wordsOverlap(text1: string, text2: string): number {
  const words1 = new Set(norm(text1).split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(norm(text2).split(/\s+/).filter((w) => w.length > 3));
  let overlap = 0;
  for (const w of words1) {
    if (words2.has(w)) overlap++;
  }
  return overlap;
}

export function evaluateCluster(
  clusterIndustry: string,
  clusterCountries: string[],
  clusterLeadCount: number,
  existingCriteria: Criterion[],
  productCtx: ProductCtx | null,
  excludedIndustries?: string[]
): ClusterEvaluation {
  // Check if industry is excluded
  if (excludedIndustries?.some(e => norm(e) === norm(clusterIndustry))) {
    return {
      icpSimilarity: "none",
      productFit: "none",
      explanation: `"${clusterIndustry}" was previously marked as not a fit for your business.`,
      productFitReason: "Excluded by your feedback",
      isExcluded: true,
      confidence: "high",
    };
  }

  const clusterLower = norm(clusterIndustry);
  const clusterCountriesLower = clusterCountries.map(norm);

  // Resolve cluster industry via taxonomy for better matching
  const resolvedNode = resolveIndustry(clusterIndustry);
  const clusterCanonical = resolvedNode?.name.toLowerCase() ?? clusterLower;

  // --- ICP Similarity ---
  const industryValues = existingCriteria
    .filter((c) => c.category === "industry" && c.intent === "qualify")
    .flatMap((c) => c.value.split(",").map(norm));

  const regionValues = existingCriteria
    .filter((c) => (c.category === "region" || c.category === "country") && c.intent === "qualify")
    .flatMap((c) => c.value.split(",").map(norm));

  let icpScore = 0;
  if (industryValues.some((v) => v.includes(clusterCanonical) || clusterCanonical.includes(v))) {
    icpScore += 3;
  }
  if (clusterCountriesLower.some((c) => regionValues.some((r) => r.includes(c) || c.includes(r)))) {
    icpScore += 2;
  }

  let icpSimilarity: ClusterEvaluation["icpSimilarity"];
  if (icpScore >= 4) icpSimilarity = "high";
  else if (icpScore >= 2) icpSimilarity = "medium";
  else if (icpScore >= 1) icpSimilarity = "low";
  else icpSimilarity = "none";

  // --- Product Fit ---
  if (!productCtx) {
    // Confidence without product context — only lead count + ICP similarity
    let noCtxConfScore = 0;
    if (clusterLeadCount >= 5) noCtxConfScore += 2;
    else if (clusterLeadCount >= 3) noCtxConfScore += 1;
    if (icpSimilarity === "high") noCtxConfScore += 1;
    else if (icpSimilarity === "medium") noCtxConfScore += 0.5;
    let noCtxConfidence: "high" | "medium" | "low" = "low";
    if (noCtxConfScore >= 4) noCtxConfidence = "high";
    else if (noCtxConfScore >= 2) noCtxConfidence = "medium";

    return {
      icpSimilarity,
      productFit: "unknown",
      explanation: `${clusterCountries.length > 0 ? clusterCountries.slice(0, 2).join(", ") + " " : ""}${clusterIndustry} companies not in your current ICPs.`,
      confidence: noCtxConfidence,
    };
  }

  let productScore = 0;
  const productReasons: string[] = [];

  const productDesc = norm(productCtx.productDescription);
  const targetDesc = norm(productCtx.targetCustomers ?? "");
  const allProductText = productDesc + " " + targetDesc;
  const useCases = ((productCtx.coreUseCases ?? []) as string[]).map(norm);
  const valueProps = ((productCtx.keyValueProps ?? []) as string[]).map(norm);
  const focusIndustries = ((productCtx.industriesFocus ?? []) as string[]).map(norm);
  const focusGeo = ((productCtx.geoFocus ?? []) as string[]).map(norm);

  // 1. Direct industry match in focus list
  if (focusIndustries.some((fi) => fi.includes(clusterCanonical) || clusterCanonical.includes(fi))) {
    productScore += 4;
    productReasons.push(`"${clusterIndustry}" is in your focus industries`);
  }

  // 2. Industry mentioned in product/target description
  if (allProductText.includes(clusterCanonical)) {
    productScore += 2;
    productReasons.push(`"${clusterIndustry}" mentioned in your product description`);
  }

  // 3. Product is payment/payout related AND cluster is payment-heavy industry
  const productIsPaymentRelated = textContainsAny(allProductText, PRODUCT_PAYMENT_KEYWORDS)
    || useCases.some((uc) => textContainsAny(uc, PRODUCT_PAYMENT_KEYWORDS))
    || valueProps.some((vp) => textContainsAny(vp, PRODUCT_PAYMENT_KEYWORDS));

  if (productIsPaymentRelated && hasTag(clusterIndustry, "payment-heavy")) {
    productScore += 3;
    productReasons.push(`${clusterIndustry} companies typically need payment/payout infrastructure`);
  }

  // 4. Mass payout signal — extra boost if product does payouts AND cluster is mass-payout industry
  const productDoesMassPayouts = textContainsAny(
    allProductText + " " + useCases.join(" ") + " " + valueProps.join(" "),
    ["mass payout", "mass payment", "bulk payout", "disbursement", "payout", "commission", "withdrawal"]
  );

  const needSignals = resolvedNode ? INDUSTRY_NEED_SIGNALS[resolvedNode.id] : undefined;

  if (productDoesMassPayouts && hasTag(clusterIndustry, "mass-payout")) {
    productScore += 3;
    if (needSignals) {
      productReasons.push(`${clusterIndustry} companies need: ${needSignals.slice(0, 2).join(", ")}`);
    } else {
      productReasons.push(`${clusterIndustry} companies typically require mass payouts`);
    }
  }

  // 5. Word overlap between product description and industry need signals
  if (needSignals) {
    const needText = needSignals.join(" ");
    const overlap = wordsOverlap(allProductText + " " + useCases.join(" "), needText);
    if (overlap >= 3) {
      productScore += 2;
      productReasons.push("Strong keyword overlap between your product and this industry's needs");
    } else if (overlap >= 1) {
      productScore += 1;
    }
  }

  // 6. Geo overlap
  if (focusGeo.length > 0 && clusterCountriesLower.some((c) =>
    focusGeo.some((g) => g.includes(c) || c.includes(g) || g === "global")
  )) {
    productScore += 1;
    productReasons.push("Geographic overlap with your focus regions");
  }

  // Determine product fit level
  let productFit: ClusterEvaluation["productFit"];
  if (productScore >= 7) productFit = "high";
  else if (productScore >= 4) productFit = "medium";
  else if (productScore >= 2) productFit = "low";
  else productFit = "none";

  const explanation = productReasons.length > 0
    ? productReasons.join(". ") + "."
    : `${clusterIndustry} — no clear product-fit signals detected.`;

  // --- Confidence (factors: lead count + product fit + ICP similarity) ---
  let confScore = 0;
  if (clusterLeadCount >= 5) confScore += 2;
  else if (clusterLeadCount >= 3) confScore += 1;
  if (productFit === "high") confScore += 2;
  else if (productFit === "medium") confScore += 1;
  if (icpSimilarity === "high") confScore += 1;
  else if (icpSimilarity === "medium") confScore += 0.5;

  let confidence: "high" | "medium" | "low" = "low";
  if (confScore >= 4) confidence = "high";
  else if (confScore >= 2) confidence = "medium";

  return {
    icpSimilarity,
    productFit,
    explanation,
    productFitReason: productReasons.length > 0 ? productReasons[0] : undefined,
    confidence,
  };
}
