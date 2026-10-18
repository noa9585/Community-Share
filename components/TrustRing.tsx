/** The item's condition (1–10) shown as a ring that fills up with the score. */

function clampScore(score: number): number {
  return Math.min(10, Math.max(0, score));
}

function formatScore(score: number): string {
  return score % 1 === 0 ? score.toFixed(0) : score.toFixed(1);
}

type TrustRingProps = {
  score: number;
  className?: string;
};

/** Small ring in the corner of a catalog card. */
export function TrustRingCatalog({ score, className = "" }: TrustRingProps) {
  const clamped = clampScore(score);

  return (
    <div
      className={`trust-ring ${className}`}
      style={{ "--progress": `${(clamped / 10) * 360}deg` } as React.CSSProperties}
    >
      <span className="text-[14px] font-bold text-secondary">{formatScore(clamped)}</span>
    </div>
  );
}

/** Large ring on the item page. */
export function TrustRingLarge({ score, className = "" }: TrustRingProps) {
  const clamped = clampScore(score);

  return (
    <div
      className={`relative flex h-20 w-20 items-center justify-center rounded-full p-1 ${className}`}
      style={{ background: `conic-gradient(#65DCD5 ${(clamped / 10) * 100}%, #e2e2e1 0)` }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
        <span className="font-headline text-2xl font-bold text-[#321E48]">{formatScore(clamped)}</span>
      </div>
    </div>
  );
}

export function trustScoreFromRating(rating: number): number {
  return Math.min(10, Math.max(1, rating));
}
