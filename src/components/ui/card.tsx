import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  variant = "default",
  ...props
}: ComponentProps<"div"> & { variant?: "default" | "elevated" | "glass" | "featured" | "plain" }) {
  return (
    <div
      className={cn(
        variant === "default" && "rounded-(--radius-card) border border-line bg-surface/90",
        variant === "elevated" && "rounded-(--radius-card) border border-line bg-elevated/90",
        variant === "glass" && "surface-glass rounded-(--radius-card)",
        variant === "featured" &&
          "rounded-[20px] border border-accent/25 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent)_16%,transparent),color-mix(in_srgb,var(--elevated)_88%,transparent)_45%,var(--surface))] glow-ring",
        variant === "plain" && "rounded-(--radius-card)",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[16px] font-semibold tracking-tight text-fg">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
