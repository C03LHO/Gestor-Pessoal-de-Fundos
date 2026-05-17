import webpush from "web-push";
import { prisma } from "./prisma";
import { log } from "./log";

let configurado = false;

/**
 * Garante que existem VAPID keys salvas em Configuracao e que o web-push
 * está pronto para enviar. Gera novo par na primeira execução.
 */
export async function garantirVapid() {
  const cfg = await prisma.configuracao.findFirst();
  if (!cfg) throw new Error("Configuracao não inicializada");

  let pub = cfg.vapidPublicKey;
  let priv = cfg.vapidPrivateKey;

  if (!pub || !priv) {
    const par = webpush.generateVAPIDKeys();
    pub = par.publicKey;
    priv = par.privateKey;
    await prisma.configuracao.update({
      where: { id: cfg.id },
      data: { vapidPublicKey: pub, vapidPrivateKey: priv },
    });
    log.info("vapid.generated");
  }

  if (!configurado) {
    webpush.setVapidDetails("mailto:fundos@local", pub, priv);
    configurado = true;
  }
  return { vapidPublicKey: pub };
}

export type Payload = {
  titulo: string;
  corpo: string;
  url?: string;
  tag?: string;
};

export async function enviarParaTodos(payload: Payload) {
  await garantirVapid();
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return { enviados: 0 };

  let enviados = 0;
  let removidos = 0;

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      enviados++;
    } catch (e: any) {
      // 404/410 = subscription morta → remove
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        removidos++;
      } else {
        log.warn("push.send_failed", { erro: e?.message, statusCode: e?.statusCode });
      }
    }
  }));

  log.info("push.batch", { enviados, removidos, total: subs.length });
  return { enviados, removidos };
}
