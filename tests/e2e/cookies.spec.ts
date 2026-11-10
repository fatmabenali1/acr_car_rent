import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prisma, truncateE2EData } from "./helpers/db.mjs";

const apiConsentUrl = "http://localhost:4100/api/v1/cookie-consent";

test.beforeEach(async ({ isMobile }) => {
  test.skip(isMobile, "Cookie contract and accessibility checks run in desktop Chromium.");
  await truncateE2EData();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("first visit has an accessible bottom banner and no consent cookie or local storage before choice", async ({ page, context }) => {
  const consentReads = [];
  page.on("request", (request) => {
    if (request.url().startsWith(apiConsentUrl) && request.method() === "GET") consentReads.push(request);
  });
  await page.goto("/");

  const banner = page.getByRole("dialog", { name: "Cookie notice" });
  await expect(banner).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept all" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refuse all" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Customize" })).toBeVisible();
  expect(consentReads.length).toBeGreaterThan(0);
  expect(await context.cookies("http://localhost:4100")).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);

  const bannerBox = await banner.boundingBox();
  const primaryLink = page.getByRole("link", { name: "Request a quote" }).first();
  const primaryBox = await primaryLink.boundingBox();
  expect(bannerBox).not.toBeNull();
  expect(primaryBox).not.toBeNull();
  expect(bannerBox.y + bannerBox.height).toBeGreaterThan(0);
  const overlaps = bannerBox.x < primaryBox.x + primaryBox.width
    && bannerBox.x + bannerBox.width > primaryBox.x
    && bannerBox.y < primaryBox.y + primaryBox.height
    && bannerBox.y + bannerBox.height > primaryBox.y;
  expect(overlaps).toBe(false);

  const results = await new AxeBuilder({ page }).include(".cookie-banner").analyze();
  expect(results.violations).toEqual([]);
});

for (const choice of ["Accept", "Refuse"] as const) {
  test(`${choice} persists the HttpOnly consent across reload, pages, and a reopened context`, async ({ page, context, browser }) => {
    const getResponse = page.waitForResponse((response) =>
      response.url().startsWith(apiConsentUrl) && response.request().method() === "GET");
    await page.goto("/");
    await getResponse;

    const putResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(apiConsentUrl) && response.request().method() === "PUT");
    const putRequestPromise = page.waitForRequest((request) =>
      request.url().startsWith(apiConsentUrl) && request.method() === "PUT");
    await page.getByRole("button", { name: choice === "Accept" ? "Accept all" : "Refuse all" }).click();
    const [putResponse, putRequest] = await Promise.all([putResponsePromise, putRequestPromise]);
    expect(putResponse.status()).toBe(200);
    expect(putResponse.headers()["access-control-allow-origin"]).toBe("http://localhost:5183");
    expect(putResponse.headers()["access-control-allow-credentials"]).toBe("true");
    const putHeaders = await putRequest.allHeaders();
    expect(putHeaders.origin).toBe("http://localhost:5183");
    expect(putHeaders.cookie).toBeUndefined();
    expect((await putResponse.json()).data.choice).toBe(choice === "Accept" ? "accepted" : "refused");
    await expect(page.getByRole("dialog", { name: "Cookie notice" })).toHaveCount(0);

    const cookies = await context.cookies("http://localhost:4100");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: "acr_cookie_consent",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
    });
    expect(cookies[0].expires).toBeGreaterThan(Date.now() / 1000 + 364 * 86_400);
    expect(await prisma.cookieConsent.count()).toBe(1);

    const consentReadWithCookie = page.waitForRequest((request) =>
      request.url().startsWith(apiConsentUrl) && request.method() === "GET");
    await page.reload();
    expect((await (await consentReadWithCookie).allHeaders()).cookie).toContain("acr_cookie_consent=");
    await expect(page.getByRole("dialog", { name: "Cookie notice" })).toHaveCount(0);
    await page.goto("/booking");
    await expect(page.getByRole("dialog", { name: "Cookie notice" })).toHaveCount(0);
    expect(await context.cookies("http://localhost:4100")).toHaveLength(1);

    const savedState = await context.storageState();
    const reopened = await browser.newContext({ storageState: savedState });
    try {
      const reopenedPage = await reopened.newPage();
      await reopenedPage.goto("/fleet");
      await expect(reopenedPage.getByRole("dialog", { name: "Cookie notice" })).toHaveCount(0);
      expect((await reopened.cookies("http://localhost:4100"))[0]).toMatchObject({
        name: "acr_cookie_consent",
        httpOnly: true,
      });
    } finally {
      await reopened.close();
    }

    await context.clearCookies({ name: "acr_cookie_consent" });
    await page.goto("/");
    await expect(page.getByRole("dialog", { name: "Cookie notice" })).toBeVisible();
  });
}

