import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProductsAdminController } from "./products.admin.controller";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, ProductsAdminController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
