---
name: Ion Nexus
colors:
  surface: '#0e141a'
  surface-dim: '#0e141a'
  surface-bright: '#343a41'
  surface-container-lowest: '#090f15'
  surface-container-low: '#161c22'
  surface-container: '#1a2027'
  surface-container-high: '#252b31'
  surface-container-highest: '#2f353c'
  on-surface: '#dde3ec'
  on-surface-variant: '#bcc9cc'
  inverse-surface: '#dde3ec'
  inverse-on-surface: '#2b3138'
  outline: '#869396'
  outline-variant: '#3d494c'
  surface-tint: '#56d7ef'
  primary: '#caf5ff'
  on-primary: '#00363e'
  primary-container: '#63e2fa'
  on-primary-container: '#006371'
  inverse-primary: '#006877'
  secondary: '#a6c8ff'
  on-secondary: '#00315f'
  secondary-container: '#3192fc'
  on-secondary-container: '#002a53'
  tertiary: '#ffebcb'
  on-tertiary: '#412d00'
  tertiary-container: '#ffc959'
  on-tertiary-container: '#745400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a2eeff'
  primary-fixed-dim: '#56d7ef'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#004e5a'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#a6c8ff'
  on-secondary-fixed: '#001c3b'
  on-secondary-fixed-variant: '#004786'
  tertiary-fixed: '#ffdea3'
  tertiary-fixed-dim: '#f3be50'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#0e141a'
  on-background: '#dde3ec'
  surface-variant: '#2f353c'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
  mono-data:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

This design system embodies a **Futuristic Glassmorphism** aesthetic tailored for the high-stakes world of decentralized finance (DeFi). The brand personality is precise, technologically advanced, and exhilarating. It targets a tech-savvy audience that values transparency and cutting-edge performance.

The visual language balances deep, atmospheric "void" backgrounds with luminous, ethereal glass containers. High-contrast accents provide clarity in a data-dense environment, while subtle background blurs and "frozen" textures evoke a sense of digital depth and sophistication. The overall mood is professional yet charged with the energy of next-generation financial systems.

## Colors

The palette is centered on a high-contrast relationship between a "Deep Space" background and "Ionized" accents.

- **Primary (Electric Cyan):** Used for primary actions, critical status updates, and key branding elements. This color should appear to "glow" against the dark background.
- **Secondary (Digital Blue):** Used for interactive supporting elements and data visualization.
- **Neutrals:** A range of ultra-dark greys and deep navies form the foundation, preventing the UI from feeling "flat black."
- **Functional Colors:** High-saturation greens and reds are reserved for success and error states, ensuring they pierce through the atmospheric UI for immediate recognition.

## Typography

The system utilizes **Hanken Grotesk** for its sharp, contemporary geometry and exceptional readability in digital interfaces. Large display headings use tight letter spacing and heavy weights to create a sense of impact and authority.

For technical data, wallet addresses, and micro-labels, **Geist** provides a monospaced-adjacent feel that reinforces the "developer-grade" precision of the platform. All typography should maintain high contrast (Pure White or Cyan) against the dark background to ensure accessibility.

## Layout & Spacing

The system follows a **Fluid Grid** model built on an 8px base unit. 

- **Desktop:** A 12-column grid with generous margins (64px) to allow the "atmospheric" background to breathe.
- **Tablet:** 8-column grid with 32px margins.
- **Mobile:** 4-column grid with 20px margins.

Spacing is used to create clear groupings; related data points are kept tight (8px-16px), while major sections are separated by significant vertical rhythm (80px+). Components should use "Safe Area" padding to ensure content never feels cramped against glass borders.

## Elevation & Depth

Depth is achieved through **Glassmorphism** rather than traditional shadows. 

1.  **Base Layer:** The darkest surface, representing the infinite background.
2.  **Surface Layer:** Semi-transparent containers (`rgba(255, 255, 255, 0.03)`) with a `backdrop-filter: blur(12px)`.
3.  **Accent Layer:** Thin, 1px translucent borders (`rgba(255, 255, 255, 0.1)`) that catch the light, defining the edges of containers.
4.  **Interactive Layer:** Primary buttons and active states use an outer glow (`box-shadow: 0 0 20px rgba(99, 226, 250, 0.3)`) to simulate light emission.

This stacking order creates a clear hierarchy where the most important interactive elements appear "closer" to the user because they are the most luminous.

## Shapes

The design system uses a **Rounded** shape language to soften the futuristic aesthetic, making the professional interface feel more approachable.

- **Standard Containers:** 16px (1rem) corner radius.
- **Buttons & Chips:** 8px (0.5rem) corner radius for a sturdy, tactile feel.
- **Inner Elements:** Nested elements (like inner bars or status dots) should have 4px-8px radii to maintain concentric harmony with their parent containers.

## Components

### Buttons
Primary buttons are solid Electric Cyan with black text for maximum contrast. Secondary buttons use the "glass" style with a cyan border and a subtle hover glow.

### Cards
Glass containers with a 1px top-down gradient border. This creates a "rim light" effect on the top edge, enhancing the 3D glass illusion.

### Input Fields
Inputs are dark, recessed wells with a 1px border that brightens to Electric Cyan upon focus. Placeholders should be low-contrast (30% white) to keep the focus on user-entered data.

### Status Indicators
Status "pills" use a high-contrast combination: a dark background with a vibrantly colored dot and matching text. For example, a "Waiting" state uses a muted grey dot, while "Live" uses a pulsing cyan dot.

### Progress Bars
Background tracks are semi-transparent dark grey, while the fill is a horizontal gradient from Digital Blue to Electric Cyan.