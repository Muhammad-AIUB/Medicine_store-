import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { loginSchema, type LoginInput } from "@medistore/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { ADMIN_COOKIE, AdminGuard } from "./admin.guard";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 12 * 60 * 60 * 1000,
};

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, email } = await this.auth.login(body.email, body.password);
    res.cookie(ADMIN_COOKIE, token, COOKIE_OPTS);
    return { email };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_COOKIE, { ...COOKIE_OPTS, maxAge: 0 });
    return { ok: true };
  }

  @Get("me")
  @UseGuards(AdminGuard)
  me(@Req() req: Request & { admin?: { id: number; email: string } }) {
    return { email: req.admin?.email };
  }
}
