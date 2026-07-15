import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { AdminGuard, ADMIN_COOKIE } from "./admin.guard";
import type { JwtService } from "@nestjs/jwt";

function makeContext(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeGuard(verifyImpl?: () => Promise<{ sub: number; email: string }>) {
  const jwt = {
    verifyAsync: jest.fn(verifyImpl ?? (() => Promise.resolve({ sub: 1, email: "admin@x.com" }))),
  };
  return { guard: new AdminGuard(jwt as unknown as JwtService), jwt };
}

describe("AdminGuard", () => {
  it("rejects requests with no session cookie", async () => {
    const { guard } = makeGuard();
    const ctx = makeContext({ cookies: {}, method: "GET", headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects expired/invalid tokens with a re-login message", async () => {
    const { guard } = makeGuard(() => Promise.reject(new Error("expired")));
    const ctx = makeContext({ cookies: { [ADMIN_COOKIE]: "stale" }, method: "GET", headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(/log in again/);
  });

  it("allows GET with a valid cookie and attaches admin identity", async () => {
    const { guard } = makeGuard();
    const req: Record<string, unknown> = { cookies: { [ADMIN_COOKIE]: "good" }, method: "GET", headers: {} };
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.admin).toEqual({ id: 1, email: "admin@x.com" });
  });

  it("rejects state-changing requests without the x-csrf header", async () => {
    const { guard } = makeGuard();
    const ctx = makeContext({ cookies: { [ADMIN_COOKIE]: "good" }, method: "PATCH", headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("allows state-changing requests carrying x-csrf: 1", async () => {
    const { guard } = makeGuard();
    const ctx = makeContext({ cookies: { [ADMIN_COOKIE]: "good" }, method: "POST", headers: { "x-csrf": "1" } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
