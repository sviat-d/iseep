"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, workspaces, memberships } from "@/db/schema";
import { signInSchema, signUpSchema } from "@/lib/validators";

export type AuthResult = {
  error?: string;
  code?: "email_exists" | "invalid_credentials";
};

export async function signIn(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";
  redirect(redirectTo);
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    fullName: formData.get("fullName") as string,
    workspaceName: formData.get("workspaceName") as string,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (authError) {
    // Supabase returns specific error for existing users
    if (
      authError.message.includes("already registered") ||
      authError.message.includes("already been registered") ||
      authError.status === 422
    ) {
      return {
        error: "An account with this email already exists.",
        code: "email_exists",
      };
    }
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Failed to create account" };
  }

  // Supabase may return a user even for existing emails (security behavior).
  // Check if this user already exists in our DB.
  const { eq } = await import("drizzle-orm");
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, authData.user.id));

  if (existingUser) {
    return {
      error: "An account with this email already exists.",
      code: "email_exists",
    };
  }

  const slug = parsed.data.workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  try {
    // Create user record, workspace, and membership
    await db.insert(users).values({
      id: authData.user.id,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
    });

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: parsed.data.workspaceName,
        slug: `${slug}-${authData.user.id.slice(0, 8)}`,
        onboardingStep: 0,
      })
      .returning();

    await db.insert(memberships).values({
      workspaceId: workspace.id,
      userId: authData.user.id,
      role: "owner",
    });
  } catch (e) {
    // Unique constraint violation — email already exists
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505")) {
      return {
        error: "An account with this email already exists.",
        code: "email_exists",
      };
    }
    return { error: "Something went wrong. Please try again." };
  }

  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";
  redirect(redirectTo);
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthResult> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) return { error: "Email is required" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://iseep.io"}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  // Always return success (don't reveal if email exists)
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
