"use client";

import { useState } from "react";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { MaterialIcon } from "@/components/MaterialIcon";
import { adminAreaAction, adminCategoryAction } from "@/lib/actions/admin";
import type { Area, Category, TaxonomyUsage } from "@/types/database";

const INPUT =
  "min-w-0 flex-1 rounded-lg border-none bg-surface-container-low px-3 py-2 font-body-md text-on-surface focus:ring-2 focus:ring-trust-mint";
const PRIMARY =
  "rounded-lg bg-brand-mint px-4 py-2 text-sm font-bold text-brand-deep disabled:opacity-60";
const DANGER =
  "rounded-lg bg-error/10 px-4 py-2 text-sm font-medium text-error hover:bg-error/15 disabled:opacity-60";

/** Icons an admin can choose for a category (Material Symbols names). */
const CATEGORY_ICONS: { name: string; label: string }[] = [
  { name: "handyman", label: "כלי עבודה" },
  { name: "construction", label: "בנייה ושיפוצים" },
  { name: "flatware", label: "אירוח ומטבח" },
  { name: "kitchen", label: "מכשירי מטבח" },
  { name: "celebration", label: "אירועים" },
  { name: "sports_esports", label: "משחקים" },
  { name: "toys", label: "צעצועים" },
  { name: "menu_book", label: "ספרים" },
  { name: "luggage", label: "נסיעות" },
  { name: "child_care", label: "תינוקות וילדים" },
  { name: "hiking", label: "טיולים" },
  { name: "camping", label: "קמפינג" },
  { name: "sports_soccer", label: "ספורט" },
  { name: "directions_bike", label: "אופניים" },
  { name: "grass", label: "גינה" },
  { name: "cleaning_services", label: "ניקיון" },
  { name: "chair", label: "ריהוט" },
  { name: "checkroom", label: "ביגוד" },
  { name: "devices", label: "אלקטרוניקה" },
  { name: "photo_camera", label: "צילום" },
  { name: "music_note", label: "מוזיקה" },
  { name: "medical_services", label: "ציוד רפואי" },
  { name: "pets", label: "חיות מחמד" },
  { name: "category", label: "כללי" },
];

