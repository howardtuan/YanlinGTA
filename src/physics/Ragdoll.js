// Ragdolls (P4): a character (src/entities/Character.js) thrown by a hit goes limp as physics bodies, then lies still.
//
// Ragdoll.start(physics, ch, v, w) turns character ch into 9 dynamic capsules (trunk = hips + torso, head, upper
// arms, forearms, thighs, shins) joined at its pivots: ball joints at the shoulders, hinges with limits at
// the neck, hips, knees and elbows (they bend only the way the animation bends them). v: start velocity
// {x, y, z} (m/s), w: spin {x, y, z} (rad/s). Returns null without physics or when MAX are already flying:
// the caller keeps its old (non-physics) tumble then.
// Every frame after the physics steps the bodies are written back into the pivots: ch.root stays upright at
// the ground under the trunk (so the owner's position, the camera and "same level" checks keep working),
// the hips pivot carries the trunk's pose, every other pivot only its rotation (bone lengths never change).
// Once everything has been still for REST_T (or after MAX_T) the bodies are freed: `resting` turns true,
// the pose stays frozen where it lies. The owner then decides when to get up: Ragdoll.standUp(ch) clears
// what the animation does not reset by itself (ch.update eases the rest back).
// Groups: G.RAGDOLL hits the world, vehicles and props, never itself, other characters or debris.
import * as THREE from 'three';
import { G, groups } from './Physics.js';
import { surfaceAt } from '../world/Terrain.js';

export const MAX_RAGDOLLS = 6; // flying at the same time
const REST_V = 0.35; // m/s: every body slower than this counts as still
const REST_T = 0.6; // s still before it is frozen
const MAX_T = 7; // s at most (then frozen wherever it is)
// capsules in the pivot's own frame: centre y, half height h (without the caps), radius r, mass kg
const SEG = {
  trunk: { y: 0.24, h: 0.2, r: 0.17, m: 34 },
  head: { y: 0.11, h: 0, r: 0.12, m: 5 },
  uarm: { y: -0.13, h: 0.07, r: 0.055, m: 2.2 },
  farm: { y: -0.14, h: 0.08, r: 0.05, m: 1.6 },
  thigh: { y: -0.21, h: 0.12, r: 0.08, m: 8 },
  shin: { y: -0.25, h: 0.16, r: 0.06, m: 4 },
};
// hinge limits (rad, the pivot's rotation.x: the same sign as the animation's)
const ELBOW = [-2.5, 0.05],
  HIP = [-2.1, 0.6],
  KNEE = [-0.05, 2.5],
  NECK = [-0.6, 0.7];

const _p = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion(),
  _iq = new THREE.Quaternion();
const _yaw = new THREE.Quaternion(),
  _up = new THREE.Vector3(0, 1, 0),
  _v = new THREE.Vector3();
const _tr = new THREE.Quaternion(),
  _iTr = new THREE.Quaternion(),
  _iTo = new THREE.Quaternion(),
  _ip = new THREE.Quaternion();
const vec = (o) => ({ x: o.x, y: o.y, z: o.z });
const quat = (o) => ({ x: o.x, y: o.y, z: o.z, w: o.w });
const toQ = (r, q) => q.set(r.x, r.y, r.z, r.w);

