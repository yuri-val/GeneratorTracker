import { getHoursOverTime, getFuelOverTime, getGeneratorComparison, getFuelDistribution } from '../analytics';
import { Generator, GeneratorStats, Refill, WorkSession } from '../../models/types';

const NOW = '2026-06-29T10:00:00.000Z';

const session = (date: string, hours: number, isActive = false): WorkSession => ({
  id: `${date}-${hours}-${isActive}`,
  generatorId: 'g1',
  date,
  startTime: '09:00',
  endTime: isActive ? undefined : '12:00',
  hours,
  isActive,
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'synced',
});

const refill = (date: string, amount: number, generatorId = 'g1'): Refill => ({
  id: `${generatorId}-${date}-${amount}`,
  generatorId,
  date,
  amount,
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'synced',
});

const generator = (id: string, name: string, totalHours: number): Generator & { stats: GeneratorStats } => ({
  id,
  name,
  purchaseDate: '2026-01-01',
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'synced',
  stats: { totalHours, totalRefills: 0, averageFuelPerHour: 0 },
});

describe('getHoursOverTime', () => {
  it('is empty without sessions', () => {
    expect(getHoursOverTime([])).toEqual([]);
  });

  it('sums completed hours per month, ignoring active and zero-hour sessions', () => {
    const data = getHoursOverTime([
      session('2026-01-10', 2),
      session('2026-01-20', 3),
      session('2026-02-01', 1),
      session('2026-02-05', 0),
      session('2026-03-01', 4, true),
    ]);

    expect(data.map(d => d.value)).toEqual([5, 1]);
  });

  it('keeps only the last six months that have data', () => {
    const sessions = Array.from({ length: 8 }, (_, i) => session(`2025-${String(i + 1).padStart(2, '0')}-15`, i + 1));
    const data = getHoursOverTime(sessions);

    expect(data).toHaveLength(6);
    expect(data.map(d => d.value)).toEqual([3, 4, 5, 6, 7, 8]);
  });
});

describe('getFuelOverTime', () => {
  it('sums litres per month with one-decimal rounding', () => {
    const data = getFuelOverTime([refill('2026-05-01', 5.25), refill('2026-05-20', 5.25), refill('2026-06-01', 3)]);
    expect(data.map(d => d.value)).toEqual([10.5, 3]);
  });
});

describe('getGeneratorComparison', () => {
  it('sorts by hours descending and truncates long names', () => {
    const data = getGeneratorComparison([
      generator('a', 'Backup', 10),
      generator('b', 'Very long generator name', 42),
      generator('c', 'Main', 20.26),
    ]);

    expect(data.map(d => d.value)).toEqual([42, 20.3, 10]);
    expect(data[0].label).toBe('Very long ...');
  });
});

describe('getFuelDistribution', () => {
  it('reports fuel per generator and drops generators without refills', () => {
    const data = getFuelDistribution(
      [generator('a', 'Main', 0), generator('b', 'Idle', 0)],
      [refill('2026-06-01', 12.4, 'a'), refill('2026-06-02', 2, 'a')],
      'L'
    );

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ value: 14.4, text: '14L', label: 'Main' });
  });
});
