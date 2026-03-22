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
  icpId: z.string().uuid(),
});

export const criterionSchema = z.object({
  group: z.enum(["firmographic", "technographic", "behavioral", "compliance", "keyword"]),
  category: z.string().min(1, "Category is required"),
  operator: z.enum(["equals", "contains", "gt", "lt", "in", "not_in"]).optional(),
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
