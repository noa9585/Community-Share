"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { MaterialIcon } from "@/components/MaterialIcon";
import { searchItemsAction } from "@/lib/actions/items";

type Suggestion = { id: string; name: string };

/**
 * Free-text catalog search with suggestions. Submitting goes to the catalog;
 * picking a suggestion opens the item directly.
 */
export function SearchAutocomplete({
  variant = "compact",
  defaultValue = "",
  placeholder = "חיפוש פריטים...",
}: {
  variant?: "compact" | "hero";
  defaultValue?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequest = useRef(0);
  const listId = useId();

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);

    const term = value.trim();
    if (term.length < 2) {
      latestRequest.current += 1;
      setResults([]);
      return;
    }

    timer.current = setTimeout(async () => {
      const requestId = ++latestRequest.current;
      const items = await searchItemsAction(term);
      // Ignore answers that arrive after a newer keystroke.
      if (requestId === latestRequest.current) {
        setResults(items);
        setOpen(true);
      }
    }, 300);
  }

  const hero = variant === "hero";

  return (
    <form
      action="/catalog"
      role="search"
      className={`relative flex items-center ${
        hero
          ? "w-full rounded-2xl border border-secondary/10 bg-white p-2 shadow-xl shadow-secondary/5"
          : "rounded-full border border-outline-variant/30 bg-surface-container px-3"
      }`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <MaterialIcon
        name="search"
        className={hero ? "mx-2 text-2xl text-secondary/60" : "text-secondary"}
      />
      <input
        name="q"
        type="search"
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        maxLength={100}
        autoComplete="off"
        role="combobox"
        aria-label="חיפוש פריטים"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && results.length > 0}
        className={`min-w-0 flex-1 border-none bg-transparent text-brand-deep outline-none placeholder:opacity-50 focus:ring-0 ${
          hero ? "px-2 py-3 text-lg" : "px-2 py-2 text-sm"
        }`}
      />
      {hero && (
        <button
          type="submit"
          className="rounded-xl bg-brand-deep px-6 py-3 font-bold text-primary-container transition-all hover:brightness-110 active:scale-95"
        >
          חפש
        </button>
      )}
      {open && results.length > 0 && (
        <ul
          id={listId}
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-secondary/15 bg-white text-right shadow-lg">
          {results.map((item) => (
            <li key={item.id}>
              <Link
                href={`/items/${item.id}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-brand-deep hover:bg-primary-container/50 focus:bg-primary-container/50 focus:outline-none"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
