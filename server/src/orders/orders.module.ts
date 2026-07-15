import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StoreConfigModule } from "../store-config/store-config.module";
import { OrdersAdminController } from "./orders.admin.controller";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [AuthModule, StoreConfigModule],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService],
})
export class OrdersModule {}
