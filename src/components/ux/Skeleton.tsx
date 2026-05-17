export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-2 w-32" />
    </div>
  );
}
