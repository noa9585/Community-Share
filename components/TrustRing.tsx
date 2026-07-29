type TrustRingProps = {
  score: number;
  size?: "sm" | "md" | "lg";
  innerBg?: string;
  className?: string;
};

const SIZES = {
  sm: { outer: "h-12 w-12", inner: "inset-[4px]", text: "text-xs" },
  md: { outer: "h-16 w-16", inner: "inset-[4px]", text: "text-sm" },
  lg: { outer: "h-20 w-20", inner: "inset-[5px]", text: "text-2xl" },
} as const;

export function TrustRing({
  score,
  size = "sm",
  innerBg = "#fff",
  className = "",
}: TrustRingProps) {
  const clamped = Math.min(10, Math.max(0, score));
  const progress = `${(clamped / 10) * 360}deg`;
  const config = SIZES[size];
  const display = clamped % 1 === 0 ? clamped.toFixed(0) : clamped.toFixed(1);

  return (
    <div
      className={`trust-ring ${config.outer} ${className}`}
      style={{ "--progress": progress } as React.CSSProperties}
      title={`מדד אמון: ${display}`}
    >
      <div
        className={`trust-ring-inner absolute ${config.inner} font-headline font-bold text-brand-deep ${config.text}`}
        style={{ "--inner-bg": innerBg } as React.CSSProperties}
      >
        {display}
      </div>
    </div>
  );
}

export function trustScoreFromRating(rating: number): number {
  return Math.min(10, Math.max(1, rating));
}
