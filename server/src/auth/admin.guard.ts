import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export const ADMIN_COOKIE = "ms_admin";

/**
 * Admin auth (eng review 3A): JWT lives in an httpOnly cookie — invisible
 * to page JavaScript, so XSS/rogue dependencies can't steal it. CSRF
 * defense-in-depth on top of SameSite=Lax: state-changing requests must
 * carry the custom `x-csrf: 1` header, which cross-site forms cannot set.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const token = (req.cookies as Record<string, string> | undefined)?.[ADMIN_COOKIE];
    if (!token) throw new UnauthorizedException("Not logged in");

    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; email: string }>(token);
      (req as Request & { admin?: { id: number; email: string } }).admin = {
        id: payload.sub,
        email: payload.email,
      };
    } catch {
      throw new UnauthorizedException("Session expired — log in again");
    }

    if (req.method !== "GET" && req.headers["x-csrf"] !== "1") {
      throw new ForbiddenException("Missing CSRF header");
    }

    return true;
  }
}
