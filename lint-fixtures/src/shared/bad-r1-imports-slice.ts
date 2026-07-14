// VIOLATES R1: shared/ (the toolbox) must never import a slice — the toolbox
// knows nothing about the business. Expected error: boundaries/element-types.
import { authPublicApi } from "@/auth";

export const bad = authPublicApi;
