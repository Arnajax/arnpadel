// Klik-test van het boeken (tests/e2e). Draait tegen een lokale productie-build
// (eerst `npm run build`) met een nep-VPS: de echte boekings-API wordt nooit aangeroepen.
import { defineConfig } from "@playwright/test";
import { NEP_VPS } from "./tests/e2e/nep-data.mjs";

const PORT = 3123;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    // Een service worker kan verzoeken langs page.route sturen; dan zou het nep-antwoord niet gelden.
    serviceWorkers: "block",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: {
      PHH_VPS_URL: NEP_VPS,
      NODE_OPTIONS: "--import ./tests/e2e/nep-vps.mjs",
    },
  },
});
