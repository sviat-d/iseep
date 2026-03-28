import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  boolean,
  unique,
} from "drizzle-orm/pg-core";

// ─── A. Workspaces ───────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  // Company info
  website: text("website"),
  companyDescription: text("company_description"),
  targetCustomers: text("target_customers"),
  industriesFocus: jsonb("industries_focus").default([]), // string[]
  geoFocus: jsonb("geo_focus").default([]), // string[]
  // Sharing & config
  profileShareToken: text("profile_share_token").unique(),
  profileShareMode: text("profile_share_mode", {
    enum: ["without_stats", "with_stats"],
  }),
  profileSharedIcpIds: jsonb("profile_shared_icp_ids"), // string[] | null (null = all active)
  apiToken: text("api_token").unique(),
  onboardingStep: integer("onboarding_step").notNull().default(4),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── B. Users ────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches Supabase auth.users.id
  email: text("email").unique().notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── C. Memberships ─────────────────────────────────────────────────────────

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: text("role", { enum: ["owner", "admin", "member"] })
      .default("member")
      .notNull(),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("memberships_workspace_user").on(table.workspaceId, table.userId)]
);

// ─── C2. Invites ────────────────────────────────────────────────────────────

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["member"] }).default("member").notNull(),
  invitedBy: uuid("invited_by")
    .references(() => users.id)
    .notNull(),
  token: text("token").unique().notNull(),
  status: text("status", { enum: ["pending", "accepted", "expired"] })
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

