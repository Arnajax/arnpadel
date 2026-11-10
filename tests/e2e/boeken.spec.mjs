// Vaste test van de hoofdklik: een les boeken op telefoonbreedte, tot de bevestiging.
// Er gaat niets naar de echte boekings-API: de server krijgt nep-slots (nep-vps.mjs)
// en het boekverzoek uit de browser krijgt hier een vast nep-antwoord.
import { test, expect } from "@playwright/test";
import { NEP_SLOTS } from "./nep-data.mjs";

const slot = NEP_SLOTS[0];

test("een les boeken bij Arn komt tot de bevestiging", async ({ page }) => {
  const echteApi = [];
  await page.route("https://api.padelhubhoorn.nl/**", (route) => {
    echteApi.push(route.request().url());
    return route.abort();
  });

  const boekingen = [];
  await page.route("**/api/booking", (route) => {
    boekingen.push({ method: route.request().method(), body: route.request().postDataJSON() });
    return route.fulfill({
      json: { success: true, results: [{ slot_id: slot.id, ok: true, datum: slot.datum, tijd: slot.tijd }] },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Boek bij Arn/ }).click();
  await page.locator(".bk-cell--avail").first().click();
  await page.getByRole("button", { name: new RegExp(slot.tijd) }).click();
  await page.locator(".players-grid").getByRole("button", { name: "3", exact: true }).click();
  await page.getByLabel("Naam").fill("Test Speler");
  await page.getByLabel("Telefoon").fill("06 12 34 56 78");
  await page.getByRole("button", { name: "Bevestig boeking" }).click();

  await expect(page.getByText("Aanvraag verzonden!")).toBeVisible();
  await expect(page.locator(".success-card")).toContainText("Test Speler");

  expect(boekingen).toEqual([
    {
      method: "POST",
      body: { name: "Test Speler", phone: "+31612345678", players: 3, slotIds: [slot.id], trainerId: "arn" },
    },
  ]);
  expect(echteApi).toEqual([]);
});
