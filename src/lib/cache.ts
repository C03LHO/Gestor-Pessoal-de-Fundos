import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Cache em memória com persistência opcional em disco.
 * Pra Yahoo/Stooq isso sobrevive a reinício do servidor sem reaquecer.
 */

type Entry<T> = { data: T; expiraEm: number };

export class CacheLRU<T> {
  private map = new Map<string, Entry<T>>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private opts: {
      max: number;
      ttlMs: number;
      arquivo?: string;
      // Quanto tempo um item vencido continua guardado como reserva para
      // getStale() — útil quando a fonte externa cai. 0 = descarta ao vencer.
      staleMs?: number;
    },
  ) {
    if (opts.arquivo) this.carregarDoDisco();
  }

  private guardarAte(e: Entry<T>) {
    return e.expiraEm + (this.opts.staleMs ?? 0);
  }

  get(key: string): T | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expiraEm <= Date.now()) {
      if (this.guardarAte(e) <= Date.now()) this.map.delete(key);
      return null;
    }
    // toca: move pro fim (LRU)
    this.map.delete(key);
    this.map.set(key, e);
    return e.data;
  }

  /** Último valor conhecido, mesmo vencido (dentro de staleMs). */
  getStale(key: string): T | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (this.guardarAte(e) <= Date.now()) {
      this.map.delete(key);
      return null;
    }
    return e.data;
  }

  set(key: string, data: T) {
    this.map.set(key, { data, expiraEm: Date.now() + this.opts.ttlMs });
    if (this.map.size > this.opts.max) {
      const primeiro = this.map.keys().next().value;
      if (primeiro) this.map.delete(primeiro);
    }
    if (this.opts.arquivo) this.agendarPersistencia();
  }

  delete(key: string) { this.map.delete(key); }

  private agendarPersistencia() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.salvarNoDisco();
    }, 5_000); // debounce 5s
  }

  private salvarNoDisco() {
    if (!this.opts.arquivo) return;
    const arquivo = this.opts.arquivo;
    const tmp = arquivo + ".tmp";
    try {
      const dir = dirname(arquivo);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const payload = Array.from(this.map.entries())
        .filter(([, v]) => this.guardarAte(v) > Date.now())
        .slice(-this.opts.max);
      // Write atômico: escreve em .tmp, depois rename (POSIX garante atomicidade)
      writeFileSync(tmp, JSON.stringify(payload), "utf-8");
      renameSync(tmp, arquivo);
    } catch {
      // Falha silenciosa — cache é otimização. Limpa .tmp se sobrou.
      try { if (existsSync(tmp)) unlinkSync(tmp); } catch {}
    }
  }

  private carregarDoDisco() {
    if (!this.opts.arquivo || !existsSync(this.opts.arquivo)) return;
    try {
      const raw = readFileSync(this.opts.arquivo, "utf-8");
      const arr = JSON.parse(raw) as [string, Entry<T>][];
      for (const [k, v] of arr) {
        if (this.guardarAte(v) > Date.now()) this.map.set(k, v);
      }
    } catch { /* ignora arquivo corrompido */ }
  }
}
