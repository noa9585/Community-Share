import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { ItemCard } from "@/components/ItemCard";
import { MaterialIcon } from "@/components/MaterialIcon";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { RESIDENCE_AREAS } from "@/lib/validation/schemas";

export const metadata: Metadata = {
  title: "קטלוג | שיתוף קהילתי",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; area?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const repo = await getRepository();

  const [items, categories] = await Promise.all([
    repo.getCatalogItems({
      q: params.q,
      category: params.category,
      area: params.area,
    }),
    repo.getCategories(),
  ]);

  return (
    <AppNav user={user} activePath="/catalog" title="שיתוף קהילתי" showSearch>
      <div className="flex gap-gutter">
        <aside className="sticky top-24 hidden h-fit w-64 shrink-0 flex-col gap-8 lg:flex">
          <section>
            <h3 className="font-headline mb-4 border-b border-secondary/10 pb-2 text-lg text-secondary">
              קטגוריות
            </h3>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/catalog?${new URLSearchParams({
                      ...(params.q ? { q: params.q } : {}),
                      ...(params.area ? { area: params.area } : {}),
                      category: category.id,
                    }).toString()}`}
                    className={`block text-sm transition-colors hover:text-primary ${
                      params.category === category.id
                        ? "font-semibold text-primary"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-headline mb-4 border-b border-secondary/10 pb-2 text-lg text-secondary">
              אזור
            </h3>
            <form action="/catalog" className="space-y-2">
              {params.q && <input type="hidden" name="q" value={params.q} />}
              {params.category && <input type="hidden" name="category" value={params.category} />}
              <select
                name="area"
                defaultValue={params.area ?? ""}
                className="w-full rounded-lg border border-outline-variant bg-white p-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">כל השכונה</option>
                {RESIDENCE_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-lg border border-secondary py-2 text-sm text-secondary hover:bg-secondary/5"
              >
                סינון
              </button>
            </form>
          </section>
          <Link
            href="/catalog"
            className="block rounded-lg border border-secondary py-2 text-center text-sm font-medium text-secondary transition-colors hover:bg-secondary/5"
          >
            נקה את כל המסננים
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-headline text-4xl text-on-background">הקטלוג הקהילתי שלנו</h2>
            <p className="text-sm text-on-surface-variant">מציג {items.length} פריטים</p>
          </div>

          <form action="/catalog" className="mb-6 flex gap-2 lg:hidden">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="חיפוש..."
              className="flex-1 rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-secondary px-4 py-2 text-sm text-on-secondary"
            >
              חפש
            </button>
          </form>

          {items.length === 0 ? (
            <p className="py-12 text-center text-on-surface-variant">לא נמצאו פריטים</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} variant="catalog" />
              ))}
            </div>
          )}

          <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-primary/10 bg-primary-container p-6">
              <p className="mb-2 text-sm text-on-primary-container">פריטים בקטלוג</p>
              <h5 className="font-headline text-4xl text-primary">{items.length}</h5>
            </div>
            <div className="rounded-xl border border-secondary/10 bg-secondary-container p-6">
              <p className="mb-2 text-sm text-on-secondary-container">קטגוריות</p>
              <h5 className="font-headline text-4xl text-secondary">{categories.length}</h5>
            </div>
            <div className="rounded-xl border border-tertiary/10 bg-tertiary-container p-6">
              <p className="mb-2 text-sm text-on-tertiary-container">קהילה פעילה</p>
              <h5 className="font-headline text-4xl text-tertiary">✓</h5>
            </div>
          </div>
        </div>
      </div>

      {user?.status === "approved" && (
        <Link
          href="/items/new"
          className="fixed bottom-8 left-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-brand-mint text-brand-deep shadow-lg transition-all hover:scale-105 active:scale-90"
          aria-label="הוסף פריט לשיתוף"
        >
          <MaterialIcon name="add" size={32} />
        </Link>
      )}
    </AppNav>
  );
}
