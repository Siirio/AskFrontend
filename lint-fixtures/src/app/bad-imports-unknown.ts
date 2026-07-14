// VIOLATES the folder law from the import side: nothing may import from a
// folder that is not a declared element. Expected error: boundaries/no-unknown.
import { widget } from "@/widgets/widget";

export const bad = widget;
