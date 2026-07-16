// Minimal class-name joiner. Dependency-free: drops falsy values and joins with spaces.
// Keel does not use clsx/tailwind-merge; token classes are written to not collide.
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
