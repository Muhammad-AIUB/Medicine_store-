import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ token: string; email: string }> {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    // Same error for unknown email and wrong password — no account probing.
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const token = await this.jwt.signAsync({ sub: admin.id, email: admin.email });
    return { token, email: admin.email };
  }
}
