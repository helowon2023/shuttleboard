export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-5 ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
    </div>
  )
}
