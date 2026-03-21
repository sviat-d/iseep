"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type IcpRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  qualifyCount: number;
  excludeCount: number;
  personaCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

export function IcpCards({ icps }: { icps: IcpRow[] }) {
  if (icps.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">No ICPs found.</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {icps.map((icp) => (
        <Link key={icp.id} href={`/icps/${icp.id}`} className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="group-hover:text-primary transition-colors">
                  {icp.name}
                </CardTitle>
                <Badge variant={statusVariant[icp.status] ?? "outline"}>
                  {icp.status}
                </Badge>
              </div>
              {icp.description && (
                <CardDescription className="line-clamp-2">
                  {icp.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>v{icp.version}</span>
                <span>{icp.qualifyCount} qualify</span>
                <span>{icp.excludeCount} exclude</span>
                <span>{icp.personaCount} personas</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
