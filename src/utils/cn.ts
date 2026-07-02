/** Tiny className combiner (avoids pulling in clsx for such a small need). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
