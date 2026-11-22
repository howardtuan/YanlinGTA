// two-bone arm: bend the arm so the palm reaches a point given in the character's own frame
// (used by 勞大's ball handling, src/entities/Pilot.js, and the guzheng players, src/entities/npcs/ClubMembers.js)
import * as THREE from 'three';
const A = 0.26, B = 0.25, v = () => new THREE.Vector3();
const t = v(), h0 = v(), e0 = v(), d = v(), m = new THREE.Matrix4(), m2 = new THREE.Matrix4();
// (x, y, z): the target in ch.root's frame; (px, py, pz): the way the elbow points. ch.root's world matrix must be up to date
export function reachArm(ch, arm, x, y, z, px, py, pz) {
  ch.torso.worldToLocal(ch.root.localToWorld(t.set(x, y, z))).sub(arm.sh.position);
  const L = Math.min(A + B - 0.004, Math.max(0.12, t.length())), q = (A * A + B * B - L * L) / (2 * A * B), el = -(Math.PI - Math.acos(Math.max(-1, Math.min(1, q))));
  t.normalize();
  // frame of the straight-down arm bent by el: along its reach, toward its elbow
  h0.set(0, -A - B * Math.cos(el), -B * Math.sin(el)).normalize(); e0.set(0, -A, 0); e0.addScaledVector(h0, -e0.dot(h0)); if (e0.lengthSq() < 1e-6) e0.set(0, 0, -1); e0.normalize();
  m.makeBasis(h0, e0, d.crossVectors(h0, e0)).transpose();
  e0.set(px, py, pz); e0.addScaledVector(t, -e0.dot(t)).normalize();
  m2.makeBasis(t, e0, d.crossVectors(t, e0)).multiply(m);
  arm.sh.quaternion.setFromRotationMatrix(m2); arm.el.rotation.set(el, 0, 0);
}
