# Design Guide - Generator Tracker

This comprehensive style guide defines the visual language and design principles for the Generator Tracker application. Built on **React Native Paper (Material Design 3)** with animations, haptics, charts, and glassmorphism effects.

## Design Philosophy

### Core Values
- **Keywords:** Modern, Reliable, Technological, Dynamic, Energetic
- **Overall Impression:** The design conveys a sense of control over power. It uses a Dark Mode as the standard for professional tools, but features bright, "hot" accents that symbolize energy and fuel.

### Technology Stack
- **UI Library:** React Native Paper v5 (Material Design 3)
- **Animations:** React Native Reanimated v4 (spring-based entrance animations)
- **Haptics:** Expo Haptics (tactile feedback on key interactions)
- **Charts:** React Native Gifted Charts (BarChart, PieChart, LineChart)
- **Blur:** Expo Blur (glassmorphism on tab bar)
- **Gradients:** Expo Linear Gradient (active session cards)
- **Icons:** MaterialCommunityIcons via @expo/vector-icons

---

## Theme System

### Architecture
The app uses a centralized MD3 theme system defined in `src/theme/index.ts`:

```typescript
import { useAppTheme } from '../theme/useAppTheme';

const theme = useAppTheme(); // Type-safe MD3 theme access
theme.colors.primary      // Orange (#FF6B35)
theme.colors.secondary    // Blue (#0a7ea4)
theme.colors.background   // Dark (#151718)
theme.colors.surface      // Card background (#1e2022)
```

**Important:** Never use raw color hex values in components. Always access colors through `useAppTheme()`.

### MD3 Color Token Mapping

| MD3 Token | Value | Usage |
|-----------|-------|-------|
| `primary` | `#FF6B35` | CTAs, active states, fuel features |
| `primaryContainer` | `#4A2000` | Active tab indicator background |
| `secondary` | `#0a7ea4` | Time features, informational elements |
| `secondaryContainer` | `#003544` | Secondary highlights |
| `tertiary` | `#22C55E` | Success states, active sessions |
| `background` | `#151718` | Screen backgrounds |
| `surface` | `#1e2022` | Card backgrounds |
| `surfaceVariant` | `#2a2c2e` | Input fields, elevated surfaces |
| `outline` | `#334155` | Borders, dividers |
| `error` | `#EF4444` | Delete actions, error states |

### Custom App Color Tokens

```typescript
import { appColors } from '../theme';

appColors.warning           // #F59E0B (amber)
appColors.success           // #22C55E (green)
appColors.activeSession     // #22C55E (session running)
appColors.activeSessionDark // #16A34A (session gradient end)
appColors.fuelOrange        // #FF8C42 (gradient variant)
appColors.techBlue          // #06BEE1 (gradient variant)
```

---

## Color Palette

### Primary Accent - "Energy" (Orange)
- **Hex:** `#FF6B35`
- **MD3 Role:** `primary`
- **Usage:**
  - Primary Call-to-Action buttons (Paper `Button mode="contained"`)
  - FAB (Paper `FAB`)
  - Active tab indicators
  - Fuel consumption charts
  - Card accents and icons

### Secondary Accent - "Technology" (Blue)
- **Hex:** `#0a7ea4`
- **MD3 Role:** `secondary`
- **Usage:**
  - Time-related statistics
  - Secondary buttons (Paper `Button mode="contained-tonal"`)
  - Chart elements for operating hours
  - Informational chips

### Success / Error / Warning
- **Success:** `#22C55E` — Active session gradients, success haptics
- **Error:** `#EF4444` — Delete buttons, error states
- **Warning:** `#F59E0B` — Caution indicators

---

## Typography

The app uses Material Design 3 type scale via React Native Paper's `Text` component.

### Usage Pattern
```tsx
<Text variant="displaySmall">4.5h</Text>        // Large stats
<Text variant="headlineMedium">Generator Name</Text>
<Text variant="titleMedium">Section Title</Text>
<Text variant="titleSmall">Card Title</Text>
<Text variant="bodyLarge">Main content</Text>
<Text variant="bodyMedium">Description text</Text>
<Text variant="bodySmall">Notes, metadata</Text>
<Text variant="labelSmall">STAT LABELS</Text>    // Uppercase labels
<Text variant="labelMedium">Chip text</Text>
```

### Hierarchy

| Role | Paper Variant | Weight | Usage |
|------|--------------|--------|-------|
| Display | `displaySmall` | 700 | Large stat values (hours, fuel) |
| Headline | `headlineMedium` | 700 | Stat card values |
| Title | `titleMedium` / `titleLarge` | 600 | Section headers, chart titles |
| Card Title | `titleSmall` | 500 | List item titles |
| Body | `bodyLarge` / `bodyMedium` | 400 | Content, descriptions |
| Label | `labelSmall` | 500 | Uppercase stat labels, metadata |

