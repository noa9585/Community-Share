import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { ItemCard } from "@/components/ItemCard";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "קטלוג | Community Share",
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
    <div>
      <AppNav user={user} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">קטלוג פריטים</h1>

        <SearchAutocomplete />

        <form className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 md:grid-cols-4">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="חיפוש"
            className="rounded-xl border border-zinc-300 px-3 py-2"
          />
          <select
            name="category"
            defaultValue={params.category ?? ""}
            className="rounded-xl border border-zinc-300 px-3 py-2"
          >
            <option value="">כל הקטגוריות</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            name="area"
            defaultValue={params.area}
            placeholder="אזור"
            className="rounded-xl border border-zinc-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white"
          >
            סינון
          </button>
        </form>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
        {items.length === 0 && (
          <p className="text-center text-zinc-500">לא נמצאו פריטים</p>
        )}
      </main>
    </div>
  );
}
