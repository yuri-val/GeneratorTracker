// Fuel units (since 3.2.0). Everything is stored in litres — Generator.tankCapacity, Refill.amount and the
// litres-per-hour math in fuel.ts never change; US gallons exist only at the edges: what the user types in
// and what the screens show. The choice is a per-device preference (not synced).

export type FuelUnit = 'L' | 'gal';

/** One US liquid gallon. */
export const LITRES_PER_GALLON = 3.785411784;

/** Countries that measure fuel in US gallons; every other region defaults to litres. */
const GALLON_REGIONS = new Set(['US', 'LR', 'MM']);

export const defaultFuelUnit = (regionCode?: string | null): FuelUnit =>
  regionCode && GALLON_REGIONS.has(regionCode.toUpperCase()) ? 'gal' : 'L';

export const isFuelUnit = (value: unknown): value is FuelUnit => value === 'L' || value === 'gal';

/** Litres → the unit shown to the user. */
export const toDisplay = (litres: number, unit: FuelUnit) => (unit === 'gal' ? litres / LITRES_PER_GALLON : litres);

/** A value typed in the user's unit → litres for storage. */
export const fromDisplay = (value: number, unit: FuelUnit) => (unit === 'gal' ? value * LITRES_PER_GALLON : value);

/** One decimal, as the inputs and steppers show it. */
export const roundDisplay = (value: number) => Math.round(value * 10) / 10;

/**
 * Litres to store for a value typed in the user's unit. Gallons keep two decimals of litres so a value
 * shown as "5.0 gal" reads back as 5.0 after a round trip.
 */
export const toStoredLitres = (value: number, unit: FuelUnit) =>
  unit === 'gal' ? Math.round(fromDisplay(value, unit) * 100) / 100 : Math.round(value * 10) / 10;

/** Refill sheet: the fixed preset — 1 L / 20 L in litres, ½ gal / 5 gal in gallons (by tank size in litres). */
export const fixedPreset = (tankLitres: number, unit: FuelUnit) =>
  unit === 'gal' ? (tankLitres <= 10 ? 0.5 : 5) : tankLitres <= 10 ? 1 : 20;

/** Refill sheet: the stepper step in the user's unit — fine for small tanks, coarse for big ones. */
export const stepperStepFor = (tankLitres: number | undefined, unit: FuelUnit) => {
  const big = !!tankLitres && tankLitres > 10;
  return unit === 'gal' ? (big ? 1 : 0.1) : big ? 1 : 0.1;
};
