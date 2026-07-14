// VIOLATES R1: shared/ (the toolbox) must never import a slice — the toolbox
// knows nothing about the business. Expected error: boundaries/dependencies.
import { authPublicApi } from "@/auth";

export const bad = authPublicApi;
