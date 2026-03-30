import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { getAuthContext } from "@/lib/auth";
import { acceptInvite } from "@/actions/team";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Must be logged in to accept an invite
  const ctx = await getAuthContext();
  if (!ctx) {
    redirect(`/sign-up?invite=${encodeURIComponent(token)}`);
  }

  // Look up the pending invite
  const [invite] = await db
    .select({ id: invites.id })
    .from(invites)
    .where(
      and(
        eq(invites.token, token),
        eq(invites.status, "pending"),
      ),
    );

  if (!invite) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invalid or expired invite
        </h1>
        <p className="text-muted-foreground">
          This invite link is no longer valid. It may have already been used or
          cancelled.
        </p>
        <Link
          href="/dashboard"
          className="mt-2 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Attempt to accept the invite
  const result = await acceptInvite(token);

  if (result.success) {
    redirect("/dashboard");
  }

  // If there was an error (e.g. email mismatch), show it
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Unable to accept invite
      </h1>
      <p className="text-muted-foreground">{result.error}</p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
