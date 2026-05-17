export async function register() {
  // Apenas no runtime nodejs (não no Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { iniciarScheduler } = await import("./lib/scheduler");
  iniciarScheduler();
}
