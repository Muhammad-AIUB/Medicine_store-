import { expect, test, type Page } from "@playwright/test";

/**
 * Golden path (test plan, Critical Paths #1):
 * browse → search → add to cart → COD checkout → order number
 * → admin sees NEW → confirm → out for delivery → delivered.
 */

const ADMIN_URL = "http://localhost:3002";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@medistore.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-me-admin";

async function adminLogin(page: Page) {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${ADMIN_URL}/`);
}

test("customer orders Napa; operator walks it NEW → DELIVERED", async ({ page }) => {
  // --- storefront: search and add to cart ---
  await page.goto("/");
  await page.getByLabel("Search medicine").fill("Napa");
  const napaCard = page.locator("li", { hasText: "Paracetamol" }).first();
  await expect(napaCard).toBeVisible();
  await napaCard.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("link", { name: /Cart \(1\)/ })).toBeVisible();

  // --- checkout ---
  await page.getByRole("link", { name: /Cart \(1\)/ }).click();
  await page.getByLabel("Full name").fill("E2E Test Customer");
  const phone = `017${Date.now().toString().slice(-8)}`;
  await page.getByLabel(/Mobile number/).fill(phone);
  await page.getByLabel("Delivery area").selectOption({ index: 1 });
  await page.getByLabel("Full address").fill("House 12, Road 5, Test Para");
  await page.getByRole("button", { name: /Place order/ }).click();

  // --- confirmation ---
  await page.waitForURL(/\/order\/\d+/);
  await expect(page.getByText(/Order #\d+ received/)).toBeVisible();
  await expect(page.getByText(phone)).toBeVisible();
  const orderId = page.url().match(/\/order\/(\d+)/)?.[1];
  expect(orderId).toBeTruthy();

  // --- admin pipeline ---
  await adminLogin(page);
  const row = page.locator("tr", { hasText: phone });
  await expect(row).toBeVisible();
  await expect(row.getByText("NEW")).toBeVisible();

  await row.getByRole("button", { name: "Confirm" }).click();
  await expect(row.getByText("CONFIRMED", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: "Out for delivery" }).click();
  await expect(row.getByText("OUT FOR DELIVERY")).toBeVisible();

  await row.getByRole("button", { name: "Mark delivered" }).click();
  await expect(row.getByText("DELIVERED", { exact: true })).toBeVisible();
});

test("out-of-area style failures keep the cart intact (server rejects, message shown)", async ({ page }) => {
  // The area dropdown only offers served areas, so simulate the server-side
  // rejection path by killing the API mid-checkout: cart must be preserved.
  await page.goto("/");
  await page.getByLabel("Search medicine").fill("ORSaline");
  const card = page.locator("li", { hasText: "Oral" }).first();
  await card.getByRole("button", { name: "Add" }).click();
  await page.getByRole("link", { name: /Cart \(1\)/ }).click();

  await page.getByLabel("Full name").fill("E2E Failure Case");
  await page.getByLabel(/Mobile number/).fill("01700000001");
  await page.getByLabel("Delivery area").selectOption({ index: 1 });
  await page.getByLabel("Full address").fill("House 1, Road 1, Test Para");

  await page.route("**/orders", (route) => route.abort());
  await page.getByRole("button", { name: /Place order/ }).click();
  // Next.js injects its own role="alert" route announcer — match our message.
  await expect(page.getByText(/Can't reach the store/)).toBeVisible();

  // cart preserved — reload and the item is still there
  await page.unroute("**/orders");
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Cart \(1\)/ })).toBeVisible();
});

test("zero-result search shows the helpful empty state", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search medicine").fill("xyzzynotamedicine");
  await expect(page.getByText(/No products match/)).toBeVisible();
});
