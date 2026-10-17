import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { CatalogItemCard } from "@/components/ItemCard";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { catalogFiltersSchema, todayInIsrael } from "@/lib/validation/schemas";

export const metadata: Metadata = {
  title: "קטלוג | שיתוף קהילתי",
};

const FIELD =
  "font-body-md w-full rounded-lg border border-outline-variant bg-white p-2 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20";
const FIELD_LABEL = "mb-1 block font-label-md text-label-md text-secondary";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const raw = await searchParams;

  // The query string is user input: anything that does not validate is ignored.
  const filters = catalogFiltersSchema.parse({
    q: first(raw.q),
    category: first(raw.category),
    area: first(raw.area),
    from: first(raw.from),
    to: first(raw.to),
  });

  const repo = await getRepository();
  const [items, categories, areas] = await Promise.all([
    repo.getCatalogItems(filters),
    repo.getCategories(),
    repo.getAreas(),
  ]);

  const today = todayInIsrael();
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <AppNav user={user} activePath="/catalog" headerTitle="קטלוג" showAddButton>
      <div className="flex flex-col gap-gutter lg:flex-row">
        <aside className="h-fit shrink-0 rounded-xl border border-secondary/10 bg-white/70 p-4 lg:sticky lg:top-24 lg:w-64">
          <form action="/catalog" className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
            {filters.q && <input type="hidden" name="q" value={filters.q} />}
            <div className="col-span-2 lg:col-span-1">
              <label htmlFor="filter-category" className={FIELD_LABEL}>
                קטגוריה
              </label>
              <select
                id="filter-category"
                name="category"
                defaultValue={filters.category ?? ""}
                className={FIELD}
              >
                <option value="">כל הקטגוריות</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <label htmlFor="filter-area" className={FIELD_LABEL}>
                אזור
              </label>
              <select
                id="filter-area"
                name="area"
                defaultValue={filters.area ?? ""}
                className={FIELD}
              >
                <option value="">כל האזורים</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-from" className={FIELD_LABEL}>
                זמין מתאריך
              </label>
              <input
                id="filter-from"
                name="from"
                type="date"
                min={today}
                defaultValue={filters.from ?? ""}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="filter-to" className={FIELD_LABEL}>
                עד תאריך
              </label>
              <input
                id="filter-to"
                name="to"
                type="date"
                min={today}
                defaultValue={filters.to ?? ""}
                className={FIELD}
              />
            </div>
            <button
              type="submit"
              className="col-span-2 rounded-lg bg-secondary py-2 font-label-md text-label-md text-on-secondary transition-all hover:opacity-90 lg:col-span-1"
            >
              סינון
            </button>
            {hasFilters && (
              <Link
                href="/catalog"
                className="col-span-2 rounded-lg border border-secondary py-2 text-center font-label-md text-label-md text-secondary transition-colors hover:bg-secondary/5 lg:col-span-1"
              >
                נקה מסננים
              </Link>
            )}
          </form>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
            <h1 className="font-headline-md text-headline-md-mobile text-on-background md:text-headline-md">
              {filters.q ? `תוצאות עבור "${filters.q}"` : "הקטלוג הקהילתי"}
            </h1>
            <p className="font-label-md text-label-md text-on-surface-variant">
              {items.length} פריטים
            </p>
          </div>

          {items.length === 0 ? (
            <p className="rounded-xl border border-secondary/10 bg-white/70 py-12 text-center text-on-surface-variant">
              לא נמצאו פריטים מתאימים
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <CatalogItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppNav>
  );
}