// ─── C3. Activity Events ────────────────────────────────────────────────────

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  userId: uuid("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type"), // "icp" | "upload" | "draft" | "product" | "member"
  entityId: uuid("entity_id"),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── D0. Products ───────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  description: text("description"),
  coreUseCases: jsonb("core_use_cases").default([]), // string[]
  keyValueProps: jsonb("key_value_props").default([]), // string[]
  pricingModel: text("pricing_model"),
  avgTicket: text("avg_ticket"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── D0b. Product Use Cases ──────────────────────────────────────────────────

export const productUseCases = pgTable("product_use_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique("product_use_cases_product_norm").on(table.productId, table.normalizedName)]);

// ─── D1. Product-ICP Links (many-to-many) ───────────────────────────────────

export const productIcps = pgTable("product_icps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  icpId: uuid("icp_id")
    .references(() => icps.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique("product_icps_product_icp").on(table.productId, table.icpId)]);

// ─── D. ICPs ─────────────────────────────────────────────────────────────────

export const icps = pgTable("icps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  productId: uuid("product_id").references(() => products.id), // legacy — use product_icps for many-to-many
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["draft", "active", "archived"] })
    .default("draft")
    .notNull(),
  version: integer("version").default(1).notNull(),
  shareToken: text("share_token").unique(),
  shareMode: text("share_mode", { enum: ["without_stats", "with_stats"] }),
  parentIcpId: uuid("parent_icp_id"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── E. Personas ─────────────────────────────────────────────────────────────

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  icpId: uuid("icp_id")
    .references(() => icps.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  goals: text("goals"),
  painPoints: text("pain_points"),
  triggers: text("triggers"),
  decisionCriteria: text("decision_criteria"),
  objections: text("objections"),
  desiredOutcome: text("desired_outcome"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── F. Criteria (replaces Dimensions) ──────────────────────────────────────

export const criteria = pgTable("criteria", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  icpId: uuid("icp_id").references(() => icps.id),
  personaId: uuid("persona_id").references(() => personas.id),
  group: text("group", {
    enum: ["firmographic", "technographic", "behavioral", "compliance", "keyword"],
  }).notNull(),
  category: text("category").notNull(),
  operator: text("operator", {
    enum: ["equals", "contains", "gt", "lt", "in", "not_in"],
  }),
  value: text("value").notNull(),
  intent: text("intent", { enum: ["qualify", "risk", "exclude"] })
    .default("qualify")
    .notNull(),
  weight: integer("weight"), // 1-10, only meaningful for qualify intent
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── G. Segments ─────────────────────────────────────────────────────────────

export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  icpId: uuid("icp_id")
    .references(() => icps.id)
    .notNull(),
  personaId: uuid("persona_id").references(() => personas.id),
  name: text("name").notNull(),
  description: text("description"),
  logicJson: jsonb("logic_json").default({}).notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] })
    .default("draft")
    .notNull(),
  priorityScore: integer("priority_score").default(5).notNull(), // 1-10
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── H. Signals ──────────────────────────────────────────────────────────────

export const signals = pgTable("signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  icpId: uuid("icp_id").references(() => icps.id),
  personaId: uuid("persona_id").references(() => personas.id),
  segmentId: uuid("segment_id").references(() => segments.id),
  type: text("type").notNull(), // 'positive' | 'negative' | 'neutral'
  label: text("label").notNull(),
  description: text("description"),
  strength: integer("strength"), // 1-10
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── I. Companies ────────────────────────────────────────────────────────────

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  name: text("name").notNull(),
  website: text("website"),
  country: text("country"),
  industry: text("industry"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── J. Contacts ─────────────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  fullName: text("full_name").notNull(),
  title: text("title"),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── K. Deals ────────────────────────────────────────────────────────────────

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  icpId: uuid("icp_id").references(() => icps.id),
  personaId: uuid("persona_id").references(() => personas.id),
  segmentId: uuid("segment_id").references(() => segments.id),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  title: text("title").notNull(),
  dealValue: numeric("deal_value"),
  currency: text("currency").default("USD"),
  stage: text("stage").default("discovery"),
  outcome: text("outcome", { enum: ["won", "lost", "open"] })
    .default("open")
    .notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── L. Deal Reasons ─────────────────────────────────────────────────────────

export const dealReasons = pgTable("deal_reasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  dealId: uuid("deal_id")
    .references(() => deals.id)
    .notNull(),
  reasonType: text("reason_type", {
    enum: ["win", "loss", "objection", "general"],
  }).notNull(),
  category: text("category").notNull(),
  tag: text("tag").notNull(),
  description: text("description"),
  severity: integer("severity"), // 1-5
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── M. Product Requests ─────────────────────────────────────────────────────

export const productRequests = pgTable("product_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  dealId: uuid("deal_id").references(() => deals.id),
  icpId: uuid("icp_id").references(() => icps.id),
  personaId: uuid("persona_id").references(() => personas.id),
  segmentId: uuid("segment_id").references(() => segments.id),
  type: text("type", {
    enum: [
      "feature_request",
      "adjacent_product",
      "use_case",
      "integration_request",
    ],
  }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["open", "validated", "planned", "rejected"],
  })
    .default("open")
    .notNull(),
  source: text("source", {
    enum: ["deal", "meeting_note", "manual"],
  })
    .default("manual")
    .notNull(),
  frequencyScore: integer("frequency_score"), // 1-10
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── N. Meeting Notes ────────────────────────────────────────────────────────

export const meetingNotes = pgTable("meeting_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  dealId: uuid("deal_id").references(() => deals.id),
  companyId: uuid("company_id").references(() => companies.id),
  summary: text("summary").notNull(),
  sourceType: text("source_type", {
    enum: ["manual", "notetaker", "import"],
  }).default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── O. ICP Snapshots ───────────────────────────────────────────────────────

export const icpSnapshots = pgTable(
  "icp_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    icpId: uuid("icp_id")
      .references(() => icps.id)
      .notNull(),
    version: integer("version").notNull(),
    snapshotData: jsonb("snapshot_data").notNull(),
    changeSummary: text("change_summary"),
    note: text("note"),
    source: text("source", { enum: ["manual", "agent", "import", "system"] }).default("manual"),
    tags: jsonb("tags").default([]), // string[] e.g. ["agent-generated", "production"]
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("icp_snapshots_icp_version").on(table.icpId, table.version)]
);

// ─── P. Scored Uploads ──────────────────────────────────────────────────────

export const scoredUploads = pgTable("scored_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  fileName: text("file_name").notNull(),
  sourceName: text("source_name"), // e.g. "Web Summit 2026", "Apollo export April"
  totalRows: integer("total_rows").notNull(),
  scoredAt: timestamp("scored_at", { withTimezone: true }).defaultNow().notNull(),
  columnMapping: jsonb("column_mapping").notNull(), // { csvColumn: mappedField }
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Q. Scored Leads ────────────────────────────────────────────────────────

export const scoredLeads = pgTable("scored_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadId: uuid("upload_id")
    .references(() => scoredUploads.id)
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  rawData: jsonb("raw_data").notNull(), // original CSV row as key-value
  companyName: text("company_name"),
  industry: text("industry"),
  country: text("country"),
  website: text("website"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  bestIcpId: uuid("best_icp_id").references(() => icps.id),
  bestIcpName: text("best_icp_name"),
  fitScore: integer("fit_score"), // 0-100
  fitLevel: text("fit_level", { enum: ["high", "medium", "low", "risk", "blocked", "none"] }).notNull(),
  confidence: integer("confidence"), // 0-100
  matchReasons: jsonb("match_reasons").notNull(), // Array<MatchReason>
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── S. Value Mappings (workspace synonym memory) ───────────────────────────

export const valueMappings = pgTable("value_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  category: text("category").notNull(),
  fromValue: text("from_value").notNull(),
  toValue: text("to_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique("value_mappings_workspace_category_from").on(table.workspaceId, table.category, table.fromValue)]);

// ─── V. AI Keys (Bring Your Own Key) ───────────────────────────────────────

export const aiKeys = pgTable("ai_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull()
    .unique(), // one key config per workspace
  provider: text("provider", { enum: ["anthropic", "openai"] }).notNull(),
  apiKey: text("api_key").notNull(), // encrypted in production, plain for MVP
  model: text("model"), // custom model override, e.g. "gpt-4o", "claude-sonnet-4-20250514"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── R. AI Usage ────────────────────────────────────────────────────────────

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  operation: text("operation").notNull(), // "icp_parse", "csv_score", etc.
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── T. Product Context ─────────────────────────────────────────────────────

export const productContext = pgTable("product_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  productId: uuid("product_id").references(() => products.id).unique(), // one context per product
  companyName: text("company_name"),
  website: text("website"),
  productDescription: text("product_description").notNull(),
  targetCustomers: text("target_customers"),
  coreUseCases: jsonb("core_use_cases").default([]), // string[]
  keyValueProps: jsonb("key_value_props").default([]), // string[]
  industriesFocus: jsonb("industries_focus").default([]), // string[]
  geoFocus: jsonb("geo_focus").default([]), // string[]
  pricingModel: text("pricing_model"),
  avgTicket: text("avg_ticket"),
  excludedIndustries: jsonb("excluded_industries").default([]), // string[] — industries explicitly marked as not a fit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── U. Rejected ICPs (learning from user feedback) ────────────────────────

export const rejectedIcps = pgTable("rejected_icps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  industry: text("industry").notNull(),
  reason: text("reason").notNull(),
  details: text("details"), // additional context
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── X. Hypotheses ──────────────────────────────────────────────────────────

export const hypotheses = pgTable("hypotheses", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  icpId: uuid("icp_id")
    .references(() => icps.id)
    .notNull(),
  name: text("name").notNull(),
  selectedCriteriaIds: jsonb("selected_criteria_ids").default([]), // string[]
  selectedPersonaIds: jsonb("selected_persona_ids").default([]), // string[]
  segmentId: uuid("segment_id").references(() => segments.id), // legacy
  personaId: uuid("persona_id").references(() => personas.id), // legacy
  problem: text("problem"),
  solution: text("solution"),
  outcome: text("outcome"),
  valueProposition: text("value_proposition"), // legacy alias
  expectedResult: text("expected_result"), // legacy alias
  status: text("status", { enum: ["draft", "testing", "validated", "rejected"] })
    .default("draft")
    .notNull(),
  notes: text("notes"),
  metricsLeads: integer("metrics_leads").default(0),
  metricsReplies: integer("metrics_replies").default(0),
  metricsMeetings: integer("metrics_meetings").default(0),
  metricsOpps: integer("metrics_opps").default(0),
  metricsWins: integer("metrics_wins").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── W. ICP Cases (ICP Learning Loop) ─────────────────────────────────────

export const icpEvidence = pgTable("icp_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  icpId: uuid("icp_id")
    .references(() => icps.id)
    .notNull(),
  productId: uuid("product_id").references(() => products.id), // product-specific cases
  useCaseId: uuid("use_case_id").references(() => productUseCases.id), // legacy single
  useCaseIds: jsonb("use_case_ids").default([]), // string[] — multiple use cases
  companyName: text("company_name").notNull(),
  companyDomain: text("company_domain"),
  outcome: text("outcome", { enum: ["won", "lost", "in_progress"] }).notNull(),
  segmentId: uuid("segment_id").references(() => segments.id),
  channel: text("channel", { enum: ["linkedin", "email", "conference", "referral", "inbound", "other"] }),
  channelDetail: text("channel_detail"),
  reasonTags: jsonb("reason_tags").default([]).notNull(), // string[]
  hypothesis: text("hypothesis"), // legacy free-text, kept for backward compat
  hypothesisId: uuid("hypothesis_id").references(() => hypotheses.id),
  note: text("note"),
  industry: text("industry"), // legacy, kept for backward compat
  region: text("region"), // legacy, kept for backward compat
  date: timestamp("date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── V. Drafts (AI suggestions) ───────────────────────────────────────────

export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  source: text("source").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id"),
  payload: jsonb("payload").notNull(),
  summary: text("summary").notNull(),
  reasoning: text("reasoning"),
  status: text("status", { enum: ["pending", "rejected", "applied"] })
    .default("pending")
    .notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
});
