import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { OrdersModule } from "./orders/orders.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { StoreConfigModule } from "./store-config/store-config.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Generous global ceiling; the public order endpoint carries a stricter
    // per-route @Throttle (eng review: anti-abuse on guest COD checkout).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StoreConfigModule,
    ProductsModule,
    OrdersModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
