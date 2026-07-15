import { BadRequestException, NotFoundException, type ArgumentsHost } from "@nestjs/common";
import { z } from "zod";
import { AllExceptionsFilter } from "./all-exceptions.filter";
import { ZodValidationException } from "../zod-validation.exception";

function makeHost() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe("AllExceptionsFilter — one envelope for every error (5A)", () => {
  const filter = new AllExceptionsFilter();

  it("maps zod failures to 400 with field-level details", () => {
    const { host, res } = makeHost();
    const parse = z.object({ phone: z.string().regex(/^01[3-9]\d{8}$/, "bad phone") }).safeParse({ phone: "x" });
    filter.catch(new ZodValidationException(parse.success ? (undefined as never) : parse.error), host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: "Bad Request",
        message: "Validation failed",
        details: { phone: ["bad phone"] },
      }),
    );
  });

  it("maps HttpExceptions to the envelope", () => {
    const { host, res } = makeHost();
    filter.catch(new NotFoundException("Order 9 not found"), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Order 9 not found" }),
    );
  });

  it("joins array messages from HttpExceptions", () => {
    const { host, res } = makeHost();
    filter.catch(new BadRequestException(["a", "b"]), host);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "a; b" }));
  });

  it("hides unknown errors behind an opaque 500 (no internals leak)", () => {
    const { host, res } = makeHost();
    filter.catch(new Error("secret stack detail"), host);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as jest.Mock).mock.calls[0][0] as { message: string };
    expect(body.message).not.toContain("secret");
  });
});
