# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication
- User communicates in informal Indonesian (Bahasa Indonesia); match that language in replies and summaries. Confidence: 0.9
- Gives the assistant latitude to adapt their input to the existing app structure ("list-nya disesuaikan lagi aja" — just adjust it accordingly) and goes along with the recommended options when the assistant offers choices, rather than prescribing exact implementation details. Confidence: 0.65

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
- Expects brand/logo text to be rendered identically across all components: the footer must show "HERO INGREDIENTS" in all caps exactly like the navbar — including whitespace fidelity ("HERO INGREDIENTS", not "HEROINGREDIENTS") — and rejects cosmetic restyling of brand text in one spot (e.g., title-casing or losing the space between logo words) that diverges from the established display elsewhere. Confidence: 0.7
- Keeps the footer "Hubungi Kami" contact block lean: explicitly wants the website URL line removed and the phone number shown as the WhatsApp number — no separate Web entry and no duplicated Telp/WA lines in user-facing contact content. Confidence: 0.5
- Prefers single-purpose public pages to stay lean and open directly with their functional content: the contact page should show only the contact details + map (plus the working form), explicitly removing the decorative big hero banner from the top of it. Confidence: 0.55
- Cares about polish of storefront/auth-page interactions: complained the Masuk↔Daftar tab switching felt jumpy/rough and the flow was confusing — expects smooth state transitions (fade + slight slide, no layout jumping, autofocus on the first field) and sensible redirects (only send to checkout when arriving from a buy button; otherwise land back on the catalog, not an empty checkout). Also explicitly verifies tab behavior afterwards: when "Masuk" is active only the login form may be visible, and switching to "Daftar" must hide it entirely — inactive panels must be truly hidden (display:none), not left visible under/next to the active one. Confidence: 0.65
- Expects key account actions to be surfaced as a clearly visible button, not a thin link: requested a proper pill-style "Masuk" button in the navbar (desktop and mobile) that turns into "Keluar" and logs out when a customer session exists. Confidence: 0.55
