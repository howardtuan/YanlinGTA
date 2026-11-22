// 彈古箏的姿勢：古箏社社員（ClubMembers.js）和黃蓋瑞（Garry.js）共用。
import { reachArm } from '../Armik.js';

// hands on the strings of a guzheng 0.6 m in front (t: time, busy: really playing)
export function playPose(ch, t, busy) {
  const [aR, aL] = ch.arms; ch.torso.rotation.x = 0.34; ch.head.rotation.x = 0.26 + Math.sin(t * 0.9) * 0.05;
  ch.root.updateMatrixWorld(true);
  const s = busy ? 1 : 0, a = Math.sin(t * 5.2), b = Math.sin(t * 1.3);
  const y = 0.735 / ch.root.scale.y;
  reachArm(ch, aR, -0.3 + b * 0.03 * s, y + Math.max(0, a) * 0.045 * s, 0.5 + Math.cos(t * 2.6) * 0.05 * s, -0.6, -0.5, -0.5);
  reachArm(ch, aL, 0.2 + b * 0.06 * s, y + Math.max(0, Math.sin(t * 2.1)) * 0.035 * s, 0.5 + Math.sin(t * 1.7) * 0.04 * s, 0.6, -0.5, -0.5);
}
