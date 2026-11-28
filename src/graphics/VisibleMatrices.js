// World matrices only for what can be drawn.
// three.js recomputes matrixWorld for every node of the scene each frame, hidden ones included. About two thirds of
// the scene's ~11.5k nodes sit under a hidden ancestor (pedestrians and vehicles out of range, near / far vehicle
// LOD parts, furniture culled from afar, interiors), so most of that work (≈1.2 ms a frame on a desktop CPU, several
// on a phone) went into objects nobody sees. The renderer and the shadow pass already skip hidden subtrees, so their
// matrices are not needed until they show again.
//
// installVisibleMatrices(scene) replaces scene.updateMatrixWorld (what WebGLRenderer.render calls) with the same walk
// that does not descend into an object with visible === false. Such an object is marked, and the first time it is
// visible again its whole subtree is recomputed (force), so a parent that moved meanwhile is picked up.
// Code that needs a hidden object's world matrix keeps working as before through updateWorldMatrix() /
// getWorldPosition() / obj.updateMatrixWorld(true), which are untouched.

const SKIPPED = '__mwSkipped';

export function updateVisibleWorld(o, force) {
  if (o.matrixAutoUpdate) o.updateMatrix();
  if (o.matrixWorldNeedsUpdate || force) {
    if (o.matrixWorldAutoUpdate !== false) {
      if (o.parent === null) o.matrixWorld.copy(o.matrix);
      else o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix);
    }
    o.matrixWorldNeedsUpdate = false;
    force = true;
  }
  const ch = o.children;
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (c.visible === false) {
      c[SKIPPED] = true;
      continue;
    }
    let f = force;
    if (c[SKIPPED]) {
      c[SKIPPED] = false;
      f = true;
    }
    updateVisibleWorld(c, f);
  }
}

export function installVisibleMatrices(scene) {
  scene.updateMatrixWorld = function (force = false) {
    updateVisibleWorld(this, force);
  };
  return scene;
}
