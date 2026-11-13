import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-semibold tracking-tight transition-[transform,background,border-color,box-shadow,opacity,color] duration-200 disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(135deg,#9b6dff_0%,#7447f5_55%,#527bff_100%)] text-accent-fg shadow-[0_10px_30px_-14px_var(--glow-brand)] hover:brightness-110",
        secondary:
          "bg-elevated/80 text-fg border border-line hover:border-line-strong hover:bg-panel/60",
        ghost: "text-muted hover:text-fg hover:bg-elevated/70",
        danger: "bg-error/10 text-error border border-error/30 hover:bg-error/15",
        destructive: "bg-error/10 text-error border border-error/30 hover:bg-error/15",
        lime: "bg-lime text-[#0c1206] shadow-[0_10px_30px_-14px_color-mix(in_srgb,var(--lime)_45%,transparent)] hover:brightness-105",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ComponentProps<"button"> & Variants) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
