import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { productUpsertSchema, type ProductUpsertInput } from "@medistore/shared";
import { AdminGuard } from "../auth/admin.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ProductsService } from "./products.service";

const stockSchema = z.object({ stockQty: z.number().int().min(0).max(100_000) });

@Controller("admin/products")
@UseGuards(AdminGuard)
export class ProductsAdminController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.adminList();
  }

  @Post()
  create(@Body(new ZodValidationPipe(productUpsertSchema)) body: ProductUpsertInput) {
    return this.products.create(body);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(productUpsertSchema)) body: ProductUpsertInput,
  ) {
    return this.products.update(id, body);
  }

  @Patch(":id/stock")
  adjustStock(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(stockSchema)) body: { stockQty: number },
  ) {
    return this.products.adjustStock(id, body.stockQty);
  }

  @Delete(":id")
  deactivate(@Param("id", ParseIntPipe) id: number) {
    return this.products.deactivate(id);
  }
}
