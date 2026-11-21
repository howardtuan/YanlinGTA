// Static objects: their matrices are computed once instead of every frame (three.js recomposes the
// matrix of every object whose matrixAutoUpdate is on, each frame, moving or not). Lights are left
// alone (the night lamp lights move). Only for things that never move after this call: an object that is
// moved later needs obj.updateMatrix() after the move (or matrixAutoUpdate turned back on).
export function freezeStatic(root) {
  root.traverse(o => { if (o.isLight || !o.matrixAutoUpdate) return; o.updateMatrix(); o.matrixAutoUpdate = false; });
  root.updateMatrixWorld(true);
}
