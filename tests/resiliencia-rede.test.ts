import { afterEach, describe, expect, it, vi } from "vitest";
import { CacheLRU } from "../src/lib/cache";
import { fetchTimeout, HostIndisponivelError } from "../src/lib/mercado/fetch-timeout";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CacheLRU.getStale", () => {
  it("mantém o item vencido como reserva dentro de staleMs", () => {
    vi.useFakeTimers();
    const c = new CacheLRU<number>({ max: 10, ttlMs: 1000, staleMs: 5000 });
    c.set("a", 1);
    vi.advanceTimersByTime(2000);
    expect(c.get("a")).toBeNull();
    expect(c.getStale("a")).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(c.getStale("a")).toBeNull();
  });

  it("sem staleMs descarta ao vencer", () => {
    vi.useFakeTimers();
    const c = new CacheLRU<number>({ max: 10, ttlMs: 1000 });
    c.set("a", 1);
    vi.advanceTimersByTime(1500);
    expect(c.get("a")).toBeNull();
    expect(c.getStale("a")).toBeNull();
  });
});

describe("fetchTimeout — disjuntor por host", () => {
  it("após falha de rede, falha na hora sem chamar o fetch de novo", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTimeout("https://fora.example/a")).rejects.toThrow("fetch failed");
    await expect(fetchTimeout("https://fora.example/b")).rejects.toBeInstanceOf(HostIndisponivelError);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Outro host não é afetado.
    fetchMock.mockResolvedValueOnce(new Response("ok"));
    await expect(fetchTimeout("https://outro.example/")).resolves.toBeInstanceOf(Response);
  });

  it("volta a tentar depois da pausa", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTimeout("https://volta.example/")).rejects.toThrow();
    vi.advanceTimersByTime(61_000);
    fetchMock.mockResolvedValueOnce(new Response("ok"));
    await expect(fetchTimeout("https://volta.example/")).resolves.toBeInstanceOf(Response);
  });
});