export class Ragdoll {
  // opt.maxT: frozen after this long at most (s, default MAX_T)
  static start(P, ch, v, w, opt) {
    if (!P?.world || P.rags.size >= MAX_RAGDOLLS) return null;
    try {
      const r = new Ragdoll(P, ch, v, w);
      if (opt?.maxT) r.maxT = opt.maxT;
      return r;
    } catch (e) {
      console.warn('[ragdoll] 布娃娃建立失敗，改用原本的摔倒', e);
      return null;
    }
  }
  constructor(P, ch, v, w) {
    const R = P.R,
      W = P.world;
    this.P = P;
    this.ch = ch;
    this.t = 0;
    this.stillT = 0;
    this.resting = false;
    this.maxT = MAX_T;
    this.wrote = null;
    this.trunkY = 0;
    ch.root.updateMatrixWorld(true);
    this.yaw = new THREE.Euler().setFromQuaternion(ch.root.getWorldQuaternion(_q), 'YXZ').y;
    this.qT = ch.torso.quaternion.clone(); // the torso pivot rides on the trunk body as it is
    this.lenK = ch.heightScale || 1;
    const massK = (ch.weight || 70.6) / 70.6;
    const lenK = this.lenK;
    this.bodies = [];
    const make = (pivot, seg, extraQ) => {
      pivot.getWorldPosition(_p);
      pivot.getWorldQuaternion(_q);
      const b = W.createRigidBody(
        R.RigidBodyDesc.dynamic()
          .setTranslation(_p.x, _p.y, _p.z)
          .setRotation(quat(_q))
          .setLinearDamping(0.2)
          .setAngularDamping(seg === SEG.head ? 2 : 0.8)
          .setCcdEnabled(true)
      );
      const c =
        seg.h > 0
          ? R.ColliderDesc.capsule(seg.h * lenK, seg.r * lenK)
          : R.ColliderDesc.ball(seg.r * lenK);
      // the trunk's capsule follows the torso's lean inside the hips frame
      const off = new THREE.Vector3(0, seg.y * lenK, 0);
      if (extraQ) off.applyQuaternion(extraQ);
      c.setTranslation(off.x, off.y, off.z);
      if (extraQ) c.setRotation(quat(extraQ));
      P._own(
        W.createCollider(
          c
            .setMass(seg.m * massK)
            .setFriction(0.9)
            .setRestitution(0.05)
            .setCollisionGroups(groups(G.RAGDOLL)),
          b
        ),
        'ragdoll',
        ch
      );
      b.setLinvel(v, true);
      if (w) b.setAngvel(w, true);
      this.bodies.push(b);
      return b;
    };
    const [aR, aL] = ch.arms,
      [lR, lL] = ch.legs;
    this.trunk = make(ch.hips, SEG.trunk, this.qT);
    this.head = make(ch.head, SEG.head);
    this.arms = [aR, aL].map((a) => ({ a, u: make(a.sh, SEG.uarm), f: make(a.el, SEG.farm) }));
    this.legs = [lR, lL].map((l) => ({ l, t: make(l.hp, SEG.thigh), s: make(l.kn, SEG.shin) }));
    // joints at the child pivot: its position in the parent body's frame, (0, 0, 0) in its own
    const at = (parent, pivot) => {
      const t = parent.translation();
      toQ(parent.rotation(), _iq).invert();
      pivot.getWorldPosition(_p);
      _p.sub(_v.set(t.x, t.y, t.z)).applyQuaternion(_iq);
      return vec(_p);
    };
    const O = { x: 0, y: 0, z: 0 },
      X = { x: 1, y: 0, z: 0 };
    const ball = (b1, b2, pivot) =>
      W.createImpulseJoint(R.JointData.spherical(at(b1, pivot), O), b1, b2, true);
    const hinge = (b1, b2, pivot, lim) => {
      const j = W.createImpulseJoint(R.JointData.revolute(at(b1, pivot), O, X), b1, b2, true);
      j.setLimits(lim[0], lim[1]);
    };
    hinge(this.trunk, this.head, ch.head, NECK);
    for (const { a, u, f } of this.arms) {
      ball(this.trunk, u, a.sh);
      hinge(u, f, a.el, ELBOW);
    }
    for (const { l, t, s } of this.legs) {
      hinge(this.trunk, t, l.hp, HIP);
      hinge(t, s, l.kn, KNEE);
    }
    // the root stands upright from now on; the bob container goes flat
    ch.root.rotation.set(0, this.yaw, 0);
    ch.body.position.set(0, 0, 0);
    P.rags.add(this);
  }
  // after the physics steps (Physics._sync): the pose from the bodies, then whether it lies still
  pose(dt) {
    if (this.resting) return;
    const ch = this.ch,
      tb = this.trunk.translation(),
      root = ch.root;
    // moved by the game since the last write (a teleport, a cut scene): it stops being a ragdoll there
    if (this.wrote && root.position.distanceToSquared(this.wrote) > 0.25) {
      this.moved = true;
      this.end();
      return;
    }
    toQ(this.trunk.rotation(), _tr);
    // root: upright under the trunk, on the ground there (the level the trunk is on; on an upper floor a
    // bit below it at worst)
    root.position.set(
      tb.x,
      Math.max(Math.min(surfaceAt(tb.x, tb.z, tb.y), tb.y), tb.y - 0.93 * this.lenK),
      tb.z
    );
    (this.wrote ||= new THREE.Vector3()).copy(root.position);
    this.trunkY = tb.y;
    _yaw.setFromAxisAngle(_up, this.yaw);
    ch.hips.position.set(0, (tb.y - root.position.y) / this.lenK, 0);
    ch.hips.quaternion.copy(_yaw).invert().multiply(_tr);
    // every other pivot: its body's rotation in its parent's frame
    _iTr.copy(_tr).invert();
    _iTo.copy(_tr).multiply(this.qT).invert();
    const local = (o, parentInv, b) =>
      o.quaternion.copy(parentInv).multiply(toQ(b.rotation(), _q2));
    const inv = (b) => toQ(b.rotation(), _ip).invert();
    local(ch.head, _iTo, this.head);
    for (const { a, u, f } of this.arms) {
      local(a.sh, _iTo, u);
      local(a.el, inv(u), f);
    }
    for (const { l, t, s } of this.legs) {
      local(l.hp, _iTr, t);
      local(l.kn, inv(t), s);
    }
    // secondary ground impact sound (ragdoll_thud, max 2 thuds per fall)
    const tv = this.trunk.linvel();
    if (this._thudT > 0) this._thudT -= dt;
    if (
      (this._thuds || 0) < 2 &&
      (this._thudT || 0) <= 0 &&
      (this._prevVy || 0) < -2.4 &&
      tv.y - (this._prevVy || 0) > 3.0
    ) {
      this._thuds = (this._thuds || 0) + 1;
      this._thudT = 0.35;
      this.P.onSound?.('ragdoll', Math.min(1, -this._prevVy / 8), tb.x, tb.z);
    }
    this._prevVy = tv.y;
    // still?
    this.t += dt;
    let fast = false;
    for (const b of this.bodies) {
      const lv = b.linvel();
      if (lv.x * lv.x + lv.y * lv.y + lv.z * lv.z > REST_V * REST_V) {
        fast = true;
        break;
      }
    }
    this.stillT = fast ? 0 : this.stillT + dt;
    if (this.stillT > REST_T || this.t > this.maxT) this.end();
  }
  // the trunk's position now (world), e.g. where the owner should be
  get pos() {
    return this.ch.root.position;
  }
  // free the bodies; the pose stays where it is
  end() {
    if (this.resting) return;
    this.resting = true;
    const P = this.P;
    P.rags.delete(this);
    if (P.world) for (const b of this.bodies) P._drop(b); // (removing a body removes its joints)
    this.bodies = [];
  }
  // getting up (after end()): back to what the animation expects; ch.update eases the joints from here
  static standUp(ch) {
    ch.hips.position.x = ch.hips.position.z = 0;
    ch.hips.quaternion.identity();
    ch.root.rotation.x = ch.root.rotation.z = 0;
    ch.head.rotation.y = 0;
    for (const a of ch.arms) {
      a.el.rotation.y = a.el.rotation.z = 0;
    }
    for (const l of ch.legs) {
      l.hp.rotation.y = l.hp.rotation.z = 0;
      l.kn.rotation.y = l.kn.rotation.z = 0;
    }
  }
}
