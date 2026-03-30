"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp, type AuthResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowRight, KeyRound, Mail } from "lucide-react";

export default function SignUpPage() {
  return <Suspense><SignUpContent /></Suspense>;
}

function SignUpContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? undefined;

  const [state, action, isPending] = useActionState<
    AuthResult | null,
    FormData
  >(async (_prev, formData) => {
    if (inviteToken) formData.set("redirectTo", `/invite/${inviteToken}`);
    return signUp(formData);
  }, null);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {inviteToken ? "Join your team" : "Create your account"}
        </CardTitle>
        <CardDescription>
          {inviteToken
            ? "Create an account to accept your team invite"
            : "Get started with iseep — set up your workspace"}
        </CardDescription>
      </CardHeader>

      {inviteToken && (
        <CardContent className="pb-0">
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 dark:border-blue-900/30 dark:bg-blue-950/20 p-3 flex items-start gap-2">
            <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Create an account to accept your team invite. After sign-up you&apos;ll be redirected to join the team.
            </p>
          </div>
        </CardContent>
      )}

      <form action={action}>
        <CardContent className="space-y-4">
          {/* Email already exists — special UX */}
          {state?.code === "email_exists" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    An account with this email already exists
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/70">
                    Try signing in instead, or reset your password if you forgot
                    it.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href={inviteToken ? `/sign-in?invite=${inviteToken}` : "/sign-in"}>
                      <Button size="sm" variant="outline" type="button">
                        <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                        Sign in
                      </Button>
                    </Link>
                    <Link href="/forgot-password">
                      <Button size="sm" variant="ghost" type="button">
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                        Reset password
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generic errors */}
          {state?.error && state?.code !== "email_exists" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Jane Smith"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          {inviteToken ? (
            <input type="hidden" name="workspaceName" value="My workspace" />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                name="workspaceName"
                placeholder="Acme Corp"
                required
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={inviteToken ? `/sign-in?invite=${inviteToken}` : "/sign-in"}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
