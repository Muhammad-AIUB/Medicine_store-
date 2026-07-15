import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { JwtService } from "@nestjs/jwt";

function makeMocks(admin: { id: number; email: string; passwordHash: string } | null) {
  const prisma = { adminUser: { findUnique: jest.fn().mockResolvedValue(admin) } };
  const jwt = { signAsync: jest.fn().mockResolvedValue("signed.jwt.token") };
  return { service: new AuthService(prisma as unknown as PrismaService, jwt as unknown as JwtService), jwt };
}

describe("AuthService.login", () => {
  const hash = bcrypt.hashSync("correct-password", 4);

  it("returns a token for valid credentials", async () => {
    const { service } = makeMocks({ id: 1, email: "admin@x.com", passwordHash: hash });
    const result = await service.login("admin@x.com", "correct-password");
    expect(result).toEqual({ token: "signed.jwt.token", email: "admin@x.com" });
  });

  it("rejects wrong password", async () => {
    const { service } = makeMocks({ id: 1, email: "admin@x.com", passwordHash: hash });
    await expect(service.login("admin@x.com", "wrong")).rejects.toThrow(UnauthorizedException);
  });

  it("uses the SAME error for unknown email as wrong password (no account probing)", async () => {
    const { service: unknownEmail } = makeMocks(null);
    const { service: wrongPass } = makeMocks({ id: 1, email: "admin@x.com", passwordHash: hash });
    const e1 = await unknownEmail.login("nobody@x.com", "whatever").catch((e: Error) => e.message);
    const e2 = await wrongPass.login("admin@x.com", "wrong").catch((e: Error) => e.message);
    expect(e1).toBe(e2);
  });
});
