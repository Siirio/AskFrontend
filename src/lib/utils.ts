import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes, letting a later class win over an earlier one in the
 * same group. Every `shared/ui` primitive composes its variants through this so
 * a caller's `className` can override a default without an !important war.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
