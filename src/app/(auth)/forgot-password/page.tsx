"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthResult } from "@/actions/auth";
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
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState<
    AuthResult | null,
    FormData
  >(async (_prev, formData) => requestPasswordReset(formData), null);

  const sent = state?.error === undefined && state !== null;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      {sent ? (
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50/80 p-4 text-center dark:border-green-900/30 dark:bg-green-950/20">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
            <p className="text-sm font-medium text-green-900 dark:text-green-200">
              Check your email
            </p>
            <p className="mt-1 text-xs text-green-800/80 dark:text-green-300/70">
              If an account exists with that email, you&apos;ll receive a
              password reset link shortly.
            </p>
          </div>
          <div className="text-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      ) : (
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
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Sending..." : "Send reset link"}
            </Button>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
