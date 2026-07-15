import { Injectable, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ZodValidationException } from "../zod-validation.exception";

/**
 * Validates request bodies against a shared zod schema (eng review 4A —
 * the same schema also powers the client form, so rules cannot drift).
 * Usage: @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ZodValidationException(result.error);
    }
    return result.data;
  }
}
