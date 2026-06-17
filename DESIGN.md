# Twilight Design System

Cymek's visual identity is the **Twilight** variant of Mistral AI — purple-blue instead of orange-red.

## Brand Voice
- Clean, technical, confident
- "Your docs, your data, your edge"

## Color Palette
- **Primary**: #7c5cfc (purple-blue) — CTAs, active states
- **Primary Deep**: #5c3dd9 — pressed states
- **On Primary**: #ffffff
- **Twilight 300**: #c4b5fd — light lavender
- **Twilight 500**: #a78bfa — mid lavender-purple
- **Twilight 700**: #7c5cfc — saturated purple
- **Twilight 800**: #6366f1 — indigo blue
- **Twilight 900**: #4f46e5 — deep indigo
- **Blue Saturated**: #4f8cf7
- **Cream**: #fff8e0 — form panels, cards, footer
- **Cream Light**: #fffaeb
- **Cream Deeper**: #fff0c2
- **Beige Deep**: #e6d5a8
- **Ink**: #1f1f1f — body text
- **Ink Tint**: #3d3d3d
- **Charcoal**: #2c2c2c
- **Slate**: #4a4a4a
- **Steel**: #6a6a6a
- **Stone**: #8a8a8a
- **Muted**: #a8a8a8
- **Hairline**: #e5e5e5
- **Hairline Soft**: #ededed
- **Hairline Strong**: #c7c7c7
- **Canvas**: #ffffff
- **Surface**: #fafafa
- **Surface Cream**: #fff8e0
- **Surface Cream Soft**: #fffaeb
- **Surface Code**: #1c1c1e
- **On Dark**: #ffffff
- **On Dark Muted**: #a8a8a8
- **Success**: #22C55E
- **Warning**: #F59E0B
- **Error**: #EF4444

## Typography
- **Display**: PP Editorial Old (serif) — hero, headlines, stat numbers
- **UI**: Inter (sans-serif) — body, buttons, labels, captions
- **Code**: JetBrains Mono (monospace) — code blocks

## Typography Scale
- **hero-display**: 84px / 1.05 / -1.5px — PP Editorial Old
- **display-lg**: 64px / 1.10 / -1px — PP Editorial Old
- **h1-display**: 52px / 1.15 / -0.5px — PP Editorial Old
- **h2**: 36px / 1.20 / -0.5px — Inter 500
- **h3**: 28px / 1.25 — Inter 500
- **h4**: 22px / 1.30 — Inter 500
- **h5**: 18px / 1.40 — Inter 500
- **subtitle**: 18px / 1.50 — Inter 400
- **body-md**: 16px / 1.55 — Inter 400
- **body-sm**: 14px / 1.50 — Inter 400
- **caption**: 13px / 1.40 — Inter 400
- **micro**: 12px / 1.40 — Inter 500
- **button-md**: 14px / 1.30 — Inter 500
- **stat-display**: 56px / 1.10 / -1px — PP Editorial Old
- **code-md**: 14px / 1.50 — JetBrains Mono

## Spacing (4px grid)
- xxs: 4px, xs: 8px, sm: 12px, md: 16px, lg: 20px, xl: 24px, xxl: 32px, xxxl: 40px
- section-sm: 48px, section: 64px, section-lg: 96px, hero: 120px

## Border Radius
- xs: 4px, sm: 6px, md: 8px, lg: 12px, xl: 16px, xxl: 20px
- Buttons: rounded.md (8px) — NOT pills
- Cards: rounded.lg (12px)
- Badges: rounded.full (9999px)

## Shadows
- sm: `0 1px 2px rgba(26, 21, 37, 0.06)`
- md: `0 4px 12px rgba(26, 21, 37, 0.08)`
- lg: `0 8px 24px rgba(26, 21, 37, 0.12)`

## Component States
- Focus ring: `0 0 0 2px #7c5cfc`
- Disabled: opacity 0.4
- Error: border-color #EF4444
- Transition: 150ms ease-out

## Key Components
- **Button**: primary, cream, dark, secondary, on-cream, link — rounded.md (8px)
- **Card**: base, feature, cream, cream-soft, feature-product, photographic — rounded.lg (12px)
- **TextInput**: canvas bg, hairline-strong border, focus: primary ring
- **TextArea**: same as input, resize vertical, min 100px
- **Badge**: primary, cream, dark — rounded.full (9999px)
- **PillTab**: active = ink bg, inactive = canvas border
- **SegmentedTab**: active = primary underline
- **CodeBlock**: surface-code bg, optional header
- **PipelineStep**: active=primary, pending=surface, complete=twilight-300
- **PipelineProgress**: vertical stepper with connecting lines
- **ScoreBar**: stat-display number + progress bar (color by score)
- **EvalBar**: composite of ScoreBars with average
- **TwilightStripe**: multi-stop gradient at page bottom
- **HeroBand**: atmospheric purple-blue gradient hero
