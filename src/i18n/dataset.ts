/**
 * Language selection for *dataset* values (plant names, conditions, families,
 * parts used) as opposed to UI strings, which live in `translations.ts`.
 *
 * The API returns both languages on every row, so switching language is a pure
 * render-time choice and needs no refetch.
 */

import type { GraphNode } from "../api/client";
import type { Lang } from "./translations";

/** Any API shape carrying a localizable dataset field and its Arabic twin. */
type Localizable<K extends string> = Partial<Record<K | `${K}_ar`, string | null>>;

/** Arabic when available, English otherwise — a partly translated row still reads. */
export function pick(
  lang: Lang,
  en: string | null | undefined,
  ar: string | null | undefined,
): string | null {
  if (lang === "ar" && ar) return ar;
  return en ?? null;
}

/** Same as `pick`, element-wise, falling back to the English list as a whole. */
export function pickList(
  lang: Lang,
  en: string[] | undefined,
  ar: string[] | undefined,
): string[] {
  if (lang === "ar" && ar?.length === en?.length) return ar ?? [];
  return en ?? [];
}

export const localName = (lang: Lang, p: Localizable<"local_name">) =>
  pick(lang, p.local_name, p.local_name_ar);

export const familyName = (lang: Lang, p: Localizable<"family">) =>
  pick(lang, p.family, p.family_ar);

export const partUsed = (lang: Lang, p: Localizable<"part_used">) =>
  pick(lang, p.part_used, p.part_used_ar);

/** Graph labels: Plant and Compound nodes have no Arabic label by design. */
export const nodeLabel = (lang: Lang, n: GraphNode) => pick(lang, n.label, n.label_ar) ?? n.label;

/**
 * The `source` column merges provenance tags ("Major-Neelam; Phytochemical
 * compounds"), so it is shown as a short badge rather than the raw string.
 */
export function sourceLabel(lang: Lang, source: string | null): string {
  if (!source) return "—";
  const ar = lang === "ar";
  if (source.includes("Neelam")) return ar ? "نيلام" : "Neelam";
  if (source.includes("Divakar")) return ar ? "ديفاكار" : "Divakar";
  if (source.includes("Phyto")) return ar ? "المركبات" : "Phyto";
  return source;
}
