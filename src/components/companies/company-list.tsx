"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Search } from "lucide-react";

type Company = {
  id: string;
  name: string;
  website: string | null;
  country: string | null;
  industry: string | null;
  notes: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type CompanyListProps = {
  companies: Company[];
};

export function CompanyList({ companies }: CompanyListProps) {
  const [search, setSearch] = useState("");

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {companies.length === 0
              ? "No companies yet. Create your first company to get started."
              : "No companies match your search."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <Link
                    href={`/companies/${company.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {company.industry ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {company.country ?? "-"}
                </TableCell>
                <TableCell>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {company.createdAt.toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
