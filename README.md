# Racors Website — Front-end (ready for a dynamic backend)

HTML5 + **Bootstrap 5.3.8** + Bootstrap Icons + plain JavaScript.
No API and no build tools. All content is in `index.html`, ready for the backend (PHP / Laravel / CodeIgniter etc.) to render from the database. JavaScript only handles interactions (tabs, logo filter, slider, modal, form validation).

Open `index.html` in a browser to view it.

## Files

```
index.html              home page (sections marked with  <!-- ===== SECTION: … -->)
products.html           product listing / category page (filters, sort, pagination)
product-detail.html     single product page (gallery, specs, enquiry form, FAQ, related)
about.html              about us (stats, overview, mission/vision, values, milestones, export presence, downloads)
services.html           services (banner + image service cards + CTA)
industries.html         industries list (banner + alternating image/text rows)
industry-detail.html    one industry (banner + fixed section menu with auto-switching + scrolling content)
gallery.html            gallery (category filter, image/video tiles, Load More, lightbox)
assets/css/style.css    all styles (tokens → base → layout → components → sections)
assets/js/main.js       all interactions
assets/images/          logos, hero, tiles, products, industries, clients/, gallery/
assets/videos/          sample-video-1/2.mp4 (placeholders for the gallery lightbox)
README.md               this guide
```

