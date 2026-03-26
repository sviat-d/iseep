"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const settingsItems = [
  { href: "/settings/ai", label: "AI Settings", icon: Sparkles },
  { href: "/settings/team", label: "Team", icon: Users },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-48 shrink-0 space-y-1">
      {settingsItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
