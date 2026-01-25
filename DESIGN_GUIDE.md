# Design Guide - Generator Tracker

This comprehensive style guide defines the visual language and design principles for the Generator Tracker application. It is based on a modern, technological, and dynamic design philosophy that combines professionalism with energy.

## Design Philosophy

### Core Values
- **Keywords:** Modern, Reliable, Technological, Dynamic, Energetic
- **Overall Impression:** The design conveys a sense of control over power. It uses a Dark Mode as the standard for professional tools, but features bright, "hot" accents that symbolize energy and fuel.

---

## Color Palette

This is the foundation of the UI. Use these colors to create visual hierarchy.

### Primary Dark (Main Background)
- **Color:** Deep dark gray / graphite (almost black, but softer)
- **Hex Suggestions:** `#151718`, `#1a1c1e`, `#0f1011`
- **Usage in App:**
  - Main screen backgrounds
  - Navigation bar background
  - Foundation layer

### Surface Dark (Secondary Background)
- **Color:** Slightly lighter shade of dark gray
- **Hex Suggestions:** `#1e2022`, `#252729`, `#2a2c2e`
- **Usage in App:**
  - Card backgrounds (generator cards)
  - Modal windows
  - Input fields
  - Creates depth on dark background

### Primary Accent - "Energy" (Orange)
- **Color:** Bright, saturated orange with gradient transitions
- **Hex Suggestions:** `#FF6B35`, `#FF8C42`, `#F77F00`, `#FFA07A`
- **Gradient:** `#FF6B35` → `#FF8C42`
- **Usage in App:**
  - **Primary Call-to-Action buttons** ("+ Add", "Start Session")
  - Active menu elements
  - High-priority icons
  - Fuel consumption graphs and charts
  - Active tab indicators

### Secondary Accent - "Technology" (Blue)
- **Color:** Saturated electric blue
- **Hex Suggestions:** `#0a7ea4`, `#06BEE1`, `#00A8E8`, `#0077B6`
- **Usage in App:**
  - Secondary buttons
  - Informational messages
  - Chart elements (e.g., for displaying operating hours)
  - Text block highlights
  - Links and interactive elements

### Text & Icons (Neutral Light)
- **Color:** Pure white
- **Hex:** `#FFFFFF`, `#ECEDEE`
- **Usage in App:**
  - Primary headings
  - Main text on dark cards
  - Active icons
  - High-contrast elements

### Secondary Text (Neutral Gray)
- **Color:** Light gray
- **Hex Suggestions:** `#9BA1A6`, `#A8B2B9`, `#687076`
- **Usage in App:**
  - Subheadings
  - Labels ("Total Hours", "Refills")
  - Inactive menu items
  - Placeholder text
  - Timestamps and metadata

### Success / Error / Warning
- **Success:** `#22C55E` (Green)
- **Error:** `#EF4444` (Red)
- **Warning:** `#F59E0B` (Amber)

---

## Typography

The design uses modern, bold sans-serif fonts.

### Font Families
**Recommended:** Modern geometric sans-serif fonts
- **Primary Options:** Montserrat, Poppins, Inter
- **System Fonts:** Roboto (Android) / SF Pro (iOS)
- **Weight Range:** Use medium to bold weights

### Hierarchy

#### H1 (Main Heading)
- **Size:** Very large (32-36px)
- **Weight:** Extra Bold (800)
- **Case:** All caps (e.g., "GENERATOR TRACKER")
- **Usage:** App title, major section headers

#### H2 (Subheading)
- **Size:** Medium-large (24-28px)
- **Weight:** Semi-Bold (600) or Medium (500)
- **Case:** Sentence case
- **Usage:** Screen titles, card headers

#### H3 (Section Heading)
- **Size:** Medium (18-20px)
- **Weight:** Semi-Bold (600)
- **Usage:** Section titles, group labels

