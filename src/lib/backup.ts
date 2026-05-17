import "server-only";
import { prisma } from "./prisma";
import { log } from "./log";

// Lazy load de Node built-ins via require pra evitar webpack tentar bundlear
function nodeMod<T = any>(name: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const req = eval("require") as NodeRequire;
  return req(name);
}

type CP = typeof import("child_process");
type FS = typeof import("fs");
type PATH = typeof import("path");
type UTIL = typeof import("util");

// Caminhos comuns onde o rclone pode ter sido instalado (WinGet, Chocolatey, Scoop, etc.)
function caminhosCandidatos(): string[] {
  const path = nodeMod<PATH>("path");
  const env = process.env;
  const cands: string[] = ["rclone", "rclone.exe"]; // primeiro tenta no PATH

  const localApp = env.LOCALAPPDATA;
  const programFiles = env["ProgramFiles"];
  const programFiles86 = env["ProgramFiles(x86)"];
  const home = env.USERPROFILE || env.HOME;

  if (localApp) {
    // WinGet: pastas terminadas em \rclone-vXXX-windows-amd64\rclone.exe
    cands.push(path.join(localApp, "Microsoft", "WinGet", "Links", "rclone.exe"));
    // Padrão do winget para o pacote:
    const wingetBase = path.join(localApp, "Microsoft", "WinGet", "Packages");
    try {
      const fs = nodeMod<FS>("fs");
      if (fs.existsSync(wingetBase)) {
        for (const dir of fs.readdirSync(wingetBase)) {
          if (!dir.toLowerCase().includes("rclone")) continue;
          const pkgDir = path.join(wingetBase, dir);
          for (const sub of fs.readdirSync(pkgDir)) {
            const rcloneExe = path.join(pkgDir, sub, "rclone.exe");
            if (fs.existsSync(rcloneExe)) cands.push(rcloneExe);
          }
        }
      }
    } catch {}
  }
  if (programFiles) cands.push(path.join(programFiles, "Rclone", "rclone.exe"));
  if (programFiles86) cands.push(path.join(programFiles86, "Rclone", "rclone.exe"));
  if (home) cands.push(path.join(home, "scoop", "apps", "rclone", "current", "rclone.exe"));

  // Linux/macOS comuns
  cands.push("/usr/bin/rclone", "/usr/local/bin/rclone", "/opt/homebrew/bin/rclone");

  return cands;
}

async function detectarRclone(): Promise<string | null> {
  const cfg = await prisma.configuracao.findFirst();
  if (cfg?.rcloneCaminho) {
    const ok = await testarBin(cfg.rcloneCaminho);
    if (ok) return cfg.rcloneCaminho;
  }
  for (const c of caminhosCandidatos()) {
    const ok = await testarBin(c);
    if (ok) return c;
  }
  return null;
}

function testarBin(bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cp = nodeMod<CP>("child_process");
    const child = cp.spawn(bin, ["version"], { shell: false, windowsHide: true });
    let resolvido = false;
    const fim = (ok: boolean) => { if (!resolvido) { resolvido = true; resolve(ok); } };
    child.on("error", () => fim(false));
    child.on("exit", (code) => fim(code === 0));
    setTimeout(() => { child.kill(); fim(false); }, 5000);
  });
}

function execBin(bin: string, args: string[], timeoutMs = 300_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const cp = nodeMod<CP>("child_process");
    const child = cp.spawn(bin, args, { shell: false, windowsHide: true });
    let stdout = ""; let stderr = "";
    child.stdout?.on("data", (d) => stdout += d.toString());
    child.stderr?.on("data", (d) => stderr += d.toString());
    const timeout = setTimeout(() => { child.kill(); reject(new Error("timeout")); }, timeoutMs);
    child.on("error", (e) => { clearTimeout(timeout); reject(e); });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `exit code ${code}`));
    });
  });
}

export async function rcloneInstalado(): Promise<boolean> {
  return (await detectarRclone()) !== null;
}

export async function caminhoRcloneDetectado(): Promise<string | null> {
  return detectarRclone();
}

export async function listarRemotes(): Promise<string[]> {
  const bin = await detectarRclone();
  if (!bin) return [];
  try {
    const { stdout } = await execBin(bin, ["listremotes"], 10_000);
    return stdout.trim().split(/\r?\n/).filter(Boolean);
  } catch { return []; }
}

function caminhoDoBanco(): string {
  const fs = nodeMod<FS>("fs");
  const path = nodeMod<PATH>("path");
  const prod = "/app/data/data.db";
  if (fs.existsSync(prod)) return prod;
  return path.resolve("./data.db");
}

export async function executarBackup(): Promise<{
  ok: boolean; arquivo?: string; erro?: string;
}> {
  const cfg = await prisma.configuracao.findFirst();
  if (!cfg) return { ok: false, erro: "Configuração não inicializada" };
  if (!cfg.backupRemote) return { ok: false, erro: "Remote não configurado" };

  const bin = await detectarRclone();
  if (!bin) return { ok: false, erro: "rclone não encontrado. Veja instruções em Configurações." };

  const fs = nodeMod<FS>("fs");
  const dbPath = caminhoDoBanco();
  if (!fs.existsSync(dbPath)) return { ok: false, erro: `Banco não encontrado em ${dbPath}` };

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const arquivo = `data-${stamp}.db`;
  const destino = `${cfg.backupRemote}/${arquivo}`;

  try {
    await execBin(bin, [
      "copyto", dbPath, destino,
      "--retries", "2",
      "--low-level-retries", "3",
      "--timeout", "60s",
    ], 5 * 60_000);

    if (cfg.backupRetencaoDias > 0) {
      await execBin(bin, [
        "delete", cfg.backupRemote,
        "--min-age", `${cfg.backupRetencaoDias}d`,
      ], 60_000).catch(() => {});
    }

    await prisma.configuracao.update({
      where: { id: cfg.id },
      data: {
        backupUltimoEm: new Date(),
        backupUltimoStatus: "ok",
        backupUltimoArquivo: arquivo,
      },
    });

    log.info("backup.ok", { arquivo, remote: cfg.backupRemote, bin });
    return { ok: true, arquivo };
  } catch (e: any) {
    const erro = (e?.message ?? "erro desconhecido").slice(0, 250);
    await prisma.configuracao.update({
      where: { id: cfg.id },
      data: {
        backupUltimoEm: new Date(),
        backupUltimoStatus: "erro: " + erro,
      },
    });
    log.error("backup.failed", { erro });
    return { ok: false, erro };
  }
}

export async function tentarBackupAgendado() {
  const cfg = await prisma.configuracao.findFirst();
  if (!cfg?.backupHabilitado || !cfg.backupRemote) return;

  const agora = new Date();
  if (agora.getHours() < cfg.backupHorario) return;

  const ultimo = cfg.backupUltimoEm;
  if (ultimo) {
    const mesmoDia =
      ultimo.getFullYear() === agora.getFullYear() &&
      ultimo.getMonth() === agora.getMonth() &&
      ultimo.getDate() === agora.getDate();
    if (mesmoDia && cfg.backupUltimoStatus === "ok") return;
  }

  log.info("backup.scheduled.trigger");
  await executarBackup();
}