function IconPicker({ defaultIcon }: { defaultIcon: string }) {
  const [icon, setIcon] = useState(defaultIcon);
  const options = CATEGORY_ICONS.some((option) => option.name === icon)
    ? CATEGORY_ICONS
    : [{ name: icon, label: icon }, ...CATEGORY_ICONS];

  return (
    <div className="flex items-center gap-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-secondary">
        <MaterialIcon name={icon} />
      </span>
      <select
        name="icon"
        value={icon}
        onChange={(event) => setIcon(event.target.value)}
        aria-label="אייקון"
        className="rounded-lg border-none bg-surface-container-low px-3 py-2 font-body-md text-on-surface focus:ring-2 focus:ring-trust-mint"
      >
        {options.map((option) => (
          <option key={option.name} value={option.name}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CategoryRow({ category, itemCount }: { category: Category; itemCount: number }) {
  const [state, action, pending] = useFormAction(adminCategoryAction);

  return (
    <li className="space-y-2 p-4">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={category.id} />
        <IconPicker defaultIcon={category.icon ?? "category"} />
        <input
          name="name"
          defaultValue={category.name}
          required
          minLength={2}
          maxLength={60}
          aria-label="שם הקטגוריה"
          className={INPUT}
        />
        <span className="text-sm text-on-surface-variant">{itemCount} פריטים</span>
        <button name="intent" value="save" disabled={pending} className={PRIMARY}>
          שמירה
        </button>
        <button
          name="intent"
          value="delete"
          disabled={pending || itemCount > 0}
          title={itemCount > 0 ? "יש פריטים בקטגוריה. אפשר לשנות את שמה" : undefined}
          onClick={(event) => {
            if (!confirm(`למחוק את הקטגוריה "${category.name}"?`)) event.preventDefault();
          }}
          className={DANGER}
        >
          מחיקה
        </button>
      </form>
      <FormMessage state={state} />
    </li>
  );
}

function NewCategory() {
  const [state, action, pending] = useFormAction(adminCategoryAction);

  return (
    <li className="space-y-2 bg-surface-container-lowest p-4">
      <form
        action={action}
        className="flex flex-wrap items-center gap-2"
      >
        <IconPicker defaultIcon="category" />
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          placeholder="שם קטגוריה חדשה"
          aria-label="שם קטגוריה חדשה"
          className={INPUT}
        />
        <button name="intent" value="save" disabled={pending} className={PRIMARY}>
          הוספה
        </button>
      </form>
      <FormMessage state={state} />
    </li>
  );
}

function AreaRow({ area, usage }: { area: Area; usage: { users: number; items: number } }) {
  const [state, action, pending] = useFormAction(adminAreaAction);
  const inUse = usage.users + usage.items > 0;

  return (
    <li className="space-y-2 p-4">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={area.id} />
        <input
          name="name"
          defaultValue={area.name}
          required
          minLength={2}
          maxLength={40}
          aria-label="שם האזור"
          className={INPUT}
        />
        <span className="text-sm text-on-surface-variant">
          {usage.users} חברים · {usage.items} פריטים
        </span>
        <button name="intent" value="save" disabled={pending} className={PRIMARY}>
          שמירה
        </button>
        <button
          name="intent"
          value="delete"
          disabled={pending || inUse}
          title={inUse ? "יש חברים או פריטים באזור. אפשר לשנות את שמו" : undefined}
          onClick={(event) => {
            if (!confirm(`למחוק את האזור "${area.name}"?`)) event.preventDefault();
          }}
          className={DANGER}
        >
          מחיקה
        </button>
      </form>
      <FormMessage state={state} />
    </li>
  );
}

function NewArea() {
  const [state, action, pending] = useFormAction(adminAreaAction);

  return (
    <li className="space-y-2 bg-surface-container-lowest p-4">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input
          name="name"
          required
          minLength={2}
          maxLength={40}
          placeholder="שם אזור חדש"
          aria-label="שם אזור חדש"
          className={INPUT}
        />
        <button name="intent" value="save" disabled={pending} className={PRIMARY}>
          הוספה
        </button>
      </form>
      <FormMessage state={state} />
    </li>
  );
}

export function AdminTaxonomy({
  categories,
  areas,
  usage,
}: {
  categories: Category[];
  areas: Area[];
  usage: TaxonomyUsage;
}) {
  return (
    <div className="space-y-stack-lg">
      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-brand-deep">קטגוריות פריטים</h2>
        <p className="text-sm text-on-surface-variant">
          שינוי שם או אייקון מתעדכן מיד בכל הפריטים שבקטגוריה. קטגוריה שיש בה פריטים לא ניתנת
          למחיקה.
        </p>
        <ul className="divide-y divide-secondary/5 overflow-hidden rounded-xl border border-secondary/10 bg-white">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              itemCount={usage.categories[category.id] ?? 0}
            />
          ))}
          <NewCategory />
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-brand-deep">אזורים</h2>
        <p className="text-sm text-on-surface-variant">
          הרשימה שמופיעה בהרשמה, בפרופיל, בהוספת פריט ובסינון הקטלוג. שינוי שם מעדכן את כל החברים
          והפריטים באזור. אזור שיש בו חברים או פריטים לא ניתן למחיקה.
        </p>
        <ul className="divide-y divide-secondary/5 overflow-hidden rounded-xl border border-secondary/10 bg-white">
          {areas.map((area) => (
            <AreaRow
              key={area.id}
              area={area}
              usage={usage.areas[area.id] ?? { users: 0, items: 0 }}
            />
          ))}
          <NewArea />
        </ul>
      </section>
    </div>
  );
}
