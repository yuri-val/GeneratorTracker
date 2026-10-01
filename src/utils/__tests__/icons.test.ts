/**
 * react-native-paper renders a "?" for any MaterialCommunityIcons name that does not
 * exist in the installed font (e.g. the empty states once used "clock-off" and
 * "fuel-off"). Scan the sources and check every literal icon name against the glyph map
 * of the icon set Paper resolves (@expo/vector-icons). Semantic names (keys of ICONS,
 * rendered through AppIcon/ScreenHeader) are type-checked; their MCI fallbacks are
 * checked here.
 */
import fs from 'fs';
import path from 'path';
import { ICONS } from '../../constants/icons';

const glyphMap: Record<string, number> = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');

const ROOT = path.join(__dirname, '..', '..', '..');

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });

// icon="x", source="x", name="x" props and `return 'x'` in icon helper functions.
const ICON_PATTERNS = [/\b(?:icon|source|name)=\{?["']([a-z0-9-]+)["']/g, /\bicon:\s*["']([a-z0-9-]+)["']/g];
const HELPER_RETURN = /return ["']([a-z0-9-]+)["'];/g;

const collectIconNames = () => {
  const names = new Map<string, string>();
  for (const file of [...sourceFiles(path.join(ROOT, 'src')), path.join(ROOT, 'App.tsx')]) {
    const code = fs.readFileSync(file, 'utf8');
    for (const pattern of ICON_PATTERNS) {
      for (const match of code.matchAll(pattern)) names.set(match[1], path.relative(ROOT, file));
    }
    // Only icon helper functions return plain kebab-case strings in this code base
    // (statusIcon, getSyncIcon, ...); restrict to files that import an icon component.
    if (/Icon|icon=/.test(code)) {
      for (const match of code.matchAll(HELPER_RETURN)) {
        if (match[1].includes('-') || match[1] in glyphMap) names.set(match[1], path.relative(ROOT, file));
      }
    }
  }
  return names;
};

describe('MaterialCommunityIcons names', () => {
  it('finds the icon names used in the app', () => {
    expect(collectIconNames().size).toBeGreaterThan(20);
  });

  it('uses only names that exist in the installed icon font', () => {
    const missing = [...collectIconNames()]
      .filter(([name]) => !(name in ICONS) && !(name in glyphMap))
      .map(([name, file]) => `${name} (${file})`);
    expect(missing).toEqual([]);
  });

  it('maps every semantic icon to an existing MaterialCommunityIcons glyph', () => {
    const missing = Object.entries(ICONS)
      .filter(([, icon]) => !(icon.mci in glyphMap))
      .map(([name, icon]) => `${name} -> ${icon.mci}`);
    expect(missing).toEqual([]);
  });
});
