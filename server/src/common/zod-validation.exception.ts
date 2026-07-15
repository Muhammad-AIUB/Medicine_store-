import { BadRequestException } from "@nestjs/common";
import type { ZodError } from "zod";

/** Carries zod field errors so the global filter can map them into the envelope's `details`. */
export class ZodValidationException extends BadRequestException {
  constructor(public readonly zodError: ZodError) {
    super("Validation failed");
  }

  fieldErrors(): Record<string, string[]> {
    const details: Record<string, string[]> = {};
    for (const issue of this.zodError.issues) {
      const path = issue.path.length ? issue.path.join(".") : "_";
      (details[path] ??= []).push(issue.message);
    }
    return details;
  }
}
