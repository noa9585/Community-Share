"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { searchItemsAction } from "@/lib/actions/items";

export function SearchAutocomplete() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const items = await searchItemsAction(query);
      setResults(items);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש עם השלמה אוטומטית..."
        className="w-full rounded-xl border border-zinc-300 px-4 py-3"
      />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => router.push(`/items/${item.id}`)}
                className="block w-full px-4 py-2 text-right hover:bg-zinc-50"
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
