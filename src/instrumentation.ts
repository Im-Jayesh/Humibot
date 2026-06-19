export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startInitiativeScheduler } = await import(
      "@/lib/initiative/runner"
    );
    startInitiativeScheduler();
  }
}
