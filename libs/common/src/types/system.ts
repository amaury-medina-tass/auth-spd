export type SystemType = "DAGRD" | "SICGEM";

export const SYSTEMS = ["DAGRD", "SICGEM"] as const;

export function isValidSystem(value: string): value is SystemType {
    return SYSTEMS.includes(value as SystemType);
}
