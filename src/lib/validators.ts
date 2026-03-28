import { z } from "zod/v4";

export const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(1, "Name is required"),
  workspaceName: z.string().min(1, "Workspace name is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export const icpSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]),
  parentIcpId: z.string().uuid().optional(),
});

export const personaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  goals: z.string().optional(),
  painPoints: z.string().optional(),
  triggers: z.string().optional(),
  decisionCriteria: z.string().optional(),
  objections: z.string().optional(),
  desiredOutcome: z.string().optional(),
  icpId: z.string().uuid(),
});

export const hypothesisSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icpId: z.string().uuid(),
  selectedCriteriaIds: z.array(z.string().uuid()).optional(),
  selectedPersonaIds: z.array(z.string().uuid()).optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  outcome: z.string().optional(),
  status: z.enum(["draft", "testing", "validated", "rejected"]),
  notes: z.string().optional(),
  metricsLeads: z.coerce.number().int().min(0).optional(),
  metricsReplies: z.coerce.number().int().min(0).optional(),
  metricsMeetings: z.coerce.number().int().min(0).optional(),
  metricsOpps: z.coerce.number().int().min(0).optional(),
  metricsWins: z.coerce.number().int().min(0).optional(),
});

export type HypothesisInput = z.infer<typeof hypothesisSchema>;

export const criterionSchema = z.object({
  group: z.enum(["firmographic", "technographic", "behavioral", "compliance", "keyword"]),
  category: z.string().min(1, "Category is required"),
  operator: z.enum(["equals", "contains"]).optional(),
  value: z.string().min(1, "Value is required"),
  intent: z.enum(["qualify", "risk", "exclude"]),
  weight: z.coerce.number().int().min(1).max(10).optional(),
  note: z.string().optional(),
  icpId: z.string().uuid().optional(),
  personaId: z.string().uuid().optional(),
});

export type IcpInput = z.infer<typeof icpSchema>;
export type PersonaInput = z.infer<typeof personaSchema>;
export type CriterionInput = z.infer<typeof criterionSchema>;

export const segmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  icpId: z.string().uuid(),
  status: z.enum(["draft", "active", "archived"]),
  priorityScore: z.coerce.number().int().min(1).max(10),
});

export type SegmentInput = z.infer<typeof segmentSchema>;

export const companySchema = z.object({
  name: z.string().min(1, "Name is required"),
  website: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

export const contactSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.string().optional(),
  linkedinUrl: z.string().optional(),
  companyId: z.string().uuid(),
});

export const dealSchema = z.object({
  title: z.string().min(1, "Title is required"),
  icpId: z.string().uuid().optional(),
  personaId: z.string().uuid().optional(),
  segmentId: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  dealValue: z.string().optional(),
  currency: z.string().optional(),
  stage: z.string().optional(),
  outcome: z.enum(["won", "lost", "open"]),
  notes: z.string().optional(),
});

export const dealReasonSchema = z.object({
  dealId: z.string().uuid(),
  reasonType: z.enum(["win", "loss", "objection", "general"]),
  category: z.string().min(1, "Category is required"),
  tag: z.string().min(1, "Tag is required"),
  description: z.string().optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
});

export const meetingNoteSchema = z.object({
  dealId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  summary: z.string().min(1, "Summary is required"),
  sourceType: z.enum(["manual", "notetaker", "import"]),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type DealInput = z.infer<typeof dealSchema>;
export type DealReasonInput = z.infer<typeof dealReasonSchema>;
export type MeetingNoteInput = z.infer<typeof meetingNoteSchema>;
