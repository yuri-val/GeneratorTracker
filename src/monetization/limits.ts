import type { Entitlements } from './products';

/**
 * Limits of the lite edition without the "Unlimited" purchase. They only stop *creating*
 * new records: anything already on the device or synced from the cloud stays visible and
 * usable, so a full-edition account signed in on a lite install never loses data.
 */
export const LIMITS = {
  generators: 3,
  maintenanceTasksPerGenerator: 2,
} as const;

export const canAddGenerator = (lite: boolean, ent: Entitlements, generatorCount: number) =>
  !lite || ent.unlimited || generatorCount < LIMITS.generators;

export const canAddMaintenanceTask = (lite: boolean, ent: Entitlements, tasksOfGenerator: number) =>
  !lite || ent.unlimited || tasksOfGenerator < LIMITS.maintenanceTasksPerGenerator;
