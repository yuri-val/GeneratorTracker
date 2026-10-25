import {
  defaultFuelUnit, fixedPreset, fromDisplay, isFuelUnit, LITRES_PER_GALLON, roundDisplay, stepperStepFor, toDisplay,
  toStoredLitres,
} from '../units';
import { fmtFuel, fmtFuelValue, fmtRateValue, fuelUnitLabel, NBSP, rateUnitLabel } from '../format';

describe('fuel units', () => {
  it('defaults to US gallons only in gallon regions', () => {
    expect(defaultFuelUnit('US')).toBe('gal');
    expect(defaultFuelUnit('us')).toBe('gal');
    expect(defaultFuelUnit('LR')).toBe('gal');
    expect(defaultFuelUnit('UA')).toBe('L');
    expect(defaultFuelUnit('GB')).toBe('L');
    expect(defaultFuelUnit('CA')).toBe('L');
    expect(defaultFuelUnit(undefined)).toBe('L');
    expect(defaultFuelUnit(null)).toBe('L');
  });

  it('validates stored values', () => {
    expect(isFuelUnit('L')).toBe(true);
    expect(isFuelUnit('gal')).toBe(true);
    expect(isFuelUnit('imperial')).toBe(false);
    expect(isFuelUnit(null)).toBe(false);
  });

  it('converts between litres and US gallons', () => {
    expect(toDisplay(LITRES_PER_GALLON, 'gal')).toBeCloseTo(1, 10);
    expect(fromDisplay(5, 'gal')).toBeCloseTo(18.927, 3);
    expect(toDisplay(12.5, 'L')).toBe(12.5);
    expect(fromDisplay(12.5, 'L')).toBe(12.5);
  });

  it('stores typed gallons so they read back unchanged', () => {
    for (const typed of [0.1, 0.5, 1, 2.3, 5, 7.9, 26.4]) {
      const litres = toStoredLitres(typed, 'gal');
      expect(roundDisplay(toDisplay(litres, 'gal'))).toBe(typed);
    }
    expect(toStoredLitres(3.66, 'L')).toBe(3.7);
  });

  it('picks presets and stepper steps in the user unit', () => {
    expect(fixedPreset(3.6, 'L')).toBe(1);
    expect(fixedPreset(40, 'L')).toBe(20);
    expect(fixedPreset(3.6, 'gal')).toBe(0.5);
    expect(fixedPreset(40, 'gal')).toBe(5);
    expect(stepperStepFor(3.6, 'gal')).toBe(0.1);
    expect(stepperStepFor(40, 'gal')).toBe(1);
    expect(stepperStepFor(undefined, 'L')).toBe(0.1);
  });
});

describe('fuel formatting', () => {
  it('labels units per language', () => {
    expect(fuelUnitLabel('en', 'L')).toBe('L');
    expect(fuelUnitLabel('uk', 'L')).toBe('л');
    expect(fuelUnitLabel('en', 'gal')).toBe('gal');
    expect(fuelUnitLabel('uk', 'gal')).toBe('гал');
    expect(rateUnitLabel('en', 'gal')).toBe('gal/h');
    expect(rateUnitLabel('uk', 'L')).toBe('л/год');
  });

  it('formats stored litres in the user unit', () => {
    expect(fmtFuelValue(18.927, 'en', 'gal')).toBe('5.0');
    expect(fmtFuelValue(2.4, 'uk', 'L')).toBe('2,4');
    expect(fmtFuel(18.927, 'en', 'gal')).toBe(`≈${NBSP}5.0${NBSP}gal`);
    expect(fmtFuel(2.4, 'en', 'L', false)).toBe(`2.4${NBSP}L`);
    expect(fmtRateValue(0.51, 'en', 'L')).toBe('0.51');
    expect(fmtRateValue(1.9, 'en', 'gal')).toBe('0.50');
  });
});
