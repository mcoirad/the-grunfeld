import { expect, test } from "@playwright/test";

async function waitForProfile(page: import("@playwright/test").Page) {
  await expect(page.locator(".executive-profile")).toHaveAttribute("data-hydrated", "true");
}

test("renders the cumulative chart, comparisons, highlights, and complete transaction controls", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./executives/moreyda99x/?metric=vorp");
  await waitForProfile(page);

  await expect(page.getByRole("heading", { name: "Daryl Morey", level: 1 })).toBeVisible();
  await expect(page.getByTestId("tenure-chart")).toBeVisible();
  await expect(page.locator(".comparison-card")).toHaveCount(3);
  await expect(page.getByText("Biggest win", { exact: true })).toBeVisible();
  await expect(page.getByText("Biggest loss", { exact: true })).toBeVisible();
  await expect(page.locator(".timeline-event")).toHaveCount(30);
  await page.locator(".chart-point").first().focus();
  await expect(page.locator(".chart-tooltip")).toBeVisible();
  expect(requests.some((url) => url.includes("raw.githubusercontent.com"))).toBe(false);
});

test("synchronizes metric, filters, search, pagination, and shareable URL state", async ({ page }) => {
  await page.goto("./executives/moreyda99x/");
  await waitForProfile(page);

  await page.getByRole("button", { name: "VORP" }).click();
  await expect(page).toHaveURL(/metric=vorp/);
  await page.getByRole("button", { name: "Drafting", exact: true }).click();
  await expect(page).toHaveURL(/type=draft/);
  await page.getByRole("searchbox", { name: "Find a player or pick" }).fill("Tyrese Maxey");
  await expect(page).toHaveURL(/q=Tyrese\+Maxey/);
  await expect(page.getByTestId("timeline-event")).toHaveCount(1);

  await page.getByRole("searchbox", { name: "Find a player or pick" }).fill("");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByTestId("timeline-event")).toHaveCount(30);
  await page.getByRole("button", { name: "Show 30 more" }).click();
  await expect(page.getByTestId("timeline-event")).toHaveCount(60);
});

test("handles short histories and missing portraits", async ({ page }) => {
  await page.goto("./executives/newtomi01x/");
  await waitForProfile(page);
  await expect(page.getByTestId("timeline-event")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Show 30 more" })).toHaveCount(0);

  await page.goto("./executives/gansemi99x/");
  await waitForProfile(page);
  await expect(page.getByLabel("Mike Gansey portrait unavailable")).toContainText("MG");
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name} executive profile composition`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("./executives/moreyda99x/");
    await waitForProfile(page);
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll<HTMLImageElement>(".profile-hero img")).every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    await expect(page.locator(".profile-hero")).toHaveScreenshot(`${viewport.name}-profile-hero.png`, {
      maxDiffPixelRatio: 0.04,
    });
  });
}
