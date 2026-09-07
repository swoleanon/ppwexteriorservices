# Preferred Power Washing — Photo-First Multi-Page Redesign

This redesign uses the **information architecture and conversion strategy** of established exterior-cleaning websites as inspiration, while keeping the PPW visual identity original.

## Pages
- `index.html` — homepage
- `residential.html` — residential landing page
- `commercial.html` — commercial landing page
- `pressure-washing.html` — pressure washing landing page
- `window-cleaning.html` — window cleaning landing page
- `landscaping.html` — landscaping landing page
- `junk-removal.html` — residential and commercial junk removal landing page
- `maintenance-plans.html` — recurring PPW Care Plans
- `contact.html` — quote-request page

## Important
The photography is loaded remotely from Pexels. If you later provide your own project photos, replace the Pexels image URLs in the HTML with your real PPW work. Real project photography will make the site substantially stronger.

## Before publishing
Search and replace:
- `YOUR PHONE NUMBER`
- `YOUR EMAIL ADDRESS`
- `YOUR SERVICE AREA`

The quote form is visual only. Connect it to Formspree, your CRM, booking software, or a Cloudflare Worker endpoint before launch.

## GitHub / Cloudflare
Replace the old repository files with this package, commit to the production branch, and Cloudflare should automatically redeploy if your Git integration remains connected.
