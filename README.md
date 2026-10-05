# eBay Product Hunting & Profit Calculator

A fast, modern profit calculator for eBay sellers, built with plain HTML, CSS and JavaScript. No frameworks, no build step, no database.

Branded by **Skillzhub** – *Advanced eBay Product Hunting & Selling*.

## Features

- **Marketplaces:** USA, UK and Australia, each with its own currency and fee defaults
- **Instant calculations:** eBay fee, tax/VAT/GST, fixed fee, ad fee, total fees, total expenses, net profit, margin %, ROI %, break-even price and max buying price
- **Ad rate presets:** 0%, 2%, 5%, 8%, 10%, 15% or a custom value
- **Product verdict:** 🟢 BUY, 🟡 CONSIDER or 🔴 AVOID, based on configurable thresholds
- **Product analysis:** fee breakdown bar and plain-language insights
- **Saved products:** stored in your browser with LocalStorage
- **Compare:** select 2 or more saved products side by side
- **CSV export, print and reset**
- **Dark / light mode**, responsive layout and tooltips
- **Input validation:** invalid values are highlighted, and `NaN` / `Infinity` are never shown

## Project structure

```
index.html   Page structure
style.css    Design, themes and responsive layout
script.js    CONFIG, calculations and app logic
README.md    This file
```

## Getting started

1. Keep all files in the same folder.
2. Open `index.html` in any modern browser.

That's all. It works offline.

## Configuration

All branding, contact details, fees and thresholds are in the `CONFIG` object at the top of `script.js`.

### Branding and contact

```js
skillzhub: {
  name: "Skillzhub",
  tagline: "Advanced eBay Product Hunting & Selling",
  whatsapp: "923007658405",         // country code, no +, spaces or dashes
  contact: "+92 3007658405",       // display text
  website: "https://www.skool.com/skillzhub-5151"
},
author: {
  name: "Tayyab",
  whatsapp: "923291049546",
  facebook: "https://www.facebook.com/tayyabsaeedebay/",
  instagram: "https://www.instagram.com/m.tayyabsaeed0/"
}
```

### Fees

```js
markets: {
  US: { label: "🇺🇸 USA", currency: "USD", locale: "en-US", feePct: 14.5, fixed: 0.40, taxPct: 0,  taxName: "Tax" },
  UK: { label: "🇬🇧 UK",  currency: "GBP", locale: "en-GB", feePct: 14.5, fixed: 0.40, taxPct: 20, taxName: "VAT" },
  AU: { label: "🇦🇺 Australia", currency: "AUD", locale: "en-AU", feePct: 14.5, fixed: 0.40, taxPct: 10, taxName: "GST" }
}
```

Fees can also be changed live from the **Fee settings** panel in the calculator.

Set `taxOnAds: true` if tax should also apply to the ad fee (default is `false`).

### Verdict thresholds

```js
thresholds: {
  buy:      { profit: 5, margin: 15, roi: 30 },
  consider: { profit: 2, margin: 8,  roi: 15 }
}
```

- **BUY:** profit, margin and ROI all meet the BUY thresholds
- **CONSIDER:** all meet the CONSIDER thresholds
- **AVOID:** anything else

Profit is in the marketplace currency; margin and ROI are percentages.

## Formulas

```
eBay % fee     = Selling Price × Fee %
Tax on fees    = (eBay % fee + Fixed fee) × Tax %
Ad fee         = Selling Price × Ad Rate %
Total fees     = eBay % fee + Tax + Fixed fee + Ad fee
Total expenses = Product cost + Shipping + Other cost + Total fees
Net profit     = Selling Price − Total expenses
Margin %       = Net profit ÷ Selling Price × 100
ROI %          = Net profit ÷ Product cost × 100
Break-even     = price at which Net profit = 0
Max buy price  = Selling Price − Shipping − Other − Total fees − BUY profit threshold
```

If a value can't be calculated (for example ROI with a cost of 0), the app shows `N/A` or `—`.

## Saved products and data

- Products are saved in your browser's **LocalStorage**. There is no server or database.
- Data stays after refreshing or closing the browser.
- Data is **per browser, per device and per domain**. It is lost if you clear site data or use private mode.
- Use **Export CSV** regularly to keep a backup.

## Deploying to Vercel

1. Upload the files to the root of a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repo.
3. Set **Framework Preset** to **Other**, leave build settings empty, then click **Deploy**.

Or from a terminal in the project folder: `npm i -g vercel`, then `vercel --prod`.

## Adding a favicon (tab logo)

Place `favicon.png` next to `index.html` and add this inside `<head>`:

```html
<link rel="icon" type="image/png" href="favicon.png">
```

## Browser support

Works in current versions of Chrome, Edge, Firefox and Safari.

## Credits

Made with ❤️ by Tayyab for Skillzhub.
