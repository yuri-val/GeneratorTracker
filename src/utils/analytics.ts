import { WorkSession, Refill, Generator, GeneratorStats } from '../models/types';

interface ChartDataPoint {
  value: number;
  label?: string;
  frontColor?: string;
  gradientColor?: string;
  dataPointText?: string;
}

interface PieDataPoint {
  value: number;
  color: string;
  text?: string;
  label?: string;
}

function getMonthLabel(dateStr: string, locale: string = 'en-US'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { month: 'short' });
}

function getWeekLabel(dateStr: string, locale: string = 'en-US'): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString(locale, { month: 'short' });
  return `${month} ${day}`;
}

function groupByMonth(dates: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const d of dates) {
    const key = d.substring(0, 7); // YYYY-MM
    const arr = groups.get(key) || [];
    arr.push(d);
    groups.set(key, arr);
  }
  return groups;
}

export function getHoursOverTime(
  sessions: WorkSession[],
  color: string = '#FF6B35',
  locale: string = 'en-US',
): ChartDataPoint[] {
  if (sessions.length === 0) return [];

  const completed = sessions.filter(s => !s.isActive && s.hours > 0);
  const monthGroups = groupByMonth(completed.map(s => s.date));

  const sortedKeys = Array.from(monthGroups.keys()).sort();
  // Ensure we show at least the last few months even if empty?
  // For now stick to existing logic

  // Limiting to last 6 months present in data
  const last6 = sortedKeys.slice(-6);

  return last6.map(key => {
    const dates = monthGroups.get(key) || [];
    // We need to sum hours for all sessions in this month
    // The previous implementation was slightly incorrect in filtering again
    // reducing map lookup. Let's stick to previous logical flow but fix filter key
    const totalHours = completed
      .filter(s => s.date.startsWith(key))
      .reduce((sum, s) => sum + s.hours, 0);

    return {
      value: Math.round(totalHours * 10) / 10,
      label: getMonthLabel(key + '-01', locale),
      frontColor: color,
    };
  });
}

export function getFuelOverTime(
  refills: Refill[],
  color: string = '#FF6B35',
  locale: string = 'en-US',
): ChartDataPoint[] {
  if (refills.length === 0) return [];

  const monthGroups = groupByMonth(refills.map(r => r.date));
  const sortedKeys = Array.from(monthGroups.keys()).sort();
  const last6 = sortedKeys.slice(-6);

  return last6.map(key => {
    const totalFuel = refills
      .filter(r => r.date.startsWith(key))
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      value: Math.round(totalFuel * 10) / 10,
      label: getMonthLabel(key + '-01', locale),
      frontColor: color,
    };
  });
}

export function getGeneratorComparison(
  generators: Array<Generator & { stats: GeneratorStats }>,
  color: string = '#FF6B35',
): ChartDataPoint[] {
  if (generators.length === 0) return [];

  return generators
    .map(g => ({
      value: Math.round(g.stats.totalHours * 10) / 10,
      label: g.name.length > 10 ? g.name.substring(0, 10) + '...' : g.name,
      frontColor: color,
    }))
    .sort((a, b) => b.value - a.value);
}

export function getFuelDistribution(
  generators: Array<Generator & { stats: GeneratorStats }>,
  refills: Refill[],
  unit: string = 'L'
): PieDataPoint[] {
  const pieColors = ['#FF6B35', '#0a7ea4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

  return generators
    .map((g, i) => {
      const genRefills = refills.filter(r => r.generatorId === g.id);
      const totalFuel = genRefills.reduce((sum, r) => sum + r.amount, 0);
      return {
        value: Math.round(totalFuel * 10) / 10,
        color: pieColors[i % pieColors.length],
        text: `${Math.round(totalFuel)}${unit}`,
        label: g.name,
      };
    })
    .filter(p => p.value > 0);
}
