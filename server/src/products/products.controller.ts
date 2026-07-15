import { Controller, Get, Query } from "@nestjs/common";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query("q") q?: string, @Query("category") category?: string) {
    return this.products.publicList(q, category);
  }

  @Get("categories")
  categories() {
    return this.products.publicCategories();
  }
}
