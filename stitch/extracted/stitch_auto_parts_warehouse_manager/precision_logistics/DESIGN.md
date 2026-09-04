---
name: Precision Logistics
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444653'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#2d3449'
  on-tertiary: '#ffffff'
  tertiary-container: '#434b60'
  on-tertiary-container: '#b4bbd5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  success: '#059669'
  warning: '#D97706'
  danger: '#E11D48'
  border-subtle: '#E2E8F0'
  surface-alt: '#F1F5F9'
typography:
  page-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  section-title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  card-title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  unit-1: 4px
  unit-2: 8px
  unit-3: 12px
  unit-4: 16px
  unit-6: 24px
  unit-8: 32px
  gutter: 16px
  margin-desktop: 24px
  margin-mobile: 16px
---

## Brand & Style

This design system is engineered for the high-stakes environment of warehouse and auto parts management, where accuracy and speed are paramount. The brand personality is **Professional, Stable, and Systematic**, favoring a **Corporate Modern** aesthetic with **Minimalist** efficiency.

The UI is designed to feel like a high-performance tool rather than a consumer app. It prioritizes information density and visual clarity, ensuring that warehouse managers and procurement officers can process large volumes of inventory data without cognitive fatigue. The emotional response is one of absolute control, reliability, and industrial precision.

**Key Visual Principles:**
- **Utility-First:** Every visual element must serve a functional purpose; decoration is minimized to reduce distraction.
- **High Density:** Compact layouts that maximize the data-to-pixel ratio.
- **Structural Integrity:** Strong alignment to a mathematical grid to reflect the physical organization of logistics.

## Colors

The palette is anchored by a deep **Indigo Primary**, chosen for its association with stability and institutional trust. The system uses a predominantly "Cool Gray" neutral scale to maintain a professional, clinical atmosphere.

- **Primary (#1E40AF):** Used for primary actions, active navigation, and brand-critical elements.
- **Functional Colors:** Success (Emerald), Warning (Amber), and Danger (Rose) are used strictly for status signaling—such as stock levels, shipment delays, or system errors.
- **Neutral Scale:** Utilizes `Slate` grays to create hierarchy. Backgrounds use the lightest tints (`#F8FAFC`), while borders use `#E2E8F0` to maintain a clean, high-density look.
- **Data Contrast:** Text hierarchy is established through varying shades of gray rather than size alone, ensuring readability in industrial lighting conditions.

## Typography

The system relies on **Inter** for its neutral, highly legible characteristics. To handle technical logistics data, **JetBrains Mono** (or a similar monospace font) is introduced specifically for SKU numbers, VINs, and shelf coordinates to prevent character confusion.

- **Hierarchy:** Established through weight shifts and letter spacing rather than aggressive size changes, preserving vertical space.
- **Labels:** Table headers and form labels use a slightly tracked-out caps style for clear structural grouping.
- **Mobile Scaling:** Page titles scale down to 20px on mobile devices, while body text remains constant at 14px to ensure legibility is never compromised.

## Layout & Spacing

This design system uses a strict **8px grid** (with a 4px sub-grid for compact components) to ensure mathematical alignment.

- **Fluid Content Area:** The main stage uses a 12-column fluid grid that stretches to fill the screen, allowing for expansive data tables.
- **Sidebar:** A fixed 240px sidebar provides persistent navigation. It collapses to a 64px icon-only rail on tablet views.
- **Density Management:** "Compact" padding (8px) is the default for table cells and list items, while "Standard" padding (16px) is used for cards and modals.
- **Breakpoints:**
  - **Desktop (1280px+):** Full 12-column grid, 24px margins.
  - **Tablet (768px - 1279px):** 8-column grid, 16px margins, collapsed sidebar.
  - **Mobile (<768px):** Single column, 16px margins, overlay drawer for navigation.

## Elevation & Depth

To maintain a "flat and stable" industrial feel, this design system avoids soft, diffused shadows in favor of **Tonal Layers** and **Crisp Outlines**.

- **Level 0 (App Base):** `#F8FAFC` (Slate 50).
- **Level 1 (Cards/Tables):** White background with a 1px solid border (`#E2E8F0`). No shadow.
- **Level 2 (Modals/Popovers):** White background with a subtle, tight shadow (`0 4px 6px -1px rgb(0 0 0 / 0.1)`) and a slightly darker border (`#CBD5E1`).
- **Interactive States:** Hovering over a card or row does not increase elevation; instead, it changes the background color to `#F1F5F9` to indicate focus.

## Shapes

The shape language is **Soft** (4px base radius). This subtle roundedness provides a modern touch while maintaining the structured, geometric feel of a professional utility.

- **Primary Radius:** 4px for buttons, inputs, and small UI components.
- **Large Radius:** 8px (rounded-lg) for main cards and dashboard containers.
- **Circular:** Status dots and notification badges are fully rounded (pill/circle) to distinguish them from interactive buttons.

## Components

### Tables (The Core)
The primary data display. Headers use `#F8FAFC` background with `label-caps` text. Rows use alternating background colors (Zebra striping) in `#FFFFFF` and `#F1F5F9`. Cell height is fixed at 40px for high-density scanning.

### Buttons
- **Primary:** Solid Indigo (`#1E40AF`) with White text.
- **Secondary:** Light Blue/Gray tint (`#DBEAFE`) with Primary text.
- **Outline:** Transparent background, `Slate-300` border.
- **Danger:** Solid Rose (`#E11D48`).

### Forms
Inputs use a 1px border (`#D1D5DB`) and transition to a 2px Indigo ring on focus. Helper text is positioned below the field in `body-sm`. Search bars include a leading magnifying glass icon.

### Status Badges
Used for inventory status. They utilize a "subtle" style: 10% opacity background of the functional color with 100% opacity text of that same color (e.g., Emerald background tint for "In Stock").

### Feedback & Overlays
- **Modals:** Centered with a semi-transparent `Slate-900/50` backdrop. 
- **Toasts:** Minimalist, positioned top-right, featuring a 4px left-border colored by status (Success/Warning/Error).
- **Empty States:** Use simplified line-art icons and a clear "Primary Action" button to guide the user.