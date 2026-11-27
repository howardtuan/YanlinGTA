// Shrink-to-fit font size for canvas signs.
//
// shrinkFont(g, text, maxW, p0, minP, font, step) returns the same size as the loop the sign painters used to run:
//   let p = p0; g.font = font(p);
//   while (g.measureText(text).width > maxW && p > minP) { p -= step; g.font = font(p); }
// and leaves g.font = font(p) like it. The loop sets g.font (a CSS font parse) and measures once per step, tens of
// times for a long shop name; this tries the size the width at p0 predicts, its neighbour, and bisects the rest, so
// a sign takes 2-4 measurements. Text width grows with the font size, so the first size that fits is the same.
// The sizes are made by the same repeated subtraction as the loop, so float sizes (Hh * 0.2 - 2 - 2 ...) give the
// same font strings.
export function shrinkFont(g, text, maxW, p0, minP, font, step = 2) {
  g.font = font(p0);
  const w0 = g.measureText(text).width;
  if (!(w0 > maxW && p0 > minP)) return p0;
  const ps = [p0];
  for (let p = p0; p > minP;) {
    p -= step;
    ps.push(p);
  }
  const last = ps.length - 1; // the loop stops here whatever the width
  let set = 0; // index of the size g.font holds
  const fits = (k) => {
    if (k >= last) return true;
    g.font = font(ps[k]);
    set = k;
    return !(g.measureText(text).width > maxW);
  };
  let lo = 1,
    hi = last; // answer in [lo, hi], fits(hi)
  const guess = Math.min(last, Math.max(1, Math.ceil((p0 - (p0 * maxW) / w0) / step)));
  if (fits(guess)) {
    hi = guess;
    if (guess - 1 >= lo && !fits(guess - 1)) lo = guess;
  } else {
    lo = guess + 1;
    if (lo < hi && fits(lo)) hi = lo;
  }
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (fits(mid)) hi = mid;
    else lo = mid + 1;
  }
  if (set !== hi) g.font = font(ps[hi]);
  return ps[hi];
}
