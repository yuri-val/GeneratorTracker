import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { getFuelUnit, saveFuelUnit } from '../utils/storage';
import { defaultFuelUnit, type FuelUnit } from '../utils/units';
import { fmtFuel, fmtFuelValue, fmtRateValue, fuelUnitLabel, rateUnitLabel } from '../utils/format';

interface FuelUnitValue {
  unit: FuelUnit;
  setUnit: (unit: FuelUnit) => void;
}

const regionDefault = () => defaultFuelUnit(Localization.getLocales()[0]?.regionCode);

const FuelUnitContext = createContext<FuelUnitValue>({ unit: 'L', setUnit: () => {} });

/**
 * "Settings → Fuel units". Until the user picks one, the device region decides (US gallons in the US,
 * litres elsewhere). Stored values stay in litres; see src/utils/units.ts.
 */
export function FuelUnitProvider({ children }: { children: React.ReactNode }) {
  const [unit, setState] = useState<FuelUnit>(regionDefault);

  useEffect(() => {
    getFuelUnit().then(saved => saved && setState(saved));
  }, []);

  const setUnit = useCallback((value: FuelUnit) => {
    setState(value);
    saveFuelUnit(value);
  }, []);

  const value = useMemo(() => ({ unit, setUnit }), [unit, setUnit]);
  return <FuelUnitContext.Provider value={value}>{children}</FuelUnitContext.Provider>;
}

export const useFuelUnitPreference = () => useContext(FuelUnitContext);

/** Formatters bound to the current language and fuel unit. Values passed in are always litres. */
export function useFuelFormat() {
  const { unit } = useContext(FuelUnitContext);
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useMemo(
    () => ({
      unit,
      /** "л" / "L" / "гал" / "gal". */
      unitLabel: fuelUnitLabel(lang, unit),
      /** "л/год" / "L/h" / "гал/год" / "gal/h". */
      rateLabel: rateUnitLabel(lang, unit),
      /** Litres → "2.4" in the user's unit. */
      value: (litres: number, digits = 1) => fmtFuelValue(litres, lang, unit, digits),
      /** Litres → "≈ 2.4 L". */
      text: (litres: number, approx = true) => fmtFuel(litres, lang, unit, approx),
      /** Litres per hour → "0.51" in the user's unit per hour. */
      rate: (lph: number) => fmtRateValue(lph, lang, unit),
    }),
    [lang, unit],
  );
}
