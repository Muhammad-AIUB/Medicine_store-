import { afterEach, describe, expect, it, vi } from "vitest";
import { adminApi, ApiRequestError } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("admin API client", () => {
  it("sends credentials and the x-csrf header on every request (3A)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    await adminApi.orders();
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.credentials).toBe("include");
    expect((init?.headers as Record<string, string>)["x-csrf"]).toBe("1");
  });

  it("marks 401 responses as auth errors so pages can redirect to /login", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 401, error: "Unauthorized", message: "Not logged in" }), {
        status: 401,
      }),
    );
    const err = await adminApi.orders().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).isAuthError).toBe(true);
  });

  it("surfaces the server's envelope message on failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 409, error: "Conflict", message: "Insufficient stock for \"Napa\"" }),
        { status: 409 },
      ),
    );
    await expect(adminApi.setOrderStatus(1, "CONFIRMED")).rejects.toThrow(/Insufficient stock/);
  });

  it("maps network failures to a readable message", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(adminApi.orders()).rejects.toThrow(/Can't reach the API/);
  });
});
