/**
 * Matematica pură a vizualizării 360, separată de DOM ca să poată fi testată.
 * Cadrele sunt indexate 0..count-1 și formează un cerc complet.
 */

/** Modulo mereu pozitiv: -1 devine count-1. Acceptă și poziții fracționare. */
export function wrapFrame(position: number, count: number): number {
  if (count <= 0) return 0;
  return ((position % count) + count) % count;
}

/**
 * Poziția după un drag. O tragere pe toată lățimea viewer-ului = o rotație completă,
 * indiferent câte cadre are secvența — sensibilitatea se adaptează singură.
 * Tragerea spre dreapta rotește cutiuța spre dreapta (cadre crescătoare).
 */
export function positionFromDrag(
  startPosition: number,
  deltaPx: number,
  widthPx: number,
  count: number,
  turnsPerWidth = 1,
): number {
  if (widthPx <= 0 || count <= 0) return wrapFrame(startPosition, count);
  const framesPerPx = (count * turnsPerWidth) / widthPx;
  return wrapFrame(startPosition + deltaPx * framesPerPx, count);
}

/**
 * Cel mai apropiat cadru deja încărcat, căutând simetric în jurul celui cerut.
 * Cât timp secvența se încarcă, rotirea rămâne fluidă cu ce e disponibil.
 * Întoarce -1 dacă nimic nu e încărcat.
 */
export function nearestLoaded(index: number, loaded: ReadonlyArray<boolean>): number {
  const count = loaded.length;
  if (count === 0) return -1;
  const start = Math.round(wrapFrame(index, count)) % count;
  if (loaded[start]) return start;
  for (let offset = 1; offset <= Math.floor(count / 2); offset++) {
    const back = wrapFrame(start - offset, count);
    if (loaded[back]) return back;
    const fwd = wrapFrame(start + offset, count);
    if (loaded[fwd]) return fwd;
  }
  return -1;
}

/** Viteza (cadre/secundă) după frecare, independent de frame rate. */
export function decayVelocity(velocity: number, dtSeconds: number, friction = 0.035): number {
  const next = velocity * Math.pow(friction, dtSeconds);
  return Math.abs(next) < 0.6 ? 0 : next;
}

/** Easing pentru rotirea de prezentare: pornește și se oprește lin. */
export function easeInOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
