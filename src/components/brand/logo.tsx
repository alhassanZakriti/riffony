import Image from "next/image";
import { BRAND } from "@/lib/product/brand";
import { cn } from "@/lib/utils";

/** Native wordmark aspect (1024×94). */
const WORDMARK_RATIO = 1024 / 94;
/** Collapsed mark aspect (149×90) — wider than tall, must not be forced square. */
const COLLAPSED_MARK_RATIO = 100 / 90;

export function BrandMark({
  className,
  size = 28,
  collapsed = false,
}: {
  className?: string;
  /** Height in px. Width follows the asset aspect ratio. */
  size?: number;
  /** Use the wide collapsed mark instead of the square app icon. */
  collapsed?: boolean;
}) {
  const src = collapsed ? BRAND.iconSrcCollapsed : BRAND.iconSrc;
  const ratio = collapsed ? COLLAPSED_MARK_RATIO : 1;
  const height = size;
  const width = Math.round(height * ratio);

  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      className={cn("shrink-0 object-contain", className)}
      style={{ width, height }}
      aria-hidden
      priority
    />
  );
}

/** Official RIFFONY wordmark (wide lockup). */
export function BrandLockup({
  className,
  height = 22,
}: {
  className?: string;
  /** Render height in px; width follows the wordmark aspect ratio. */
  height?: number;
}) {
  const width = Math.round(height * WORDMARK_RATIO);
  return (
    <Image
      src={BRAND.wordmarkSrc}
      alt={BRAND.name}
      width={width}
      height={height}
      className={cn("h-auto w-auto shrink-0 object-contain", className)}
      style={{ height, width }}
      priority
    />
  );
}

export function BrandWordmark({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return <BrandMark collapsed size={28} />;
  }

  return (
    <div className="flex min-w-0 items-center">
      <BrandLockup height={18} className="max-w-full" />
    </div>
  );
}
