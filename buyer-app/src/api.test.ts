import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCommitment, submitTx } from "./api";

/**
 * These three apps each keep their own copy of api.ts rather than
 * sharing one package — a deliberate convention, not an oversight — so
 * the standing risk is the copies drifting apart silently as each app
 * evolves. `get`/`post`'s thrown message is the likeliest place for that
 * to happen unnoticed, and also the costliest: it is load-bearing, not
 * cosmetic. coop-pwa's `getAllocationLedger` decides whether "no
 * allocation recorded yet" is a normal empty state or a genuine failure
 * by pattern-matching `err.message`, and every app's UI puts this string
 * in front of a user verbatim. Change the shape in one copy and that
 * check quietly reclassifies an expected state as an error.
 *
 * This file is itself duplicated verbatim across the three apps, which
 * is the point: if one copy's formatting is edited, that app's suite
 * fails on its own rather than the three silently disagreeing.
 */

/** A non-ok fetch response — only the three fields `get`/`post` touch. */
function notOk(status: number, body: string): Response {
  return { ok: false, status, text: () => Promise.resolve(body) } as Response;
}

describe("api non-ok error formatting", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get throws `path -> status: body`", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(notOk(404, '{"error":"commitment not found"}'));

    await expect(getCommitment("CABC")).rejects.toThrow(
      '/commitments/CABC -> 404: {"error":"commitment not found"}',
    );
  });

  it("post throws `path -> status: body`, the same shape as get", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(notOk(400, "tx_bad_seq"));

    await expect(submitTx("SIGNED_XDR")).rejects.toThrow("/transactions/submit -> 400: tx_bad_seq");
  });

  it("reports the encoded path, not the raw argument", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(notOk(500, "boom"));

    // Both the thrown message and the URL fetched use the encoded form,
    // so an operator reading the error sees the path actually requested.
    await expect(getCommitment("C/../x")).rejects.toThrow("/commitments/C%2F..%2Fx -> 500: boom");
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/commitments/C%2F..%2Fx");
  });

  it("includes an empty body as an empty tail rather than omitting the separator", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(notOk(502, ""));

    await expect(getCommitment("CABC")).rejects.toThrow("/commitments/CABC -> 502: ");
  });
});
