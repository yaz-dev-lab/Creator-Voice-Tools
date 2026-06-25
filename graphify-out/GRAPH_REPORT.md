# Graph Report - .  (2026-06-25)

## Corpus Check
- Corpus is ~13,461 words - fits in a single context window. You may not need a graph.

## Summary
- 90 nodes · 126 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_BM25 Search Engine|BM25 Search Engine]]
- [[_COMMUNITY_Design System Formatter|Design System Formatter]]
- [[_COMMUNITY_Design System Generator|Design System Generator]]
- [[_COMMUNITY_Landing Page Visuals|Landing Page Visuals]]
- [[_COMMUNITY_Accessibility & UX Rules|Accessibility & UX Rules]]
- [[_COMMUNITY_Discord & Voice Presets|Discord & Voice Presets]]
- [[_COMMUNITY_Pricing & Monetization|Pricing & Monetization]]
- [[_COMMUNITY_Visual Identity Tokens|Visual Identity Tokens]]
- [[_COMMUNITY_Search CLI Output|Search CLI Output]]

## God Nodes (most connected - your core abstractions)
1. `Creator Voice Tools Landing Page (index.html)` - 19 edges
2. `DesignSystemGenerator` - 11 edges
3. `_search_csv()` - 8 edges
4. `BM25` - 7 edges
5. `search()` - 7 edges
6. `generate_design_system()` - 7 edges
7. `persist_design_system()` - 5 edges
8. `_generate_intelligent_overrides()` - 5 edges
9. `UI/UX Pro Max Skill` - 5 edges
10. `Discord as Distribution & Community Channel` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Creator Voice Tools Landing Page (index.html)` --conceptually_related_to--> `html-tailwind Stack (Default)`  [INFERRED]
  index.html → .claude/skills/ui-ux-pro-max/SKILL.md
- `prefers-reduced-motion Media Query` --implements--> `Accessibility Rules (CRITICAL priority)`  [INFERRED]
  index.html → .claude/skills/ui-ux-pro-max/SKILL.md
- `FAQ Toggle JS (aria-expanded sync)` --implements--> `Accessibility Rules (CRITICAL priority)`  [INFERRED]
  index.html → .claude/skills/ui-ux-pro-max/SKILL.md
- `Floating Navigation Bar` --implements--> `Floating Navbar Layout Rule`  [INFERRED]
  index.html → .claude/skills/ui-ux-pro-max/SKILL.md
- `Dark Cyberpunk Color Palette (indigo + green on near-black bg)` --implements--> `Light/Dark Mode Contrast Rules`  [INFERRED]
  index.html → .claude/skills/ui-ux-pro-max/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Creator Voice Tools landing page sections form a complete conversion funnel** — index_hero_section, index_voices_section, index_pricing_section, index_vouches_section, index_discord_cta_section [INFERRED 0.95]
- **Discord is the central hub for delivery, community, and commission payouts** — index_discord_integration, index_pricing_tiers, index_commission_tiers [EXTRACTED 1.00]
- **Design tokens, typography, and color palette collectively implement the site visual identity** — index_design_tokens, index_typography_system, index_dark_color_palette [INFERRED 0.95]

## Communities (9 total, 1 thin omitted)

### Community 0 - "BM25 Search Engine"
Cohesion: 0.15
Nodes (15): BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25 (+7 more)

### Community 1 - "Design System Formatter"
Cohesion: 0.17
Nodes (16): _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides(), persist_design_system() (+8 more)

### Community 2 - "Design System Generator"
Cohesion: 0.16
Nodes (9): DesignSystemGenerator, Select best matching result based on priority keywords., Extract results list from search result dict., Generate complete design system recommendation., Generates design system recommendations from aggregated searches., Load reasoning rules from CSV., Execute searches across multiple domains., Find matching reasoning rule for a category. (+1 more)

### Community 3 - "Landing Page Visuals"
Cohesion: 0.27
Nodes (10): CSS Keyframe Animations (wave, blink, glitch, fadeup, float), Footer, Glitch Hover Effect (.glitch CSS class), Hero Section, How It Works Section (#howitworks), Creator Voice Tools Landing Page (index.html), What You Receive Section (#receive), prefers-reduced-motion Media Query (+2 more)

### Community 4 - "Accessibility & UX Rules"
Cohesion: 0.25
Nodes (9): FAQ Toggle JS (aria-expanded sync), FAQ Section (#faq), Accessibility Rules (CRITICAL priority), Design System Generator (--design-system flag), html-tailwind Stack (Default), MASTER.md Design System File, Pre-Delivery UI Checklist, search.py CLI Script (+1 more)

### Community 5 - "Discord & Voice Presets"
Cohesion: 0.33
Nodes (6): Discord CTA Section (#discord-cta), Discord as Distribution & Community Channel, Floating Navigation Bar, Voice Preset Cards (Peterbot, IShowSpeed, Clix, SypherPK, Ninja, MKBHD, Valkyrae), Voice Presets Section (#voices), Floating Navbar Layout Rule

### Community 6 - "Pricing & Monetization"
Cohesion: 0.50
Nodes (4): Promoter Commission Tiers (25%, 35%, 50%), Pricing Section (#pricing), Pricing Tiers (Starter $9, Creator Pack $19, Full Pack $34), Promoters / Affiliate Tiers Section (#promoters)

### Community 7 - "Visual Identity Tokens"
Cohesion: 0.50
Nodes (4): Dark Cyberpunk Color Palette (indigo + green on near-black bg), CSS Design Tokens (:root variables), Typography System (Syncopate headings + Space Mono body), Light/Dark Mode Contrast Rules

## Knowledge Gaps
- **7 isolated node(s):** `search.py CLI Script`, `MASTER.md Design System File`, `What You Receive Section (#receive)`, `How It Works Section (#howitworks)`, `Vouches / Testimonials Section (#vouches)` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `search()` connect `BM25 Search Engine` to `Design System Formatter`, `Design System Generator`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **Why does `Creator Voice Tools Landing Page (index.html)` connect `Landing Page Visuals` to `Accessibility & UX Rules`, `Discord & Voice Presets`, `Pricing & Monetization`, `Visual Identity Tokens`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `search()` (e.g. with `.generate()` and `._multi_domain_search()`) actually correct?**
  _`search()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words`, `Build BM25 index from documents` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BM25 Search Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._