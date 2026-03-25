import { TAXONOMY, type IndustryNode } from "./data";
import { ATTRIBUTE_TEMPLATES, type AttributeTemplate } from "./templates";
import { normalizeValue } from "@/lib/scoring/normalize-value";

// ─── Build indexes on module load ───────────────────────────────────────────

const byId = new Map<string, IndustryNode>();
const byAlias = new Map<string, IndustryNode>();
const childrenOf = new Map<string, IndustryNode[]>();

for (const node of TAXONOMY) {
  byId.set(node.id, node);

  // Index children under their parent
  if (node.parentId) {
    const siblings = childrenOf.get(node.parentId) ?? [];
    siblings.push(node);
    childrenOf.set(node.parentId, siblings);
  }

  // Build alias index — name + aliases + clayMappings, all lowercased+normalized
  // Ordered sectors-first in TAXONOMY, so child aliases override parent aliases (last-write wins)
  const allAliases = [
    node.name,
    ...node.aliases,
    ...node.clayMappings,
  ];
  for (const alias of allAliases) {
    const key = normalizeValue(alias).toLowerCase();
    if (key) byAlias.set(key, node);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Resolve raw string to canonical IndustryNode via name, aliases, or clayMappings */
export function resolveIndustry(raw: string): IndustryNode | null {
  const key = normalizeValue(raw).toLowerCase();
  return byAlias.get(key) ?? null;
}

/** Get all children of a sector */
export function getChildren(parentId: string): IndustryNode[] {
  return childrenOf.get(parentId) ?? [];
}

/** Get parent sector for a child industry */
export function getParent(industryId: string): IndustryNode | null {
  const node = byId.get(industryId);
  if (!node?.parentId) return null;
  return byId.get(node.parentId) ?? null;
}

/** Check if childValue is a descendant of parentValue in taxonomy.
 *  Uses recursive parent traversal to support arbitrary depth. */
export function isChildOf(childValue: string, parentValue: string): boolean {
  const childNode = resolveIndustry(childValue);
  const parentNode = resolveIndustry(parentValue);
  if (!childNode || !parentNode) return false;
  if (childNode.id === parentNode.id) return false; // same node is not a child of itself

  let current = childNode;
  while (current.parentId) {
    if (current.parentId === parentNode.id) return true;
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return false;
}

/** Search taxonomy by query.
 *  Ranking: name prefix > alias prefix > name substring > alias substring.
 *  Within each tier, sectors before children. */
export function searchIndustries(query: string): IndustryNode[] {
  if (!query.trim()) return TAXONOMY;

  const q = normalizeValue(query).toLowerCase();
  const namePrefix: IndustryNode[] = [];
  const aliasPrefix: IndustryNode[] = [];
  const nameSubstring: IndustryNode[] = [];
  const aliasSubstring: IndustryNode[] = [];
  const seen = new Set<string>();

  for (const node of TAXONOMY) {
    const nameLower = node.name.toLowerCase();

    if (nameLower.startsWith(q) && !seen.has(node.id)) {
      namePrefix.push(node);
      seen.add(node.id);
      continue;
    }

    const aliasHasPrefix = node.aliases.some((a) =>
      normalizeValue(a).toLowerCase().startsWith(q),
    );
    if (aliasHasPrefix && !seen.has(node.id)) {
      aliasPrefix.push(node);
      seen.add(node.id);
      continue;
    }

    if (nameLower.includes(q) && !seen.has(node.id)) {
      nameSubstring.push(node);
      seen.add(node.id);
      continue;
    }

    const aliasHasSubstring = node.aliases.some((a) =>
      normalizeValue(a).toLowerCase().includes(q),
    );
    if (aliasHasSubstring && !seen.has(node.id)) {
      aliasSubstring.push(node);
      seen.add(node.id);
    }
  }

  // Within each tier, sectors (parentId === null) before children
  const sortSectorsFirst = (a: IndustryNode, b: IndustryNode) => {
    if (a.parentId === null && b.parentId !== null) return -1;
    if (a.parentId !== null && b.parentId === null) return 1;
    return 0;
  };

  return [
    ...namePrefix.sort(sortSectorsFirst),
    ...aliasPrefix.sort(sortSectorsFirst),
    ...nameSubstring.sort(sortSectorsFirst),
    ...aliasSubstring.sort(sortSectorsFirst),
  ];
}

/** Get attribute templates for an industry (also checks parent sector templates) */
export function getTemplates(industryId: string): AttributeTemplate[] {
  const node = byId.get(industryId);
  if (!node) return [];

  const directTemplates = ATTRIBUTE_TEMPLATES.filter(
    (t) => t.industryId === industryId,
  );

  // Also include parent sector templates if this is a child
  if (node.parentId) {
    const parentTemplates = ATTRIBUTE_TEMPLATES.filter(
      (t) => t.industryId === node.parentId,
    );
    return [...directTemplates, ...parentTemplates];
  }

  return directTemplates;
}

/** Check if resolved industry has a given tag.
 *  Accepts raw string — calls resolveIndustry internally. */
export function hasTag(rawValue: string, tag: string): boolean {
  const node = resolveIndustry(rawValue);
  return node?.tags?.includes(tag) ?? false;
}

/** Get all sectors (top-level nodes) */
export function getSectors(): IndustryNode[] {
  return TAXONOMY.filter((n) => n.parentId === null);
}

/** Get node by id */
export function getById(id: string): IndustryNode | null {
  return byId.get(id) ?? null;
}