test("Customize opens the necessary-only panel, traps focus, and returns focus on Escape", async ({ page }) => {
  await page.goto("/");
  const customize = page.getByRole("button", { name: "Customize" });
  await customize.click();
  const dialog = page.getByRole("dialog", { name: "Cookie settings" });
  const necessary = dialog.getByRole("checkbox", { name: /Strictly necessary/ });
  await expect(necessary).toBeChecked();
  await expect(necessary).toBeDisabled();
  await expect(dialog.getByRole("checkbox")).toHaveCount(1);
  const accept = dialog.getByRole("button", { name: "Accept all" });
  const refuse = dialog.getByRole("button", { name: "Refuse all" });
  const save = dialog.getByRole("button", { name: "Save my choices" });
  await expect(accept).toBeVisible();
  await expect(refuse).toBeVisible();
  await expect(save).toBeVisible();
  await expect(accept).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(refuse).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(save).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(accept).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(save).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Cookie notice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Customize" })).toBeFocused();
});

test("a consent API 500 closes for this session and retries on the next page load", async ({ page, context }) => {
  let getAttempts = 0;
  let putAttempts = 0;
  await page.route(`${apiConsentUrl}**`, async (route) => {
    if (route.request().method() === "GET") getAttempts += 1;
    if (route.request().method() === "PUT" && ++putAttempts === 1) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "internal_error" }) });
      return;
    }
    await route.continue();
  });
  await page.goto("/");
  const banner = page.getByRole("dialog", { name: "Cookie notice" });
  await expect(banner).toBeVisible();
  await page.getByRole("button", { name: "Accept all" }).click();
  await expect(page.getByRole("alert")).toContainText("No preferences were changed");
  await expect(page.getByRole("heading", { name: /athens car rental/i })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await context.cookies("http://localhost:4100")).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);

  const readsBeforeReload = getAttempts;
  const retryRead = page.waitForResponse((response) =>
    response.url().startsWith(apiConsentUrl) && response.request().method() === "GET");
  await page.reload();
  await retryRead;
  await expect.poll(() => getAttempts).toBeGreaterThan(readsBeforeReload);
  await expect(page.getByRole("dialog", { name: "Cookie notice" })).toBeVisible();
  const retryResponse = page.waitForResponse((response) =>
    response.url().startsWith(apiConsentUrl) && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Accept all" }).click();
  expect((await retryResponse).status()).toBe(200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await context.cookies("http://localhost:4100")).map((cookie) => cookie.name)).toEqual(["acr_cookie_consent"]);
});

test("the footer offers a way to change the consent choice later", async ({ page }) => {
  await page.goto("/");
  const refusedResponse = page.waitForResponse((response) =>
    response.url().startsWith(apiConsentUrl) && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Refuse all" }).click();
  expect((await refusedResponse).status()).toBe(200);
  await expect(page.getByRole("dialog", { name: "Cookie notice" })).toHaveCount(0);
  const settingsLink = page.getByRole("link", { name: "Cookie settings" });
  await expect(settingsLink).toBeVisible();
  await settingsLink.click();
  const settings = page.getByRole("dialog", { name: "Cookie settings" });
  await expect(settings).toContainText("Current choice: refused");
  const savedResponse = page.waitForResponse((response) =>
    response.url().startsWith(apiConsentUrl) && response.request().method() === "PUT");
  await settings.getByRole("button", { name: "Save my choices" }).click();
  expect((await savedResponse).status()).toBe(200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await settingsLink.click();
  await expect(page.getByRole("dialog", { name: "Cookie settings" })).toContainText("Current choice: customized");
});
