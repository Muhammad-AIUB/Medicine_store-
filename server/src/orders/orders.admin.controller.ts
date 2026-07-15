import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { updateStatusSchema, type UpdateStatusInput, type OrderStatus } from "@medistore/shared";
import { AdminGuard } from "../auth/admin.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { OrdersService } from "./orders.service";

@Controller("admin/orders")
@UseGuards(AdminGuard)
export class OrdersAdminController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query("status") status?: OrderStatus) {
    return this.orders.adminList(status);
  }

  @Patch(":id/status")
  transition(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: UpdateStatusInput,
  ) {
    return this.orders.transition(id, body.status);
  }
}
