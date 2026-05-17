/**
 * Haptic feedback via Vibration API (Android) e via AudioContext "tap" no iOS.
 * iOS Safari não suporta navigator.vibrate; o som ínfimo dá um "tique" no taptic engine
 * em alguns devices, mas é silent fallback se não funcionar.
 */
export function haptic(tipo: "leve" | "sucesso" | "erro" = "leve") {
  if (typeof navigator === "undefined") return;
  if (navigator.vibrate) {
    const padroes = { leve: 10, sucesso: [10, 40, 10], erro: [30, 30, 30] };
    navigator.vibrate(padroes[tipo]);
  }
}
