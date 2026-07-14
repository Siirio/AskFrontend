// VIOLATES R3: a slice must never import from app/ — app is the composition
// root; no one sees app/. Expected error: boundaries/dependencies.
import { appProviders } from "@/app/providers";

export const bad = appProviders;
