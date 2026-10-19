export async function register() {
  // Solo en el runtime de Node del servidor (no en edge ni en el build).
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DISABLE_REAPER !== "true") {
    const { startReaper } = await import("@/lib/reaper");
    startReaper();
  }
}
