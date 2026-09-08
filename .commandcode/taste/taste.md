# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication
- User communicates in informal Indonesian (Bahasa Indonesia); match that language in replies and summaries. Confidence: 0.9
- Gives the assistant latitude to adapt their input to the existing app structure ("list-nya disesuaikan lagi aja" — just adjust it accordingly) and goes along with the recommended options when the assistant offers choices, rather than prescribing exact implementation details. Confidence: 0.5

# environment
See [environment/taste.md](environment/taste.md)
# products
- The app's catalog should be driven by the user's official product list (typically a spreadsheet with Kategori → Form/Subkategori → Produk ID/EN → Common Name → INCI → Ukuran columns): real materials (Pegagan, Kunyit, Aloe Vera, Licorice, ...) replace placeholder/demo products once provided, and static fallback data must be kept consistent with the seeded database so no stale demo "ghost" products appear when the API is down. Confidence: 0.6
- Treats the same base material/product that differs only in type/spec/grade (e.g., Turmeric Fine vs Eco, Dry Slices vs Grind) as a single product: group variants under one catalog card with in-card selectors for type ("Jenis") and packaging ("Kemasan"), never as separate parallel cards. Confidence: 0.9
- When one product spans several top-level forms (e.g., Centella has Extract Liquid / Powder / Dry Slices), still keeps it as a single card and wants an additional in-card "Kategori" chip layer that filters which Jenis options appear; selection cascades Kategori → Jenis → Kemasan and the price shown updates for the chosen combination. Confidence: 0.7

# astro
- All user-facing text across project pages (CompanyProfile.astro, about.astro, etc.) must include bilingual `data-lang-id` (Indonesian) and `data-lang-en` (English) attributes, with visible fallback text defaulting to Indonesian. Confidence: 0.80

# e-commerce
- Prefers guest checkout (no mandatory login/account) for the catalog storefront; checkout form data + payment gateway (Midtrans) order history suffice. Prefers keeping purchase friction low for this B2B company-profile site. Confidence: 0.8
- Expects a web-based admin panel (admin login + product entry/CRUD + order list with payment status/notifications) for managing the store, not raw API calls (Postman), seed scripts, or manual DB edits. Confidence: 0.7
- Prefers the admin dashboard and the buyer storefront built/deployed together on a single hosting/domain (same-origin, e.g. `/admin` UI + `/api` behind one server) rather than as separate apps; when discussing hosting, expects the admin to automatically ride along to the same hosting as the website. Confidence: 0.7
ogether on a single hosting/domain (same-origin, e.g. `/admin` UI + `/api` behind one server) rather than as separate apps. Confidence: 0.6

# ui / branding
- Expects brand/logo text to be rendered identically across all components: the footer must show "HERO INGREDIENTS" in all caps exactly like the navbar — including whitespace fidelity ("HERO INGREDIENTS", not "HEROINGREDIENTS") — and rejects cosmetic restyling of brand text in one spot (e.g., title-casing or losing the space between logo words) that diverges from the established display elsewhere. Confidence: 0.7
- Keeps the footer "Hubungi Kami" contact block lean: explicitly wants the website URL line removed and the phone number shown as the WhatsApp number — no separate Web entry and no duplicated Telp/WA lines in user-facing contact content. Confidence: 0.5
