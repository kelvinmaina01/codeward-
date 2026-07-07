/**
 * Gordon's brand avatar (the bot mascot). Rendered as an <img> so it can also stand in for a
 * LucideIcon in the sidebar nav — it accepts a `size` prop and ignores lucide-only props
 * (strokeWidth/absoluteStrokeWidth) the nav passes through.
 */
export function GordonIcon({ size = 20, className = '' }: { size?: number; className?: string } & Record<string, unknown>) {
  return (
    <img
      src="/gordon.png"
      alt="Gordon"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`rounded-full object-cover shrink-0 bg-white ${className}`}
    />
  );
}
