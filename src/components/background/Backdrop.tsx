/**
 * Static layered backdrop: deep-space gradient, animated perspective grid,
 * ambient color glows and a faint vignette. Pure CSS, sits behind everything.
 */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="bd-gradient" />
      <div className="bd-grid" />
      <div className="bd-glow g1" />
      <div className="bd-glow g2" />
      <div className="bd-glow g3" />
      <div className="bd-vignette" />
    </div>
  );
}
