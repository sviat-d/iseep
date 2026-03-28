import type { GtmContextPackage } from "./types";

export function toJson(pkg: GtmContextPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function toMarkdown(pkg: GtmContextPackage): string {
  const lines: string[] = [];
  const companyName = pkg.product?.companyName ?? pkg.workspace.name;

  lines.push(`# ${companyName} — GTM Context\n`);

  if (pkg.product) {
    const p = pkg.product;
    lines.push("## Product\n");
    lines.push(p.productDescription + "\n");

    if (p.targetCustomers) lines.push(`**Target customers:** ${p.targetCustomers}\n`);
    if (p.industriesFocus.length > 0) lines.push(`**Industries:** ${p.industriesFocus.join(", ")}\n`);
    if (p.geoFocus.length > 0) lines.push(`**Regions:** ${p.geoFocus.join(", ")}\n`);

    if (p.coreUseCases.length > 0) {
      lines.push("\n### Use Cases\n");
      p.coreUseCases.forEach((uc) => lines.push(`- ${uc}`));
      lines.push("");
    }

    if (p.keyValueProps.length > 0) {
      lines.push("### Value Propositions\n");
      p.keyValueProps.forEach((vp) => lines.push(`- ${vp}`));
      lines.push("");
    }
  }

  if (pkg.products && pkg.products.length > 0) {
    lines.push("## Products\n");
    for (const prod of pkg.products) {
      lines.push(`### ${prod.name}\n`);
      if (prod.shortDescription) lines.push(`${prod.shortDescription}\n`);
      if (prod.description) lines.push(prod.description + "\n");
      if (prod.pricingModel) lines.push(`**Pricing:** ${prod.pricingModel}${prod.avgTicket ? ` (avg ${prod.avgTicket})` : ""}\n`);
      if (prod.coreUseCases.length > 0) {
        lines.push("**Use cases:**");
        prod.coreUseCases.forEach((uc) => lines.push(`- ${uc}`));
        lines.push("");
      }
      if (prod.keyValueProps.length > 0) {
        lines.push("**Value props:**");
        prod.keyValueProps.forEach((vp) => lines.push(`- ${vp}`));
        lines.push("");
      }
    }
  }

  if (pkg.icps && pkg.icps.length > 0) {
    for (const icp of pkg.icps) {
      lines.push("---\n");
      lines.push(`## ICP: ${icp.name}\n`);
      if (icp.description) lines.push(icp.description + "\n");
      lines.push(`**Status:** ${icp.status} | **Version:** ${icp.version}\n`);

      const qualify = icp.criteria.filter((c) => c.intent === "qualify");
      const risk = icp.criteria.filter((c) => c.intent === "risk");
      const exclude = icp.criteria.filter((c) => c.intent === "exclude");

      if (qualify.length > 0) {
        lines.push("### Qualifying Criteria\n");
        lines.push("| Category | Value | Weight |");
        lines.push("|----------|-------|--------|");
        qualify.forEach((c) =>
          lines.push(`| ${c.category} | ${c.value} | ${c.weight ?? "-"}/10 |`),
        );
        lines.push("");
      }

      if (risk.length > 0) {
        lines.push("### Risk Signals\n");
        risk.forEach((c) => lines.push(`- ${c.category}: ${c.value}`));
        lines.push("");
      }

      if (exclude.length > 0) {
        lines.push("### Exclusions\n");
        exclude.forEach((c) => lines.push(`- ${c.category}: ${c.value}`));
        lines.push("");
      }

      if (icp.personas.length > 0) {
        lines.push("### Personas\n");
        icp.personas.forEach((p) =>
          lines.push(`- **${p.name}**${p.description ? ` — ${p.description}` : ""}`),
        );
        lines.push("");
      }
    }
  }

  if (pkg.scoring?.latestRun) {
    const r = pkg.scoring.latestRun;
    const borderline = r.breakdown.medium + r.breakdown.low + r.breakdown.risk;
    lines.push("---\n");
    lines.push("## Scoring Summary\n");
    lines.push(`Latest run: ${r.fileName} (${r.totalLeads} leads, ${r.scoredAt.split("T")[0]})\n`);
    lines.push(`- High fit: ${r.breakdown.high}`);
    lines.push(`- Borderline: ${borderline}`);
    lines.push(`- Blocked: ${r.breakdown.blocked}`);
    lines.push(`- Unmatched: ${r.breakdown.unmatched}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function toClipboardText(pkg: GtmContextPackage): string {
  const lines: string[] = [];
  const companyName = pkg.product?.companyName ?? pkg.workspace.name;

  if (pkg.product) {
    const p = pkg.product;
    lines.push(`COMPANY: ${companyName}${p.website ? ` (${p.website})` : ""}`);
    lines.push(p.productDescription);
    if (p.targetCustomers) lines.push(`Target: ${p.targetCustomers}`);
    if (p.industriesFocus.length > 0) lines.push(`Industries: ${p.industriesFocus.join(", ")}`);
    if (p.geoFocus.length > 0) lines.push(`Regions: ${p.geoFocus.join(", ")}`);
    if (p.coreUseCases.length > 0) lines.push(`Use cases: ${p.coreUseCases.join(", ")}`);
    if (p.keyValueProps.length > 0) lines.push(`Value props: ${p.keyValueProps.join(", ")}`);
    lines.push("");
  }

  if (pkg.products && pkg.products.length > 0) {
    for (const prod of pkg.products) {
      lines.push("---");
      lines.push(`PRODUCT: ${prod.name}`);
      if (prod.shortDescription) lines.push(prod.shortDescription);
      if (prod.description) lines.push(prod.description);
      if (prod.pricingModel) lines.push(`Pricing: ${prod.pricingModel}${prod.avgTicket ? ` (avg ${prod.avgTicket})` : ""}`);
      if (prod.coreUseCases.length > 0) lines.push(`Use cases: ${prod.coreUseCases.join(", ")}`);
      if (prod.keyValueProps.length > 0) lines.push(`Value props: ${prod.keyValueProps.join(", ")}`);
      lines.push("");
    }
  }

  if (pkg.icps && pkg.icps.length > 0) {
    for (const icp of pkg.icps) {
      lines.push("---");
      lines.push(`ICP: ${icp.name} [${icp.status}, v${icp.version}]`);
      if (icp.description) lines.push(icp.description);

      const qualify = icp.criteria.filter((c) => c.intent === "qualify");
      const risk = icp.criteria.filter((c) => c.intent === "risk");
      const exclude = icp.criteria.filter((c) => c.intent === "exclude");

      if (qualify.length > 0) {
        lines.push(
          `Criteria (qualify): ${qualify.map((c) => `${c.category}=${c.value}${c.weight ? ` (${c.weight})` : ""}`).join(", ")}`,
        );
      }
      if (risk.length > 0) {
        lines.push(
          `Criteria (risk): ${risk.map((c) => `${c.category}=${c.value}`).join(", ")}`,
        );
      }
      if (exclude.length > 0) {
        lines.push(
          `Criteria (exclude): ${exclude.map((c) => `${c.category}=${c.value}`).join(", ")}`,
        );
      }
      if (icp.personas.length > 0) {
        lines.push(`Personas: ${icp.personas.map((p) => p.name).join(", ")}`);
      }
      lines.push("");
    }
  }

  if (pkg.scoring?.latestRun) {
    const r = pkg.scoring.latestRun;
    const borderline = r.breakdown.medium + r.breakdown.low + r.breakdown.risk;
    lines.push("---");
    lines.push(
      `SCORING: ${r.fileName} (${r.totalLeads} leads, ${r.scoredAt.split("T")[0]})`,
    );
    lines.push(
      `High: ${r.breakdown.high} | Borderline: ${borderline} | Blocked: ${r.breakdown.blocked} | Unmatched: ${r.breakdown.unmatched}`,
    );
    lines.push("");
  }

  return lines.join("\n");
}
