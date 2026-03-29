import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getPersona } from "@/lib/queries/personas";
import { CriteriaGroupedList } from "@/components/criteria/criteria-grouped-list";

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const persona = await getPersona(id, ctx.workspaceId);
  if (!persona) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{persona.name}</h1>
        {persona.description && (
          <p className="text-muted-foreground">{persona.description}</p>
        )}
        {persona.icp && (
          <p className="text-sm text-muted-foreground">
            ICP:{" "}
            <Link href={`/icps/${persona.icp.id}`} className="font-medium hover:underline">
              {persona.icp.name}
            </Link>
          </p>
        )}
      </div>
      {persona.criteria.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Persona-specific Criteria</h2>
          <CriteriaGroupedList criteria={persona.criteria} icpId={persona.icpId ?? ""} />
        </div>
      )}
    </div>
  );
}