---

## Component System

### Paper Components Used

| Paper Component | Usage |
|----------------|-------|
| `Appbar.Header` | Screen headers with `elevated` prop |
| `Appbar.BackAction` | Navigation back button |
| `Appbar.Content` | Title/subtitle with optional `onPress` |
| `Appbar.Action` | Header action icons |
| `Card mode="elevated"` | Generator cards on HomeScreen |
| `Card mode="outlined"` | List items (sessions, refills) |
| `Surface elevation={1-2}` | Stat cards, chart containers |
| `FAB` | Floating action button on HomeScreen |
| `Button mode="contained"` | Primary actions |
| `Button mode="contained-tonal"` | Secondary actions (Add Session/Refill) |
| `Button mode="outlined"` | Tertiary actions |
| `TextInput mode="outlined"` | All form inputs |
| `TextInput.Icon` | Input prefix icons |
| `TextInput.Affix` | Input suffix text (e.g., "L") |
| `HelperText` | Input validation/hints |
| `SegmentedButtons` | View toggles (Analytics) |
| `Chip` | Status indicators, badges |
| `Avatar.Icon` | Generator card icons |
| `Avatar.Text` | User initials |
| `Badge` | Pending sync count |
| `Divider` | Section separators |
| `Banner` | Informational banners |
| `List.Section` / `List.Item` | Settings sections |
| `Dialog` / `Portal` | Delete confirmations |
| `Icon` | Standalone icons |

### Custom Components

| Component | File | Usage |
|-----------|------|-------|
| `StatBlock` | `src/components/StatBlock.tsx` | Icon + value + label stat display |
| `GradientCard` | `src/components/GradientCard.tsx` | LinearGradient card wrapper |
| `AnimatedCard` | `src/components/AnimatedCard.tsx` | Paper Card + FadeInUp entrance |
| `DeleteConfirmDialog` | `src/components/DeleteConfirmDialog.tsx` | Paper Dialog for delete confirmations |
| `PaperBottomTabBar` | `src/components/PaperBottomTabBar.tsx` | BlurView + Paper BottomNavigation.Bar |
| `WorkSessionsList` | `src/components/WorkSessionsList.tsx` | FlatList with Paper Card items |
| `RefillsList` | `src/components/RefillsList.tsx` | FlatList with Paper Card items |
| `SyncStatusIndicator` | `src/components/SyncStatusIndicator.tsx` | Sync status with Badge |
| `EmailAuthForm` | `src/components/EmailAuthForm.tsx` | Paper TextInput form |
| `SignInButton` | `src/components/SignInButton.tsx` | Paper Button wrapper |

---

## Animations

### Library
All animations use `react-native-reanimated` v4 with entering animations.

### Animation Map

| Element | Animation | Timing |
|---------|-----------|--------|
| Home card list items | `FadeInUp.delay(index * 80).springify()` | Staggered entrance |
| Home FAB | `ZoomIn.delay(300)` | Delayed pop-in |
| Detail active session | `FadeIn.duration(400)` | Smooth fade |
| Detail stats card | `FadeInUp.delay(200)` | Delayed slide up |
| Analytics stat cards | `FadeInUp.delay(n * 80).springify()` | Staggered entrance |
| Analytics charts | Built-in `isAnimated` (600ms) | Chart library animation |
| Settings sections | `FadeInDown.delay(index * 100)` | Staggered slide down |

### Usage Pattern
```tsx
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

<Animated.View entering={FadeInUp.delay(index * 80).springify()}>
  <Card>...</Card>
</Animated.View>
```

---

## Haptics

### Library
`expo-haptics` provides tactile feedback for meaningful interactions.

### Haptic Map

| Action | Haptic Type | Intensity |
|--------|------------|-----------|
| FAB press | `impactAsync` | Medium |
| Card press | `impactAsync` | Light |
| START session | `impactAsync` | Heavy |
| STOP session | `notificationAsync` | Warning |
| Save form | `notificationAsync` | Success |
| Delete action | `notificationAsync` | Warning |

### Usage Pattern
```tsx
import * as Haptics from 'expo-haptics';

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

---

## Charts & Data Visualization

### Library
`react-native-gifted-charts` for all chart components.

### Chart Types

| Chart | Screen | Data |
|-------|--------|------|
| BarChart | Analytics | Operating hours by month |
| BarChart | Analytics | Fuel consumption by month |
| BarChart | Analytics | Generator comparison |
| PieChart (donut) | Analytics | Fuel distribution per generator |

### Data Utilities
`src/utils/analytics.ts` provides data aggregation:
- `getHoursOverTime()` — Group sessions by month, last 6 months
- `getFuelOverTime()` — Group refills by month, last 6 months
- `getGeneratorComparison()` — Compare generators by total hours
- `getFuelDistribution()` — Pie chart data for fuel per generator

### Chart Styling
```tsx
<BarChart
  barWidth={24}
  barBorderRadius={6}
  frontColor={theme.colors.primary}
  noOfSections={4}
  yAxisColor="transparent"
  xAxisColor={theme.colors.outline}
  yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
  xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
  hideRules
  isAnimated
  animationDuration={600}
