import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Target, Layers, Handshake, BarChart3 } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-bold tracking-tight">iseep</span>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Sign in
          </Link>
          <Link href="/sign-up" className={cn(buttonVariants())}>
            Get started
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Your living ICP workspace
          </h1>
          <p className="text-lg text-muted-foreground">
            Define ideal customer profiles, track deals, capture win/loss
            insights, and sharpen your go-to-market strategy — all in one place.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Start free
            </Link>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid max-w-3xl gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Target,
              title: "ICPs",
              desc: "Define and refine ideal customer profiles",
            },
            {
              icon: Layers,
              title: "Segments",
              desc: "Build audience segments with logic rules",
            },
            {
              icon: Handshake,
              title: "Deals",
              desc: "Track deals with structured win/loss reasons",
            },
            {
              icon: BarChart3,
              title: "Insights",
              desc: "Spot patterns across your GTM data",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="space-y-2 rounded-lg border p-4 text-left"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        iseep — GTM intelligence for B2B teams
      </footer>
    </div>
  );
}
