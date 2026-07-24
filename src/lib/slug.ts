/** URL slug for a brand: lowercase ASCII, dashes. "100 ačiū" → "100-aciu". */
export function slugify(brand: string): string {
  return (
    brand
      .normalize("NFD")
      // Strip the combining diacritics NFD splits off (ą→a, š→s, ū→u, …).
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

/** slug → brand for every brand, throwing if two brands collide on a slug —
    a collision would silently serve one company under the other's URL. */
export function slugIndex(brands: string[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const brand of brands) {
    const slug = slugify(brand);
    const taken = index.get(slug);
    if (taken && taken !== brand)
      throw new Error(`slug collision: "${brand}" and "${taken}" → ${slug}`);
    index.set(slug, brand);
  }
  return index;
}
