import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface HostIconProps {
  /** Brand icon URL (served from `public/hosts/`). */
  iconUrl?: string;
  /** 2-letter code used for the text fallback. */
  code: string;
  /** Accessible label / alt text. */
  name?: string;
  /** Sizing for the icon wrapper. */
  className?: string;
  /** Classes applied only to the text-badge fallback (e.g. brand color). */
  fallbackClassName?: string;
  /** Optional custom fallback node rendered when no icon is available. */
  fallback?: ReactNode;
}

/**
 * Renders a host's brand icon, falling back to a colored 2-letter badge
 * (or a custom node) when the image is missing or fails to load.
 */
export function HostIcon({
  iconUrl,
  code,
  name,
  className,
  fallbackClassName,
  fallback,
}: HostIconProps) {
  const [errored, setErrored] = useState(false);
  const showImg = Boolean(iconUrl) && !errored;

  if (showImg) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden", className)}>
        <img
          src={iconUrl}
          alt={name ?? code}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        fallbackClassName,
        className
      )}
    >
      {fallback ?? <span className="text-[11px] font-bold">{code}</span>}
    </span>
  );
}