#### Body (Main Text)
- **Size:** Standard (14-16px)
- **Weight:** Regular (400) or Medium (500)
- **Line Height:** 1.5
- **Usage:** Main content, descriptions

#### Labels (Small Text)
- **Size:** Small (11-13px)
- **Weight:** Medium (500)
- **Case:** Often uppercase
- **Usage:** Statistical labels, metadata, captions

#### Numbers/Stats
- **Size:** Large (24-32px for primary stats)
- **Weight:** Bold (700)
- **Usage:** Operating hours, refill amounts, key metrics

---

## Graphic Elements & Textures

These elements add the "special touch" that makes the design unique.

### Wave Gradients
- **Description:** Large, smooth waves of blue and orange colors
- **Implementation:**
  - Use soft gradients on buttons (light orange → dark orange)
  - Add subtle gradient overlay to headers
  - Background for main statistics blocks
  - Screen transitions

**Example Gradient:**
```
Orange Wave: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)
Blue Wave: linear-gradient(135deg, #0a7ea4 0%, #06BEE1 100%)
```

### Circuit Pattern Texture
- **Description:** Subtle thin lines resembling a circuit board
- **Opacity:** Very low (5-10%)
- **Color:** Lighter than background (#FFFFFF at 5-10% opacity)
- **Usage:**
  - Delicate background for empty states
  - Semi-transparent overlay in profile header
  - Background pattern for statistics cards
  - Emphasizes engineering character of the app

### Iconography
- **Style:** Minimalistic, outline-based
- **Color:** White (`#FFFFFF`)
- **Weight:** 2px stroke width
- **Effect:** Subtle shadow for depth, appearing to "levitate"
- **Recommended Sets:**
  - Ionicons (currently in use)
  - Material Icons
  - Feather Icons

**Key Icons:**
- Generator: Industrial/power icon
- Fuel: Gas can/droplet icon
- Timer: Clock/stopwatch icon
- Statistics: Chart/graph icon
- Lightning: Electricity/energy icon

---

## Layout & Visual Hierarchy

### Z-Pattern Reading Flow
The interface follows a natural Z-shaped reading pattern:

1. **Top Left (Entry Point):**
   - Main title/app name
   - Highest priority

2. **Move Down Left Side:**
   - Subtitle/value proposition
   - Primary navigation

3. **Diagonal to Center/Right (Focus):**
   - Main content area
   - Featured cards
   - Primary actions

4. **Bottom Left (Completion):**
   - Secondary information
   - Footer elements

### Card Design Principles

#### Structure
- **Corner Radius:** 12-16px for cards
- **Corner Radius:** 8-12px for buttons
- **Padding:** 16-20px internal spacing
- **Shadow:** Subtle elevation
  ```
  shadowColor: '#000'
  shadowOffset: { width: 0, height: 2 }
  shadowOpacity: 0.1
  shadowRadius: 4
  elevation: 3
  ```

#### Content Hierarchy within Cards
1. **Icon/Visual** (top or left)
2. **Primary Information** (large, bold)
3. **Secondary Information** (smaller, gray)
4. **Action Button** (bottom, orange accent)

### Spacing System
Use a consistent 8px base unit for spacing:
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **2xl:** 48px

---

## Component Patterns

### Buttons

#### Primary Button (Call-to-Action)
```typescript
backgroundColor: colors.primary (Orange)
color: #FFFFFF
fontWeight: '600' (Semi-Bold)
padding: 16px 24px
borderRadius: 12px
gradient: optional (Orange → Lighter Orange)
```

#### Secondary Button
```typescript
backgroundColor: colors.secondaryAccent (Blue)
color: #FFFFFF
fontWeight: '600'
padding: 12px 20px
borderRadius: 10px
```

#### Outline Button
```typescript
backgroundColor: transparent
borderColor: colors.border
borderWidth: 1px
color: colors.text
```

### Statistics Display
- **Large Numbers:** Bold, white, 24-32px
- **Small Labels:** Uppercase, gray, 11-13px
- **Layout:** Number above label, centered

### Navigation

#### Bottom Tab Bar
- **Background:** Surface Dark
- **Active Tab:** Orange accent color
- **Inactive Tab:** Gray
- **Icons:** 24px, outline style
- **Labels:** 11px, medium weight

#### Top Navigation
- **Background:** Card color
- **Border:** Bottom border with border color
- **Title:** H2 style, centered or left-aligned
- **Actions:** Icon buttons on right

---

## Interaction & Animation

### Transitions
- **Duration:** 200-300ms
- **Easing:** ease-in-out
- **Usage:** Screen transitions, modal appearances

### Button Press States
- **Active Opacity:** 0.7
- **Scale:** 0.98 (subtle press effect)

### Loading States
- **Primary Color:** Orange
- **Style:** Spinner or skeleton screens
- **Background:** Slightly transparent overlay

---

## Empty States
- **Icon:** Large, centered, gray
- **Title:** "No [items] yet"
- **Description:** Brief explanation
- **Action:** Primary button to add first item
- **Background:** Optional subtle circuit pattern

---

## Dark Mode Implementation

### Current Implementation
The app currently uses Dark Mode as the primary theme.

### Color Application
- **backgrounds:** Use Primary Dark and Surface Dark
- **cards:** Use Surface Dark with subtle shadow
- **text:** White for primary, gray for secondary
- **accents:** Orange for primary actions, Blue for secondary
- **borders:** Subtle, dark gray borders

### Contrast Requirements
- Ensure minimum contrast ratio of 4.5:1 for text
- Use white text on dark backgrounds
- Use dark text on orange/blue buttons (if needed)

---

## Accessibility

### Touch Targets
- **Minimum Size:** 44x44px (iOS standard)
- **Recommended:** 48x48px (Material Design standard)

### Color Contrast
- **Text on Dark Background:** Use white (#FFFFFF) or light gray (#9BA1A6)
- **Text on Orange:** Use white (#FFFFFF)
- **Text on Blue:** Use white (#FFFFFF)

### Focus States
- Add visible focus indicators for keyboard navigation
- Use outline or border highlight

---

## Usage Guidelines

### Do's ✓
- Use orange for primary actions and energy-related features
- Use blue for time-related and informational features
- Maintain consistent spacing using the 8px grid
- Use bold typography for emphasis
- Keep cards clean with clear hierarchy
- Use icons to support text, not replace it

### Don'ts ✗
- Don't use orange and blue equally (orange is primary)
- Don't use too many colors beyond the palette
- Don't create cards with white backgrounds in dark mode
- Don't use small text sizes for important information
- Don't overcrowd cards with too much information
- Don't forget to add proper spacing between elements

---

## Implementation Notes

### React Native Specifics
- Use `useColorScheme()` hook for theme detection
- Define color constants in `src/constants/colors.ts`
- Use StyleSheet for consistent styling
- Implement gradients with libraries like `expo-linear-gradient`

### Platform Considerations
- iOS: Use SF Pro font family
- Android: Use Roboto font family
- Web: Use Inter or system fonts
- Adjust button sizes for platform standards

---

## References

### Inspiration
This design is inspired by modern industrial applications, combining:
- Dark mode professional tools (Figma, VS Code, GitHub)
- Energy sector applications (power monitoring, industrial control)
- Modern mobile UI patterns (Material Design, iOS Human Interface Guidelines)

### Key Design Principles
1. **Clarity:** Information should be easy to scan and understand
2. **Efficiency:** Common actions should be one tap away
3. **Energy:** Visual design should reflect the power/energy theme
4. **Professional:** Suitable for industrial/business use
5. **Modern:** Contemporary design language and patterns

---

**Version:** 1.0.0
**Last Updated:** 2026-01-25
**Applies to:** Generator Tracker App v1.4.1+
