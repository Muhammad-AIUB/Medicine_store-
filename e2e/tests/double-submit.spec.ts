import { expect, test } from "@playwright/test";

/**
 * Test plan, Critical Paths #2: rapid double-click on "Place order" must
 * create exactly ONE order (checkout guards with a submitted ref + disabled
 * button; this proves it end-to-end).
 */
test("double-clicking Place order creates exactly one order", async ({ page, request }) => {
  await page.goto("/");
  await page.getByLabel("Search medicine").fill("Napa");
  await page.locator("li", { hasText: "Paracetamol" }).first().getByRole("button", { name: "Add" }).click();
  await page.getByRole("link", { name: /Cart \(1\)/ }).click();

  const phone = `019${Date.now().toString().slice(-8)}`;
  await page.getByLabel("Full name").fill("Double Click Tester");
  await page.getByLabel(/Mobile number/).fill(phone);
  await page.getByLabel("Delivery area").selectOption({ index: 1 });
  await page.getByLabel("Full address").fill("House 2, Road 2, Test Para");

  const button = page.getByRole("button", { name: /Place order/ });
  await button.dblclick(); // two clicks as fast as the browser can deliver them

  await page.waitForURL(/\/order\/\d+/);

  // Count orders for this unique phone via the admin API.
  const login = await request.post("http://localhost:3001/auth/login", {
    data: {
      email: process.env.ADMIN_EMAIL ?? "admin@medistore.local",
      password: process.env.ADMIN_PASSWORD ?? "change-me-admin",
    },
  });
  expect(login.ok()).toBe(true);
  const cookie = login.headers()["set-cookie"];
  const ordersRes = await request.get("http://localhost:3001/admin/orders", {
    headers: { cookie: cookie ?? "", "x-csrf": "1" },
  });
  const orders = (await ordersRes.json()) as { phone: string }[];
  expect(orders.filter((o) => o.phone === phone)).toHaveLength(1);
});