/>
```

---

## Glassmorphism / Blur Effects

### Bottom Tab Bar
The tab bar uses `expo-blur` `BlurView` for a frosted glass effect:
- `intensity={80}`
- `tint="dark"`
- `position: absolute` (floats over content)
- Hairline top border with `outlineVariant` color
- Paper `BottomNavigation.Bar` with `backgroundColor: 'transparent'`

### Content Padding
All tab screens must have `paddingBottom: 100` on scrollable content to account for the floating tab bar.

---

## Layout Patterns

### Screen Structure
```tsx
<View style={{ flex: 1, backgroundColor: theme.colors.background }}>
  <Appbar.Header elevated>
    <Appbar.Content title="Screen Title" titleStyle={{ fontWeight: '700' }} />
  </Appbar.Header>
  <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
    {/* Content */}
  </ScrollView>
</View>
```

### Card Design
- **Corner Radius:** 16px (all cards and surfaces)
- **Padding:** 20px internal spacing
- **Elevation:** Use Paper's built-in elevation levels (1-5)
- **Modes:** `elevated` for primary cards, `outlined` for list items

### Spacing System
8px base unit:
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px

---

## Navigation

### Bottom Tabs
- Custom `PaperBottomTabBar` with BlurView glassmorphism
- Icons: `flash` (Home), `chart-bar` (Analytics), `cog` (Settings)
- Uses `MaterialCommunityIcons`

### Stack Navigation
- `presentation: 'modal'` for Add/Edit screens
- `presentation: 'card'` for detail screens
- `Appbar.Header` replaces default navigation headers

### Material Top Tabs (Generator Detail)
- Orange indicator (`theme.colors.primary`), 3px height, rounded
- `textTransform: 'none'` for tab labels
- Dynamic labels with counts: `Sessions (5)`, `Refills (3)`

---

## Form Patterns

### Input Fields
```tsx
<TextInput
  mode="outlined"
  label="Generator Name"
  value={name}
  onChangeText={setName}
  left={<TextInput.Icon icon="engine" />}
/>
```

### Validation
```tsx
<HelperText type="error" visible={!name.trim()}>
  Name is required
</HelperText>
```

### Form Actions
- Save: `Appbar.Action icon="check"` in header
- Close: `Appbar.Action icon="close"` in header
- Delete: `Button` with `textColor={theme.colors.error}` + `DeleteConfirmDialog`

---

## Empty States
- Large `Icon` (48-64px) in `onSurfaceVariant` color
- `Text variant="titleMedium"` for title
- `Text variant="bodyMedium"` for description
- Center-aligned with generous vertical padding (60px)

---

## Accessibility

### Touch Targets
- **Minimum Size:** 48x48px (Material Design standard)
- Paper components handle this automatically

### Color Contrast
- MD3 theme ensures proper contrast ratios
- Use `onSurface`, `onPrimary`, `onSecondary` tokens for text on colored backgrounds

---

## Usage Guidelines

### Do's
- Use `useAppTheme()` for all color access
- Use Paper's `Text` component with `variant` prop for typography
- Use Paper's built-in elevation system instead of manual shadows
- Use `Animated.View` with `entering` prop for entrance animations
- Use haptics for meaningful interactions (save, delete, start/stop)
- Keep card border radius at 16px consistently

### Don'ts
- Don't use raw hex color values — use theme tokens
- Don't use `colors` prop pattern — components access theme internally
- Don't create custom buttons — use Paper `Button` with appropriate `mode`
- Don't use `Alert.alert` for confirmations — use `DeleteConfirmDialog`
- Don't add animations to every element — focus on entrance animations
- Don't use haptics for scrolling or passive interactions

---

## Implementation Checklist

When creating a new screen:
1. Import `useAppTheme` and get theme
2. Use `Appbar.Header` for navigation
3. Set `backgroundColor: theme.colors.background` on container
4. Use Paper components (Card, Surface, Button, Text, etc.)
5. Add `FadeInUp` entrance animations to main content blocks
6. Add haptic feedback to primary actions
7. Add `paddingBottom: 100` to scrollable content (for floating tab bar)
8. Use `DeleteConfirmDialog` for any delete actions

---

**Version:** 2.0.0
**Last Updated:** 2026-02-06
**Applies to:** Generator Tracker App v2.0.0+
**UI Library:** React Native Paper v5 (Material Design 3)
