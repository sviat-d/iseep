import type { IcpSnapshotData } from "./types";

export type DiffEntry = {
  field: string;
  before: string;
  after: string;
};

/**
 * Compare two ICP snapshots and return a list of human-readable differences.
 * Simple field-level diff — no nested object diffing.
 */
export function diffSnapshots(
  prev: IcpSnapshotData,
  curr: IcpSnapshotData,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  // ICP metadata
  if (prev.icp.name !== curr.icp.name) {
    diffs.push({ field: "Name", before: prev.icp.name, after: curr.icp.name });
  }
  if ((prev.icp.description ?? "") !== (curr.icp.description ?? "")) {
    diffs.push({
      field: "Description",
      before: prev.icp.description ?? "(empty)",
      after: curr.icp.description ?? "(empty)",
    });
  }
  if (prev.icp.status !== curr.icp.status) {
    diffs.push({ field: "Status", before: prev.icp.status, after: curr.icp.status });
  }

  // Criteria
  const prevCriteria = prev.criteria.map(c => `${c.category}:${c.value}:${c.intent}`).sort();
  const currCriteria = curr.criteria.map(c => `${c.category}:${c.value}:${c.intent}`).sort();

  const addedCriteria = currCriteria.filter(c => !prevCriteria.includes(c));
  const removedCriteria = prevCriteria.filter(c => !currCriteria.includes(c));

  for (const key of addedCriteria) {
    const [category, value, intent] = key.split(":");
    diffs.push({
      field: "Criteria",
      before: "",
      after: `+ ${category} = "${value}" (${intent})`,
    });
  }
  for (const key of removedCriteria) {
    const [category, value, intent] = key.split(":");
    diffs.push({
      field: "Criteria",
      before: `- ${category} = "${value}" (${intent})`,
      after: "",
    });
  }

  // Weight changes (for criteria that exist in both)
  for (const currC of curr.criteria) {
    const prevC = prev.criteria.find(
      p => p.category === currC.category && p.value === currC.value && p.intent === currC.intent,
    );
    if (prevC && prevC.weight !== currC.weight) {
      diffs.push({
        field: `Weight: ${currC.category} "${currC.value}"`,
        before: String(prevC.weight ?? "none"),
        after: String(currC.weight ?? "none"),
      });
    }
  }

  // Personas
  const prevPersonas = prev.personas.map(p => p.name).sort();
  const currPersonas = curr.personas.map(p => p.name).sort();

  const addedPersonas = currPersonas.filter(p => !prevPersonas.includes(p));
  const removedPersonas = prevPersonas.filter(p => !currPersonas.includes(p));

  for (const name of addedPersonas) {
    diffs.push({ field: "Persona", before: "", after: `+ ${name}` });
  }
  for (const name of removedPersonas) {
    diffs.push({ field: "Persona", before: `- ${name}`, after: "" });
  }

  // Signals
  const prevSignals = prev.signals.map(s => s.label).sort();
  const currSignals = curr.signals.map(s => s.label).sort();

  const addedSignals = currSignals.filter(s => !prevSignals.includes(s));
  const removedSignals = prevSignals.filter(s => !currSignals.includes(s));

  for (const label of addedSignals) {
    diffs.push({ field: "Signal", before: "", after: `+ ${label}` });
  }
  for (const label of removedSignals) {
    diffs.push({ field: "Signal", before: `- ${label}`, after: "" });
  }

  return diffs;
}
