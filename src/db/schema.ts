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
  profileShareToken: text("profile_share_token").unique(),
  profileShareMode: text("profile_share_mode", {
    enum: ["without_stats", "with_stats"],
  }),
  profileSharedIcpIds: jsonb("profile_shared_icp_ids"), // string[] | null (null = all active)
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("memberships_workspace_user").on(table.workspaceId, table.userId)]
);

// ─── D. ICPs ─────────────────────────────────────────────────────────────────

export const icps = pgTable("icps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
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
    .notNull()
    .unique(), // one per workspace
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
