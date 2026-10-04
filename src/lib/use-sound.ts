import { useEffect, useState } from "react";
import { isSoundEnabled, subscribeSound } from "@/lib/sound";

/** Stare React sincronizată cu preferința globală de sunet. */
export function useSoundEnabled(): boolean {
  // Pornește pe `false` la SSR și la prima randare, apoi citește preferința —
  // altfel markup-ul serverului și al clientului ar diferi.
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isSoundEnabled());
    return subscribeSound(setOn);
  }, []);
  return on;
}
