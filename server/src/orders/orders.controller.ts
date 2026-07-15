import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { createOrderSchema, type CreateOrderInput } from "@medistore/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Guest checkout — strictly throttled (anti-abuse, eng review). */
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  create(@Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput) {
    return this.orders.create(body);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.orders.publicGet(id);
  }
}
