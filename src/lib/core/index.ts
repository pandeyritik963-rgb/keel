// Deterministic finance core for Keel. Framework-free and network-free: every function here
// is pure and unit-tested. The signal engine, plan math, and backtest live here; the UI and
// the LLM narration layer read these results — they never compute them.
export * from "./types";
export * from "./signal";
export * from "./plan";
export * from "./backtest";
export * from "./schedule";
