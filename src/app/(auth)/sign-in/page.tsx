"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, type AuthResult } from "@/actions/auth";
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
import { Mail } from "lucide-react";

export default function SignInPage() {
  return <Suspense><SignInContent /></Suspense>;
}

function SignInContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? undefined;

  const [state, action, isPending] = useActionState<
    AuthResult | null,
    FormData
  >(async (_prev, formData) => {
    if (inviteToken) formData.set("redirectTo", `/invite/${inviteToken}`);
    return signIn(formData);
  }, null);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Sign in to your iseep workspace</CardDescription>
      </CardHeader>

      {inviteToken && (
        <CardContent className="pb-0">
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 dark:border-blue-900/30 dark:bg-blue-950/20 p-3 flex items-start gap-2">
            <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Sign in to accept your team invite. Don&apos;t have an account?{" "}
              <Link href={`/sign-up?invite=${inviteToken}`} className="font-medium underline">
                Sign up first
              </Link>
            </p>
          </div>
        </CardContent>
      )}

      <form action={action}>
        <CardContent className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={inviteToken ? `/sign-up?invite=${inviteToken}` : "/sign-up"}
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
