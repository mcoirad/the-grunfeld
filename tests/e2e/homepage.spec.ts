import { expect, test } from "@playwright/test";

async function waitForExplorer(page: import("@playwright/test").Page) {
  await expect(page.locator(".rankings-explorer")).toHaveAttribute(
    "data-hydrated",
    "true",
  );
}

async function waitForHeroImages(page: import("@playwright/test").Page) {
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>(".hero__portraits img")).every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
}

test("defaults to current BPM rankings and keeps ranks when filtering", async ({ page }) => {
  await page.goto("./");
  await waitForExplorer(page);
  await expect(page.getByRole("heading", { name: "Who’s building now" })).toBeVisible();
  await expect(page.getByText("30 of 30 executives shown")).toBeVisible();
  const firstCard = page.getByTestId("executive-card").first();
  await expect(firstCard).toContainText("Danny Ainge");
  await expect(firstCard).toContainText("01");

  await page.getByRole("searchbox", { name: "Find an executive" }).fill("Koby Altman");
  await expect(page.getByTestId("executive-card")).toHaveCount(1);
  await expect(page.getByTestId("executive-card")).toContainText("08");
  await expect(page).toHaveURL(/q=Koby\+Altman/);
});

test("switches population, metric, detail, team, and expanded report state", async ({ page }) => {
  await page.goto("./");
  await waitForExplorer(page);
  await page.getByRole("button", { name: "All-time" }).click();
  await expect(page.getByText("173 of 173 executives shown")).toBeVisible();
  await page.getByRole("button", { name: "VORP" }).click();
  await page.getByLabel("Team").selectOption("BOS");
  await expect(page.getByText(/executives shown · sorted by VORP/)).toBeVisible();
  await page.getByRole("button", { name: "Deep dive" }).click();
  await expect(page.getByText("The front office report").first()).toBeVisible();
  await expect(page).toHaveURL(/population=all/);
  await expect(page).toHaveURL(/metric=vorp/);
  await expect(page).toHaveURL(/detail=deep/);
  await expect(page).toHaveURL(/team=BOS/);
});

test("uses a designed initials fallback for missing portraits", async ({ page }) => {
  await page.goto("./?q=Mike+Gansey");
  await waitForExplorer(page);
  const card = page.getByTestId("executive-card");
  await expect(card).toHaveCount(1);
  await expect(card.getByLabel("Mike Gansey portrait unavailable")).toContainText("MG");
});

test("serves static assets from the GitHub Pages base path", async ({ page, request }) => {
  await page.goto("./");
  await waitForExplorer(page);
  const icon = await request.get("http://127.0.0.1:4321/the-grunfeld/favicon.svg");
  expect(icon.ok()).toBe(true);
  await expect(page.locator('img[src*="/the-grunfeld/images/executives/"]').first()).toBeVisible();
});

test("links ranking cards to profiles while carrying the selected metric", async ({ page }) => {
  await page.goto("./?population=all&metric=vorp&q=Daryl+Morey");
  await waitForExplorer(page);
  await page.getByRole("link", { name: "View profile" }).click();
  await expect(page).toHaveURL(/\/the-grunfeld\/executives\/moreyda99x\/?\?metric=vorp/);
  await expect(page.getByRole("heading", { name: "Daryl Morey", level: 1 })).toBeVisible();
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name} landing composition`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("./");
    await waitForExplorer(page);
    await waitForHeroImages(page);
    await page.locator(".hero").screenshot({
      path: test.info().outputPath(`${viewport.name}-hero.png`),
    });
    await expect(page.locator(".hero")).toHaveScreenshot(`${viewport.name}-hero.png`, {
      maxDiffPixelRatio: 0.04,
    });
  });
}
