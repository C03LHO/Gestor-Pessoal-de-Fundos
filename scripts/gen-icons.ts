import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const svg = readFileSync(resolve("public/icon.svg"));
const out = (n: string) => resolve(`public/${n}`);

const tarefas: { nome: string; size: number }[] = [
  { nome: "icon-192.png",       size: 192 },
  { nome: "icon-512.png",       size: 512 },
  { nome: "apple-touch-icon.png", size: 180 },
  { nome: "favicon.png",        size: 64 },
];

async function main() {
  for (const t of tarefas) {
    await sharp(svg).resize(t.size, t.size).png().toFile(out(t.nome));
    console.log("gerado:", t.nome);
  }
}
main();
