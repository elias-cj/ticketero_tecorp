import { Skeleton } from "@/components/ui/skeleton";

export const CardSkeleton = () => (
  <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
    <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-12" />
      <Skeleton className="h-3 w-28" />
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-[200px] w-full" />
  </div>
);

export const TableSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);
