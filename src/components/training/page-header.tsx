import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
        )}
        <h1 className="font-display text-[30px] font-semibold tracking-tight text-fg sm:text-[36px]">{title}</h1>
        {description && <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
