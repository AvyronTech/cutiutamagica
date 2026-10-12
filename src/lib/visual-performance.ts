export type VisualEffectsTier = "minimal" | "balanced" | "full";

type DeviceSignals = {
  reducedMotion?: boolean;
  saveData?: boolean;
  effectiveType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  compactTouch?: boolean;
};

export function visualEffectsTier(signals: DeviceSignals): VisualEffectsTier {
  if (
    signals.reducedMotion ||
    signals.saveData ||
    /^(slow-2g|2g)$/.test(signals.effectiveType ?? "") ||
    (signals.deviceMemory != null && signals.deviceMemory <= 2)
  )
    return "minimal";
  if (
    (signals.deviceMemory != null && signals.deviceMemory <= 4) ||
    (signals.hardwareConcurrency != null && signals.hardwareConcurrency <= 4) ||
    (signals.compactTouch &&
      !(
        signals.deviceMemory != null &&
        signals.deviceMemory > 4 &&
        signals.hardwareConcurrency != null &&
        signals.hardwareConcurrency > 4
      ))
  )
    return "balanced";
  return "full";
}

export function currentVisualEffectsTier(): VisualEffectsTier {
  if (typeof window === "undefined") return "full";
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return visualEffectsTier({
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    deviceMemory: memory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    compactTouch: matchMedia("(max-width: 767px) and (pointer: coarse)").matches,
  });
}
