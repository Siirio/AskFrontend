// VIOLATES R2: cross-slice imports go through the slice's index.ts only —
// never through a window (@/catalog/ui/…). Expected error: boundaries/dependencies.
import { ProductCard } from "@/catalog/ui/ProductCard";

export const bad = ProductCard;
