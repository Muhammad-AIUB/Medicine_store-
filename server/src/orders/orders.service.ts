import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { canTransition, type CreateOrderInput, type OrderDto, type OrderStatus } from "@medistore/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StoreConfigService } from "../store-config/store-config.service";
import type { Order, OrderItem } from "../generated/prisma/client";

/*
 * ORDER STATE MACHINE (all transitions atomic + precondition-guarded, 7A)
 *
 *   NEW ──confirm──▶ CONFIRMED ──▶ OUT_FOR_DELIVERY ──▶ DELIVERED
 *    │                   │                │
 *    └──reject───▶ CANCELLED ◀────────────┘ (refused at door)
 *        (no restock)     (restock — stock was decremented at CONFIRMED)
 *
 * Stock ledger rules:
 *   - NEW→CONFIRMED        decrements stock (atomic: WHERE stockQty >= qty)
 *   - CANCELLED from NEW   restores NOTHING (never decremented)
 *   - CANCELLED from CONFIRMED / OUT_FOR_DELIVERY restores each item
 *   - every write is updateMany with its precondition in WHERE;
 *     0 rows affected = precondition lost = clean error, transaction rolls back.
 */

type OrderWithItems = Order & { items: OrderItem[] };

function toOrderDto(o: OrderWithItems): OrderDto {
  return {
    id: o.id,
    customerName: o.customerName,
    phone: o.phone,
    deliveryArea: o.deliveryArea,
    address: o.address,
    status: o.status as OrderStatus,
    subtotalPaisa: o.subtotalPaisa,
    deliveryFeePaisa: o.deliveryFeePaisa,
    totalPaisa: o.totalPaisa,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      packUnit: i.packUnit,
      qty: i.qty,
      unitPricePaisa: i.unitPricePaisa,
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeConfig: StoreConfigService,
  ) {}

  /**
   * Public guest checkout. Prices always come from the database, never from
   * the client. No stock decrement here — that happens at CONFIRMED, after
   * the operator's phone call (the human spam filter).
   */
  async create(input: CreateOrderInput): Promise<OrderDto> {
    if (!this.storeConfig.servedAreas.includes(input.deliveryArea)) {
      throw new BadRequestException(
        `We don't deliver to "${input.deliveryArea}" yet. Served areas: ${this.storeConfig.servedAreas.join(", ")}`,
      );
    }

    const ids = [...new Set(input.items.map((i) => i.productId))];
    if (ids.length !== input.items.length) {
      throw new BadRequestException("Duplicate items in cart — combine quantities");
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, isPrescriptionRequired: false },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const item of input.items) {
      const p = byId.get(item.productId);
      if (!p) throw new BadRequestException(`Product ${item.productId} is not available`);
      if (p.stockQty < item.qty) {
        throw new BadRequestException(`"${p.name}" has only ${p.stockQty} in stock`);
      }
    }

    const subtotalPaisa = input.items.reduce(
      (sum, item) => sum + byId.get(item.productId)!.pricePaisa * item.qty,
      0,
    );
    const deliveryFeePaisa = this.storeConfig.deliveryFeePaisa;

    const order = await this.prisma.order.create({
      data: {
        customerName: input.customerName,
        phone: input.phone,
        deliveryArea: input.deliveryArea,
        address: input.address,
        subtotalPaisa,
        deliveryFeePaisa,
        totalPaisa: subtotalPaisa + deliveryFeePaisa,
        items: {
          create: input.items.map((item) => {
            const p = byId.get(item.productId)!;
            return {
              productId: p.id,
              productName: `${p.name}${p.strength ? ` ${p.strength}` : ""}`,
              packUnit: p.packUnit,
              qty: item.qty,
              unitPricePaisa: p.pricePaisa,
            };
          }),
        },
      },
      include: { items: true },
    });

    return toOrderDto(order);
  }

  async publicGet(id: number): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return toOrderDto(order);
  }

  /* ---------------- admin ---------------- */

  async adminList(status?: OrderStatus): Promise<OrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: status ? { status } : {},
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return orders.map(toOrderDto);
  }

  /**
   * Atomic, guarded transition (eng review 7A). Every UPDATE carries its
   * precondition in WHERE; zero rows affected means another request got
   * there first (double-click, second tab) and the transaction rolls back
   * with a clean error instead of overselling or double-transitioning.
   */
  async transition(id: number, to: OrderStatus): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const from = order.status as OrderStatus;
    if (!canTransition(from, to)) {
      throw new ConflictException(`Cannot move order #${id} from ${from} to ${to}`);
    }

    await this.prisma.$transaction(async (tx) => {
      if (to === "CONFIRMED") {
        for (const item of order.items) {
          const res = await tx.product.updateMany({
            where: { id: item.productId, stockQty: { gte: item.qty } },
            data: { stockQty: { decrement: item.qty } },
          });
          if (res.count === 0) {
            throw new ConflictException(
              `Insufficient stock for "${item.productName}" — order stays NEW. Adjust stock or cancel.`,
            );
          }
        }
      }

      // Restock only when stock had actually been decremented (i.e. the
      // order made it past CONFIRMED). Cancelling a NEW order restores
      // nothing — it never took stock (design doc stock rule).
      if (to === "CANCELLED" && (from === "CONFIRMED" || from === "OUT_FOR_DELIVERY")) {
        for (const item of order.items) {
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stockQty: { increment: item.qty } },
          });
        }
      }

      const res = await tx.order.updateMany({
        where: { id, status: from },
        data: { status: to },
      });
      if (res.count === 0) {
        throw new ConflictException(`Order #${id} was changed by another request — reload and retry`);
      }
    });

    return this.publicGet(id);
  }
}
