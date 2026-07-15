import { expect, test } from "@playwright/test";

const ADMIN_URL = "http://localhost:3002";

/** Test plan, Critical Paths #3: admin auth lifecycle. */

test("wrong password is rejected with a readable error", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Email").fill("admin@medistore.local");
  await page.getByLabel("Password").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Match the message text — Next's route announcer also carries role="alert".
  await expect(page.getByText(/Invalid email or password/)).toBeVisible();
});

test("visiting orders without a session redirects to login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto(`${ADMIN_URL}/`);
  await page.waitForURL(`${ADMIN_URL}/login`);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("login → protected page loads → logout → redirected back to login", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL ?? "admin@medistore.local");
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "change-me-admin");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${ADMIN_URL}/`);
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(`${ADMIN_URL}/login`);

  // cookie is gone — going back to / bounces to /login again
  await page.goto(`${ADMIN_URL}/`);
  await page.waitForURL(`${ADMIN_URL}/login`);
});
