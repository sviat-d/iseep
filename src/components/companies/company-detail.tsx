"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { CompanyEditDialog } from "@/components/companies/company-edit-dialog";
import { CompanyDeleteDialog } from "@/components/companies/company-delete-dialog";
import { ContactFormDialog } from "@/components/companies/contact-form-dialog";
import { deleteContact } from "@/actions/contacts";
import {
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  Globe,
  MapPin,
} from "lucide-react";

type Contact = {
  id: string;
  fullName: string;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  notes: string | null;
  companyId: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type Deal = {
  id: string;
  title: string;
  outcome: string;
  stage: string | null;
  dealValue: string | null;
  currency: string | null;
};

type CompanyWithRelations = {
  id: string;
  name: string;
  website: string | null;
  country: string | null;
  industry: string | null;
  notes: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  contacts: Contact[];
  deals: Deal[];
};

type CompanyDetailProps = {
  company: CompanyWithRelations;
  industrySuggestions: string[];
};

const OUTCOME_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  won: "default",
  lost: "destructive",
  open: "secondary",
};

export function CompanyDetail({ company, industrySuggestions }: CompanyDetailProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
            {company.industry && (
              <Badge variant="secondary">{company.industry}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {company.country && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {company.country}
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {company.notes && (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Contacts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <Button variant="outline" size="sm" onClick={() => setContactOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Contact
          </Button>
        </div>

        {company.contacts.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                No contacts yet. Add a contact to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>LinkedIn</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.title ?? "-"}
                  </TableCell>
                  <TableCell>
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-primary hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.linkedinUrl ? (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={async () => {
                        await deleteContact(contact.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Deals Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Deals</h2>

        {company.deals.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                No deals linked to this company.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell>
                    <Link
                      href={`/deals/${deal.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {deal.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deal.stage ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={OUTCOME_VARIANT[deal.outcome] ?? "outline"}>
                      {deal.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deal.dealValue
                      ? `${deal.currency ?? "USD"} ${Number(deal.dealValue).toLocaleString()}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CompanyEditDialog
        company={company}
        industrySuggestions={industrySuggestions}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <CompanyDeleteDialog
        company={company}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <ContactFormDialog
        companyId={company.id}
        open={contactOpen}
        onOpenChange={setContactOpen}
      />
    </div>
  );
}
