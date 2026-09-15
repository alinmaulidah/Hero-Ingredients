# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication
- User communicates in informal Indonesian (Bahasa Indonesia); match that language in replies and summaries. Confidence: 0.9
- Gives the assistant latitude to adapt their input to the existing app structure ("list-nya disesuaikan lagi aja" — just adjust it accordingly) and goes along with the recommended options when the assistant offers choices, rather than prescribing exact implementation details. Confidence: 0.65
- When the assistant asks for a credential/secret, typically replies with just the bare value (e.g. a raw API token as the entire message, no surrounding text or formatting) expecting the assistant to take it and proceed, so don't wait for an explicit "go ahead". Confidence: 0.5
- For intern/stakeholder-facing deliverables (reporting a project up to a superior — "ngasi keatasan"), wants a formatted Word (.docx) document written in plain, non-technical Indonesian that illustrates every feature with a screenshot of the running app (real rendered pages, not mockups), and includes a recommendations section — not just a chat summary. Confidence: 0.5

# environment
See [environment/taste.md](environment/taste.md)
# products
- The app's catalog should be driven by the user's official product list (typically a spreadsheet with Kategori → Form/Subkategori → Produk ID/EN → Common Name → INCI → Ukuran columns): real materials (Pegagan, Kunyit, Aloe Vera, Licorice, ...) replace placeholder/demo products once provided, and static fallback data must be kept consistent with the seeded database so no stale demo "ghost" products appear when the API is down. Confidence: 0.6
- Treats the same base material/product that differs only in type/spec/grade (e.g., Turmeric Fine vs Eco, Dry Slices vs Grind) as a single product: group variants under one catalog card with in-card selectors for type ("Jenis") and packaging ("Kemasan"), never as separate parallel cards. Confidence: 0.9
- When one product spans several top-level forms (e.g., Centella has Extract Liquid / Powder / Dry Slices), still keeps it as a single card and wants an additional in-card "Kategori" chip layer that filters which Jenis options appear; selection cascades Kategori → Jenis → Kemasan and the price shown updates for the chosen combination. Confidence: 0.7

# astro
- All user-facing text across project pages (CompanyProfile.astro, about.astro, etc.) must include bilingual `data-lang-id` (Indonesian) and `data-lang-en` (English) attributes, with visible fallback text defaulting to Indonesian. Confidence: 0.80

# e-commerce
See [e-commerce/taste.md](e-commerce/taste.md)
# ui / branding
See [ui-/-branding/taste.md](ui-/-branding/taste.md)
# documentation
- For technical setup/deployment instructions, prefers a dedicated markdown file under `docs/` with a short pointer section in `README.md`, rather than README-only instructions or a `.docx` (Word is reserved for reporting the project up to a superior) — the guide should be click-by-click for someone new to infra and include a troubleshooting section. Confidence: 0.5