The images are **placeholders cut from the design**. Replace them, keeping the same names.
**Motion:** navigation "text morph swipe" (desktop: letters roll up on hover, staggered, and an underline glides to the hovered tab, then back to the active page; the active page is the nav link with class `active`) · the same letter roll on dropdown items and on the tabs (industries + client regions); the selected tab fills blue with a swipe that comes from the side of the previous tab · outline buttons fill blue with a left-to-right swipe on hover/click · footer social icons roll up (morph swipe) with a blue box gliding between them · floating contact button opens into WhatsApp + Call (staggered rise, chat icon swipes into ✕, label letters roll on hover; Esc / outside click closes) · page loader (`#rcPreloader`, slides away when the page has loaded, max 5 s) → hero slider ([Swiper](https://swiperjs.com) 14: horizontal slide with parallax layers, slow zoom on the active image, 6 s autoplay with progress dots, swipe / keyboard / arrows; pauses on hover) → hero entrance animation → fade-up on scroll (`.rc-reveal`). Smooth inertia scrolling uses [Lenis](https://github.com/darkroomengineering/lenis) 1.3 from CDN. All animation is switched off for users with "reduce motion" enabled, and the site still works if the CDN fails (native scrolling).
Slider timing: `delay` (autoplay, ms) and `speed` (transition, ms) in the hero slider block of `main.js`. Parallax strength: the `data-swiper-parallax` values on each slide.
To change the scroll feel, edit `lerp` in `main.js` (lower = smoother/slower, e.g. 0.07; higher = snappier, e.g. 0.15).

To re-theme the site, edit the tokens block at the top of `style.css` (`--rc-primary`, `--rc-dark`, `--rc-surface` …).

## How dynamic parts are marked

| Marker | Meaning |
|---|---|
| `<!-- LOOP: products -->` … `<!-- END LOOP -->` | Repeat the item once per database row |
| `data-loop="products"` | Container of the loop |
| `data-item` | The element to repeat |
| `data-field="title"` | Print this field as the text |
| `data-field-href="url"` / `data-field-src="image"` / `data-field-alt="image_alt"` | Print this field into that attribute |
| `settings.xxx` | Value from the site-settings table |
| `<!-- IF brochure_pdf -->` … `<!-- END IF -->` | Output only when the field has a value |

**Shared parts:** the header, page loader, footer, enquiry modal and chat button are identical on all three pages. Make each one a single include in your templates.

**Converting:** split the pages at the `SECTION` / `LAYOUT` / `COMPONENT` comments into template includes (header, footer, each section, enquiry modal), and copy `assets/` to your public folder.

## 1. Dynamic content map

### Loops (database lists)

| Section | Loop | Table | Fields used | Notes |
|---|---|---|---|---|
| Hero slider | `hero_slides` | `hero_slides` | `image, image_alt, title, lead, button1_label, button1_url, button2_label, button2_url` | `ORDER BY sort_order`. First slide: `<h1 id="hero-title">` + `fetchpriority="high"`; others `<h2>` + `loading="lazy"`. One slide = static hero (controls hide automatically). |
| Equipment  | `featured_products` | `products` | `id, title, product_count, short_description, image, image_alt, url, brochure_pdf` | `is_featured = 1`, `ORDER BY sort_order`, max 4. Hide the Brochure button when `brochure_pdf` is empty. |
| Equipment | `categories` → `category.items` | `categories`, `category_items` | category: `title, subtitle`; item: `label, count_label, url` | Nested loop. Add class `rc-cat-link--sm` to items when the category has 3+ items. `count_label` = "20 Parts" (count + unit). |
| Industries  | `industries` (**twice**: tabs, then panels) | `industries` | `slug, name, title, description, image, image_alt, url` | First row is active (see §2). |
| Industries | `industry.applications` | `industries.applications` (JSON) or `industry_applications` | text | Bullet list. |
| Clients  | `regions` | `regions` | `slug, label` | Filter buttons: clicking one shows only that region's logos (click again to show all). |
| Clients | `clients` | `clients` | `name, logo, region` | `data-region` must equal a region `slug`. |
| Clients | `testimonials` | `testimonials` | `quote, author_name, author_role, avatar` | No avatar → print initials (e.g. "MT"). |
| FAQ  | `faqs` | `faqs` | `id, question, answer, is_expanded` | Ids must be unique: `faq-{id}-h`, `faq-{id}-c`. |
| Enquiry form  | `products` (select options) | `products` | `id, title` | All active products. |

### Product listing (`products.html`)

Filtering is done **on the server with a normal GET form** (no API). Every change submits the form (on mobile, after "Show results"):

```
products.html?category[]=dewatering-pumps&application[]=mining&size[]=6&in_stock=1&sort=relevance&page=2
```

| Loop / field | Table | Notes |
|---|---|---|
| `categories` (checkboxes) | `categories` | `slug, name, product_count`; tick the ones in `category[]` |
| `applications` | `industries` (or `applications`) | `slug, name` |
| `sizes` | distinct `products.size_inch` | value = inch number |
| `category.title`, `category.description` | `categories` | page heading and intro of the selected category |
| `from`, `to`, `total` | — | "Showing 1–12 of 24 results" |
| `products` | `products` | 12 per page, card fields as on the home page |
| Pagination | — | keep the current query string in every page link; `is-active` + `aria-current="page"` on the current page |
| `sort` values | — | `relevance`, `newest`, `size_asc`, `size_desc`, `name` |

### Product detail (`product-detail.html`)

| Loop / field | Suggested table | Notes |
|---|---|---|
| `title, sku, short_description, size_label, category.title/url, brochure_pdf, whatsapp_link` | `products` | `whatsapp_link` = `https://wa.me/<number>?text=<product name>` |
| `product.images` | `product_images` (`image, image_alt, sort_order`) | first image = main image; thumbs carry the big image in `data-full` |
| `product.stats` | `product_stats` (`label, value, unit`) | 4 key numbers |
| `product.features` | `product_features` (`text`) | "Key features" bullets |
| `product.assurances` | settings or `product_assurances` | warranty strip (3 items) |
| `description_html` | `products.description` | rich text from the admin editor |
| `product.attributes` | `product_attributes` (`label, value`) | "Additional information" |
| `product.spec_rows` | `product_specs` (`pump_label, pump_value, material_label, material_value, sort_order`) | spec table, two groups side by side |
| `product.core_features` | `product_core_features` (`icon, title, text`) | `icon` = Bootstrap Icons class, e.g. `bi-water` |
| `product.faqs` | `product_faqs` (`question, answer, is_expanded`) | |
| `related_products` | `products` | same category, exclude current, max 4; `product.tags` = small chips (e.g. "Head up to 40 m") |
| Inline enquiry form | `enquiries` | same POST `/enquiry` and rules as the modal; hidden `product_id` = current product |

### Inner pages (about, services, industries, industry detail)

| Block | Loop / fields | Suggested table | Notes |
|---|---|---|---|
| Page banner (services, industries, industry detail) | `banner_image, banner_image_alt, banner_title, banner_lead` | page fields / `pages` | `<img>` + brand overlay; add `rc-page-hero--center` for the centred version |
| Service cards | LOOP `services`: `image, image_alt, title, summary, url` | `services` | whole card is clickable |
| Industry rows | LOOP `industries`: `title, summary, image, image_alt, applications, url` | `industries` | image left/right alternates automatically |
| Industry detail – Overview | `title, summary, applications, overview_image` | `industries` | |
| Industry detail – Key Features | LOOP `industry.features` (`title, text`), `uses_title, uses_text, uses_image`, LOOP `industry.uses` (`title, text`) | `industry_features`, `industry_uses` | |
| Industry detail – Global Presence | `region_title, region_text_html` | `industries` | |
| Industry detail – side menu | — | — | sticky; the active item follows the section in view. To add a section: give it `id` + `data-spy-section` and add a matching menu link |
| About – stats | LOOP `stats`: `value` (number only), suffix, `label` | `about_stats` / settings | numbers count up when visible |
| About – lists | LOOP `who_we_are`, `what_we_do` | settings | |
| About – values | LOOP `values`: `title, text` | `company_values` | number (01, 02…) is automatic |
| About – milestones | LOOP `milestones` (rendered twice: timeline buttons + detail panes): `year, label, title, text` | `milestones` | any number of items: the timeline scrolls sideways (arrows / year click / keys / drag / swipe) and keeps the active year centred; first item active, other panes `hidden` |
| About – regions | LOOP `regions`: `title, text, is_featured` + LOOP `region.countries` | `export_regions` | featured region = dark card with home base + country chips |
| About – downloads | LOOP `downloads`: `title, subtitle, file` | `downloads` | |

### Gallery (`gallery.html`) + lightbox

| Block | Loop / fields | Suggested table | Notes |
|---|---|---|---|
| Category filter | LOOP `gallery_categories`: `slug, name` | `gallery_categories` | GET form `gallery.html?category[]=projects&page=2`, auto-submits |
| Tiles | LOOP `gallery_items`: `type` (image / video), `thumbnail`, `image_large` (image) or `video_url` (video), `caption` | `gallery_items` | image tile: `href` = large image; video tile: `href` = `.mp4` **or** a YouTube link (`youtube.com/watch?v=…`, `youtu.be/…`) – detected automatically |
| Load More | link to the next page | — | JS fetches the next page's HTML and appends the tiles (no reload); remove the button on the last page |

**Lightbox:** add `data-lightbox="any-group-name"` to any link (on any page) and it opens in the lightbox. Optional: `data-type="image|video"`, `data-caption`, `data-poster`. Features: prev/next, counter, caption, thumbnails, keyboard (← → Esc), swipe, videos play inside and stop when closed. No markup needed: the script builds it.

### Single values (site settings / page fields)

| Field | Used in |
|---|---|
| `about_title`, `about_text`, the 4 image tiles | Who we are |
| Services (4 cards: icon, title, text) | Services (can stay static, or use a `services` table) |
| `sales_phone`, `whatsapp_number`, `contact_email` | FAQ contact cards, floating contact button (speed-dial: WhatsApp + Call) |
| `address`, `contact_email`, `phone`, `company_about`, `social_facebook/youtube/linkedin/instagram/x` | Footer |
| Menu items, active page | Header (add `.active` + `aria-current="page"` to the current link) |

Search `index.html` for `LOOP:`, `data-field`, `settings.` and `BACKEND:` to find every integration point.

---

## 2. Loop examples

### Product cards — Laravel Blade
```blade
<div class="row g-4" data-loop="featured_products">
  @foreach ($featuredProducts as $p)
    <div class="col-sm-6 col-lg-3">
      <article class="rc-product">
        <a class="rc-product__media" href="{{ route('products.show', $p->slug) }}">
          <img src="{{ asset($p->image) }}" alt="{{ $p->image_alt }}" width="373" height="252" loading="lazy">
        </a>
        <div class="rc-product__body">
          <span class="rc-product__meta">{{ $p->product_count }} products</span>
          <h3 class="rc-product__title">{{ $p->title }}</h3>
          <p class="rc-product__desc">{{ $p->short_description }}</p>
          <div class="rc-product__actions">
            <button type="button" class="btn rc-btn rc-btn-dark rc-btn-sm" data-bs-toggle="modal"
                    data-bs-target="#enquiryModal" data-enquiry-type="quote" data-product-id="{{ $p->id }}">Get a Quote</button>
            @if ($p->brochure_pdf)
              <a class="btn rc-btn rc-btn-ghost-sm" href="{{ asset($p->brochure_pdf) }}" download>Brochure <i class="bi bi-download"></i></a>
            @endif
          </div>
        </div>
      </article>
    </div>
  @endforeach
</div>
```

### Industry tabs — first item active (Core PHP)
```php
<div class="rc-tabs" role="tablist" aria-label="Industries">
<?php foreach ($industries as $i => $ind): $first = $i === 0; ?>
  <button type="button" class="rc-tab<?= $first ? ' active' : '' ?>" role="tab"
          id="tab-<?= e($ind['slug']) ?>" data-bs-toggle="tab" data-bs-target="#industry-<?= e($ind['slug']) ?>"
          aria-controls="industry-<?= e($ind['slug']) ?>" aria-selected="<?= $first ? 'true' : 'false' ?>"
          <?= $first ? '' : 'tabindex="-1"' ?>><?= e($ind['name']) ?></button>
<?php endforeach; ?>
</div>

<div class="tab-content">
<?php foreach ($industries as $i => $ind): ?>
  <div class="tab-pane fade rc-industry<?= $i === 0 ? ' show active' : '' ?>" id="industry-<?= e($ind['slug']) ?>"
       role="tabpanel" aria-labelledby="tab-<?= e($ind['slug']) ?>" tabindex="0">
    … same inner markup as in index.html; loop json_decode($ind['applications']) into <li> …
  </div>
<?php endforeach; ?>
</div>
```
(`e()` = `htmlspecialchars($v, ENT_QUOTES, 'UTF-8')`. Always escape output.)

### FAQ — expanded item
```blade
@foreach ($faqs as $f)
  <div class="accordion-item">
    <h3 class="accordion-header" id="faq-{{ $f->id }}-h">
      <button class="accordion-button {{ $f->is_expanded ? '' : 'collapsed' }}" type="button" data-bs-toggle="collapse"
              data-bs-target="#faq-{{ $f->id }}-c" aria-expanded="{{ $f->is_expanded ? 'true' : 'false' }}"
              aria-controls="faq-{{ $f->id }}-c">{{ $f->question }}</button>
    </h3>
    <div id="faq-{{ $f->id }}-c" class="accordion-collapse collapse {{ $f->is_expanded ? 'show' : '' }}"
         aria-labelledby="faq-{{ $f->id }}-h" data-bs-parent="#faqAccordion">
      <div class="accordion-body">{{ $f->answer }}</div>
    </div>
  </div>
@endforeach
```

---

## 3. Enquiry / quote form

A normal HTML form  inside a Bootstrap modal:
`<form action="/enquiry" method="post">`. JavaScript only checks fields in the browser, then lets the form submit normally.

### Fields (name = suggested DB column)

| name | Type | Validation |
|---|---|---|
| `_token` | hidden | CSRF token (Laravel `@csrf`) |
| `type` | hidden | `general` \| `quote` \| `brochure` (set by the button that opened the modal) |
| `source_page` | hidden | page path the form was sent from |
| `name` | text | required, 2–120 |
| `company` | text | optional, ≤ 160 |
| `phone` | tel | required, `^\+?[0-9\s\-]{7,20}$` |
| `email` | email | required, valid, ≤ 160 |
| `product_id` | select | optional, must exist in `products` |
| `requirement` | select | `purchase` \| `rental` \| `project` \| `repair` |
| `message` | textarea | required, 10–2000 |
| `consent` | checkbox (`1`) | required |
| `website` | text (hidden) | **Honeypot.** If filled, it's a bot: pretend success and save nothing. |

### What the server does
1. Check the CSRF token and the honeypot, then validate (rules above). Always validate on the server.
2. **Success:** save to `enquiries`, email sales (and optionally auto-reply the customer), then **redirect back** with a success flash message.
3. **Errors:** redirect back with the errors and the old input.

### Showing the result (modal re-opens by itself)
On page load, `enquiry-form.js` re-opens the modal automatically if it finds a visible flash message or a field with `.is-invalid`.

```blade
{{-- success / error flash (already in index.html; just toggle d-none) --}}
<div class="alert alert-success rc-form__status {{ session('enquiry_success') ? '' : 'd-none' }}" data-flash="success">
  {{ session('enquiry_success') }}
</div>
<div class="alert alert-danger rc-form__status {{ $errors->any() ? '' : 'd-none' }}" data-flash="error">
  Please correct the highlighted fields.
</div>

{{-- each field: old value + error state --}}
<input type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required>
<div class="invalid-feedback">@error('email'){{ $message }}@else Please enter a valid email.@enderror</div>
```
For a re-rendered quote, also print `old('type')`, `old('product_id')` (mark that `<option>` `selected`) and the right modal title.

Recommended extras: rate-limit by IP (e.g. 5 per 10 minutes), store the IP and user agent, add Google reCAPTCHA v3 if spam appears.

---

## 4. Suggested database tables

```
hero_slides       id, image, image_alt, title, lead, button1_label, button1_url,
                  button2_label, button2_url, is_active, sort_order
products          id, slug, sku, size_inch, size_label, in_stock, description, title, product_count, short_description, image, image_alt,
                  brochure_pdf NULL, is_featured, is_active, sort_order, timestamps
categories        id, title, subtitle, sort_order
category_items    id, category_id → categories, label, count, unit ('Parts'|'Products'|''), url, sort_order
industries        id, slug, name, title, description, image, image_alt, applications JSON, url, sort_order
regions           id, slug, label, sort_order
clients           id, name, logo, region_slug → regions.slug, is_active, sort_order
testimonials      id, quote, author_name, author_role, avatar NULL, is_active, sort_order
faqs              id, question, answer, is_expanded, sort_order
enquiries         id, type, name, company, phone, email, product_id NULL, requirement, message,
                  consent, source_page, ip, user_agent, status ('new'|'contacted'|'closed'), created_at
settings          key, value      (hero_*, phones, emails, address, socials)
```
For Arabic (the language switcher is in the nav), add translation columns or tables for the text fields.

**Admin panel:** CRUD with image upload and drag-to-reorder (`sort_order`) for every table above, plus an enquiries list with status and CSV export.

---

## 5. Image sizes for uploads

| Image | Size (px) | Format |
|---|---|---|
| Hero slide image | 1920 × 1080 (keep the subject on the right; text sits on the left) | JPG/WebP, ≤ 300 KB |
| Image tiles (about) | 800 × 600 | JPG/WebP |
| Product image | 750 × 500, light/transparent background | PNG/WebP |
| Industry image | 1000 × 750 | JPG/WebP |
| Client logo | 400 × 250, transparent | PNG/SVG |
| Testimonial avatar | 96 × 96 | JPG |

---

## 6. Go-live checklist

- [ ] Loops output real data; all output escaped
- [ ] Current page highlighted in the nav
- [ ] Enquiry form: CSRF, validation, honeypot, rate limit, email to sales; success + error paths tested
- [ ] Final images uploaded (sizes above)
- [ ] HTTPS enabled
- [ ] If your CSP is strict, allow `cdn.jsdelivr.net` (Bootstrap, Icons, Swiper, Lenis), `fonts.googleapis.com`, `fonts.gstatic.com`, or self-host Bootstrap and the font
