type TrustRingGradientProps = {
  score: number;
  innerBg?: string;
  className?: string;
};

export function TrustRingGradient({
  score,
  innerBg = "#D9FFF4",
  className = "",
}: TrustRingGradientProps) {
  const clamped = Math.min(10, Math.max(0, score));
  const percentage = `${(clamped / 10) * 100}%`;
  const display = clamped % 1 === 0 ? clamped.toFixed(0) : clamped.toFixed(1);

  return (
    <div className={`relative flex h-12 w-12 items-center justify-center ${className}`}>
      <div
        className="trust-ring-gradient absolute inset-0 rounded-full"
        style={{ "--percentage": percentage } as React.CSSProperties}
      />
      <div
        className="absolute inset-[4px] flex items-center justify-center rounded-full"
        style={{ backgroundColor: innerBg }}
      >
        <span className="text-xs font-bold">{display}</span>
      </div>
    </div>
  );
}

type TrustRingCatalogProps = {
  score: number;
  className?: string;
};

export function TrustRingCatalog({ score, className = "" }: TrustRingCatalogProps) {
  const clamped = Math.min(10, Math.max(0, score));
  const progress = `${(clamped / 10) * 360}deg`;
  const display = clamped % 1 === 0 ? clamped.toFixed(0) : clamped.toFixed(1);

  return (
    <div
      className={`trust-ring ${className}`}
      style={{ "--progress": progress } as React.CSSProperties}
    >
      <span className="text-[14px] font-bold text-secondary">{display}</span>
    </div>
  );
}

type TrustRingLargeProps = {
  score: number;
  className?: string;
};

export function TrustRingLarge({ score, className = "" }: TrustRingLargeProps) {
  const clamped = Math.min(10, Math.max(0, score));
  const progress = `${(clamped / 10) * 100}%`;

  return (
    <div
      className={`relative flex h-20 w-20 items-center justify-center rounded-full p-1 ${className}`}
      style={
        {
          background: `conic-gradient(#65DCD5 ${progress}, #e2e2e1 0)`,
        } as React.CSSProperties
      }
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
        <span className="font-headline text-2xl font-bold text-[#321E48]">
          {clamped % 1 === 0 ? clamped.toFixed(0) : clamped.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

export function TrustRingAdmin({ score, className = "" }: TrustRingCatalogProps) {
  const clamped = Math.min(10, Math.max(0, score));
  const progress = `${(clamped / 10) * 360}deg`;
  const display = clamped % 1 === 0 ? clamped.toFixed(0) : clamped.toFixed(1);

  return (
    <div
      className={`trust-ring trust-ring-admin flex h-12 w-12 items-center justify-center rounded-full ${className}`}
      style={{ "--progress": progress, background: `conic-gradient(#65DCD5 ${progress}, #e2e2e1 0deg)` } as React.CSSProperties}
    >
      <span>{display}</span>
    </div>
  );
}

export function trustScoreFromRating(rating: number): number {
  return Math.min(10, Math.max(1, rating));
}
