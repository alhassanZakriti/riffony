import { Suspense } from "react";
import { TempoPage } from "@/features/tempo/tempo-page";
import { Skeleton } from "@/components/ui/controls";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      }
    >
      <TempoPage />
    </Suspense>
  );
}
