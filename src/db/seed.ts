import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index";
import {
  workspaces, users, memberships, icps, personas,
  criteria, // was: dimensions
  segments, signals, companies, contacts, deals,
  dealReasons, productRequests, meetingNotes, icpSnapshots,
} from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Clean existing data (reverse FK order)
  await db.delete(meetingNotes);
  await db.delete(productRequests);
  await db.delete(dealReasons);
  await db.delete(icpSnapshots);
  await db.delete(deals);
  await db.delete(contacts);
  await db.delete(companies);
  await db.delete(signals);
  await db.delete(segments);
  await db.delete(criteria);
  await db.delete(personas);
  await db.delete(icps);
  await db.delete(memberships);
  await db.delete(users);
  await db.delete(workspaces);

  // Create workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: "Acme Corp",
      slug: "acme-corp",
    })
    .returning();

  // Create demo user (this ID won't match Supabase auth — for seed only)
  const [user] = await db
    .insert(users)
    .values({
      id: "00000000-0000-0000-0000-000000000001",
      email: "demo@acme.com",
      fullName: "Demo User",
    })
    .returning();

  // Create membership
  await db.insert(memberships).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
  });

  // Create ICPs
  const [icp1] = await db
    .insert(icps)
    .values([
      {
        workspaceId: workspace.id,
        name: "Enterprise FinTech",
        description: "Large financial institutions adopting crypto/blockchain payment solutions",
        status: "active",
        createdBy: user.id,
      },
      {
        workspaceId: workspace.id,
        name: "Mid-Market SaaS",
        description: "SaaS companies with 50-500 employees looking for payment infrastructure",
        status: "draft",
        createdBy: user.id,
      },
    ])
    .returning();

  // Create personas
  const [persona1] = await db
    .insert(personas)
    .values([
      {
        workspaceId: workspace.id,
        icpId: icp1.id,
        name: "Head of Payments",
        description: "Decision maker for payment infrastructure, reports to CTO/CFO",
      },
      {
        workspaceId: workspace.id,
        icpId: icp1.id,
        name: "Compliance Officer",
        description: "Evaluates regulatory risk, key blocker or enabler",
      },
    ])
    .returning();

  // Create criteria (fit factors + exclusions)
  await db.insert(criteria).values([
    {
      workspaceId: workspace.id,
      icpId: icp1.id,
      group: "firmographic",
      category: "industry",
      operator: "equals",
      value: "Financial Services",
      intent: "qualify",
      weight: 9,
    },
    {
      workspaceId: workspace.id,
      icpId: icp1.id,
      group: "firmographic",
      category: "region",
      operator: "in",
      value: "EU,UK,US",
      intent: "qualify",
      weight: 7,
    },
    {
      workspaceId: workspace.id,
      icpId: icp1.id,
      group: "technographic",
      category: "tech_stack",
      operator: "contains",
      value: "crypto_payments",
      intent: "qualify",
      weight: 10,
    },
    {
      workspaceId: workspace.id,
      icpId: icp1.id,
      group: "compliance",
      category: "compliance_status",
      operator: "equals",
      value: "aml_restricted",
      intent: "exclude",
      note: "Exclude companies in AML-restricted jurisdictions",
    },
  ]);

  // Create segment
  const [segment1] = await db
    .insert(segments)
    .values({
      workspaceId: workspace.id,
      icpId: icp1.id,
      name: "EU FinTech + Crypto Ready",
      description: "European financial institutions with crypto payment capability, excluding AML-restricted",
      logicJson: {
        operator: "AND",
        conditions: [
          { category: "region", operator: "equals", value: "EU" },
          { category: "tech_stack", operator: "contains", value: "crypto_payments" },
          {
            operator: "NOT",
            conditions: [
              { category: "compliance", operator: "equals", value: "aml_restricted" },
            ],
          },
        ],
      },
      status: "active",
    })
    .returning();

  // Create signals
  await db.insert(signals).values([
    {
      workspaceId: workspace.id,
      icpId: icp1.id,
      segmentId: segment1.id,
      type: "positive",
      label: "Hired crypto compliance team",
      description: "Company recently posted/hired for crypto compliance roles",
      strength: 9,
    },
    {
      workspaceId: workspace.id,
      icpId: icp1.id,
      type: "negative",
      label: "Regulatory investigation",
      description: "Under investigation by financial regulators",
      strength: 10,
    },
  ]);

  // Create companies
  const [company1] = await db
    .insert(companies)
    .values([
      {
        workspaceId: workspace.id,
        name: "Deutsche Payments AG",
        website: "https://deutsche-payments.example.com",
        country: "Germany",
        industry: "Financial Services",
      },
      {
        workspaceId: workspace.id,
        name: "Nordic Pay",
        website: "https://nordicpay.example.com",
        country: "Sweden",
        industry: "Financial Services",
      },
    ])
    .returning();

  // Create contacts
  const [contact1] = await db
    .insert(contacts)
    .values({
      workspaceId: workspace.id,
      companyId: company1.id,
      fullName: "Hans Mueller",
      title: "Head of Digital Payments",
      email: "h.mueller@deutsche-payments.example.com",
    })
    .returning();

  // Create deal
  const [deal1] = await db
    .insert(deals)
    .values({
      workspaceId: workspace.id,
      icpId: icp1.id,
      personaId: persona1.id,
      segmentId: segment1.id,
      companyId: company1.id,
      contactId: contact1.id,
      title: "Deutsche Payments — Crypto Gateway Integration",
      dealValue: "250000",
      currency: "EUR",
      stage: "proposal",
      outcome: "open",
    })
    .returning();

  // Create deal reasons
  await db.insert(dealReasons).values({
    workspaceId: workspace.id,
    dealId: deal1.id,
    reasonType: "objection",
    category: "compliance",
    tag: "regulatory_uncertainty",
    description: "Concern about evolving MiCA regulations",
    severity: 3,
  });

  // Create product request
  await db.insert(productRequests).values({
    workspaceId: workspace.id,
    dealId: deal1.id,
    icpId: icp1.id,
    personaId: persona1.id,
    type: "feature_request",
    title: "Multi-currency settlement dashboard",
    description: "Real-time view of settlement status across EUR, GBP, USD with crypto pairs",
    frequencyScore: 7,
  });

  // Create meeting note
  await db.insert(meetingNotes).values({
    workspaceId: workspace.id,
    dealId: deal1.id,
    companyId: company1.id,
    summary:
      "Initial discovery call with Hans. Strong interest in crypto gateway, but compliance team needs MiCA clarity. Follow up with compliance-focused demo in 2 weeks.",
    sourceType: "manual",
  });

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
