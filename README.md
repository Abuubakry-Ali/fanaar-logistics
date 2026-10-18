# Fanaar Logistics

A responsive React website for sea cargo from Dar es Salaam to Zanzibar, Zanzibar to Dar es Salaam, and Zanzibar to Tanga. Built with Vite, React, Lucide icons, and locally hosted Manrope fonts and photography.

The website can run entirely on GitHub Pages. It needs no application server, database, or API keys. Trixa handles quote submission and shipment tracking on its own website.

## Run locally

Use Node.js 22, then run these commands from this folder:

```sh
npm ci
npm run dev
```

## Publish on GitHub Pages

1. Create a GitHub repository and put the **contents of this folder** at its root. Include `package.json`, `package-lock.json`, `src`, `public`, and the hidden `.github` folder. Do not upload `node_modules` or `dist`.
2. In the repository, open **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**. This is the publishing source required for the included workflow. See [GitHub's publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
3. Push the website files to the `main` branch. The included **Deploy to GitHub Pages** workflow installs dependencies with `npm ci`, builds the website, and publishes `dist`.
4. Open the repository's **Actions** tab and wait for **Deploy to GitHub Pages** to finish. Open the website URL shown in the deployment or in **Settings → Pages**.

Every later push to `main` rebuilds and publishes the website automatically. To publish again without changing a file, go to **Actions → Deploy to GitHub Pages → Run workflow** and select `main`.

The workflow reads the site's path from GitHub Pages and sets `VITE_BASE_PATH` automatically. This supports both a project URL such as `https://YOUR-USERNAME.github.io/fanaar-logistics/` and a site at the domain root. Keep the workflow at `.github/workflows/deploy-pages.yml` in the repository root. Its configure, upload, and deployment steps follow [GitHub's custom workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Add or change your phone and WhatsApp number

Open `src/config.js` and replace the empty strings with your business numbers:

```js
export const CONTACT = {
  phone: '+255 YOUR REAL PHONE NUMBER',
  whatsapp: '255YOURREALWHATSAPPNUMBER',
};
```

Replace the entire example text with your actual number. Use the international format, including country code. The WhatsApp value must contain **digits only**, with no `+`, spaces, or punctuation. The phone and WhatsApp numbers may be the same or different; leave either value as `''` if that contact method is unavailable.

The configured number appears directly in the top bar on desktop and mobile. The call and WhatsApp links also activate in the contact options. If only WhatsApp is configured, its number appears in the top bar. Until a number is added, the website shows **Number coming soon**.

Save the file, commit the change, and push it to `main`. GitHub Actions will publish the updated contact information. You can also edit `src/config.js` directly on GitHub and commit to `main`. These are public business contact numbers, so they are stored in the website's source rather than in GitHub Secrets.

## Quotes and tracking with Trixa

**Get a quote** opens the real Trixa quote page in a separate browser popup. Trixa handles the form and its submission; this React website does not collect or submit quote requests through its own backend. Route-specific buttons still lead to Trixa, where the customer confirms their shipment details.

Browser behavior varies: a phone browser may open a new tab instead of a popup, and the browser may show an address bar or other browser controls. These controls cannot be hidden by this website. If the popup is blocked, the quote link or tracking form falls back to opening Trixa in a normal new tab. Close the Trixa window or tab manually when finished to return to Fanaar; the website cannot detect successful submission or close the external page automatically.

The tracking box sends a normal GET request to `https://cargo.trixa.net/t/5d2e73922193/` with the `ref` parameter. It accepts a shipment reference or the shipment phone number and opens Trixa separately. Trixa blocks embedding in an iframe, so quotes and tracking use its external pages.

The configured Trixa account displays **Ruvuma Branch**. That branding is managed by Trixa. Trixa links are configured in `src/config.js`; update them if Trixa supplies different account URLs.

## Admin login shortcut

A discreet **Admin login** link at the very bottom of the footer opens `https://cargo.trixa.net/` in a separate tab. Trixa handles account sign-in; Fanaar does not collect admin credentials. Change `ADMIN_LOGIN_URL` in `src/config.js` if the admin destination changes.

## Build and preview

```sh
npm run build
npm run preview
```

For a manual build hosted in a subfolder, set `VITE_BASE_PATH` to that folder with leading and trailing slashes before building. For example, in PowerShell:

```powershell
$env:VITE_BASE_PATH = '/fanaar-logistics/'
npm run build
npm run preview
```

GitHub Pages sets this automatically through the included workflow. When hosting elsewhere, upload the contents of `dist` after building for the correct path.

## Photography and fonts

The photographs are illustrative, not a claim of vessel ownership.

- Cargo vessel: [CHUTTERSNAP / Unsplash](https://unsplash.com/photos/green-cargo-ship-on-body-of-water-5Rlrs3sKVJU).
- Zanzibar dhow: [Aron Marinelli / Unsplash](https://unsplash.com/photos/a-sailboat-with-people-on-it-in-the-ocean-U8Z9TthY8r4).
- [Manrope / Google Fonts](https://fonts.google.com/specimen/Manrope), SIL Open Font License.

The route map is schematic and not for navigation. Prices and shipping schedules are confirmed by the business.
