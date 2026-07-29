type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
};

export function MaterialIcon({
  name,
  className = "",
  filled = false,
  size,
}: MaterialIconProps) {
  const style = filled
    ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
    : undefined;

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ ...style, ...(size ? { fontSize: size } : {}) }}
      aria-hidden
    >
      {name}
    </span>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  "כלי עבודה": "handyman",
  מטבח: "kitchen",
  "קמפינג וטיולים": "camera_rear",
  "ילדים וצעצועים": "child_care",
  גינון: "grass",
  ספורט: "sports_soccer",
  "פנאי ובידור": "sports_esports",
  "אירוח וציוד": "flatware",
  משחקים: "sports_esports",
  ספרים: "menu_book",
  "מזוודות וציוד נסיעות": "luggage",
  אירועים: "celebration",
};

export function getCategoryIcon(categoryName?: string | null): string {
  if (!categoryName) return "inventory_2";
  return CATEGORY_ICONS[categoryName] ?? "category";
}

export function ItemImagePlaceholder({
  categoryName,
  className = "",
}: {
  categoryName?: string | null;
  className?: string;
}) {
  const icon = getCategoryIcon(categoryName);
  return (
    <div
      className={`flex items-center justify-center bg-surface-container text-secondary/40 ${className}`}
    >
      <MaterialIcon name={icon} size={48} />
    </div>
  );
}
