// Newtonian rigid-body vehicle collision solver (SI units: kg, m, s, N, N*s).
//
// Every vehicle-vs-vehicle collision (parked scooters, parked cars, traffic, player chassis)
// derives post-impact velocities, forces, tipping torque, and rider ejection from the same laws:
//   1. Reduced mass:         mu = (m1 * m2) / (m1 + m2)
//   2. Normal impulse:       J  = (1 + e) * mu * vRel                  (e = 0.12 inelastic vehicle impact)
//   3. Impact force:         F  = J / dtImpact
//   4. Static hold impulse:  J_hold = muStatic * m2 * g * dtImpact     (handbrake / kickstand resistance)
//   5. Net target impulse:   J_net  = max(0, J - J_hold)
//   6. Velocity changes:     dv1 = J / m1,   dv2 = J_net / m2          (Newton's 3rd Law)
//   7. Rider ejection:       a1 = dv1 / dtImpact >= A_EJECT            (~3.7 G sudden deceleration shock)
//   8. Tipping roll:         scooter -> omega = (J_net * hCm) / I_roll (narrow 2-wheel base tips over)
//                            car     -> SSF = track/(2*hCm) > mu_k     (slides flat on 4 wheels, no flip)

export const GRAVITY = 9.81;
export const RESTITUTION = 0.12; // inelastic crumple/plastic absorption in real vehicle crashes
export const RIDER_MASS = 70; // kg
export const A_EJECT = 36; // m/s^2 (~3.67 G shock over dtImpact ejects a motorcycle rider)

export const PERSON_PHYS = {
  mass: RIDER_MASS, // 70 kg average adult
  dtImpact: 0.1, // s soft-body contact duration
  muStatic: 0.6, // sneaker static grip on pavement
  eVehicle: 0.1, // inelastic vehicle-to-person impact
  ePerson: 0.08, // inelastic person-to-person shoulder bump
  knockDownV: 2.2, // m/s post-impact delta-V that knocks a standing person off their feet
  tackleDownV: 2.8, // m/s post-impact delta-V for a sprint tackle between two people
};

export const VEHICLE_PHYS = {
  scooter: {
    mass: 110, // kg (dry + fuel, without rider)
    dtImpact: 0.12, // s collision duration
    muStatic: 0.5, // parked on 2 wheels + side/center stand
    muKinetic: 0.55, // fallen scooter scraping on asphalt (a = 5.4 m/s^2)
    hCm: 0.52, // m center of mass height
    iRoll: 38.4, // kg*m^2 roll inertia about ground contact line: m * (rg^2 + h^2)
    minMoveV: 0.45, // m/s minimum target speed after overcoming static hold to trigger dynamic slide
    linDamp: 0.08, // minimal aerodynamic drag; Coulomb friction does the real stopping
    angDamp: 0.35,
    restitution: 0.08,
    shape: { shape: 'box', hx: 0.24, hy: 0.44, hz: 0.78 },
  },
  car: {
    mass: 1250, // kg sedan curb weight
    dtImpact: 0.15, // s bumper / crumple zone duration
    muStatic: 0.88, // 4 rubber tires locked in Park + handbrake
    muKinetic: 0.8, // 4 locked tires skidding on dry asphalt (a = 7.85 m/s^2)
    hCm: 0.55, // m (SSF = track/(2*hCm) ≈ 1.55 > muKinetic -> slides flat rather than flipping)
    iRoll: 0,
    minMoveV: 0.9, // m/s (~5 cm skid); smaller impulses just rock on suspension without breaking traction
    linDamp: 0.08,
    angDamp: 1.2,
    restitution: 0.05,
    shape: { shape: 'box', hx: 0.88, hy: 0.65, hz: 1.95, cy: 0.72 },
  },
};

export const vehicleSpec = (kind) => (kind === 'scooter' ? VEHICLE_PHYS.scooter : VEHICLE_PHYS.car);

export const vehicleMass = (kind, hasRider = false) =>
  vehicleSpec(kind).mass + (hasRider ? RIDER_MASS : 0);

/**
 * Solve a 1D normal collision between hitter (1) and target (2) using Newtonian impulse-momentum.
 *
 * @param {object} p
 * @param {string} p.kind1 - 'scooter' | 'car' | 'taxi'
 * @param {boolean} [p.rider1=true] - whether hitter carries a rider/driver
 * @param {string} p.kind2 - 'scooter' | 'car' | 'taxi'
 * @param {boolean} [p.rider2=false] - whether target carries a rider/driver
 * @param {boolean} [p.parked2=true] - parked target resists via static friction (stand / handbrake)
 * @param {number} p.vRel - positive closing speed along contact normal (m/s)
 */
export function solveVehicleImpact({
  kind1,
  rider1 = true,
  kind2,
  rider2 = false,
  parked2 = true,
  vRel,
}) {
  const s1 = vehicleSpec(kind1);
  const s2 = vehicleSpec(kind2);
  const m1 = s1.mass + (rider1 ? RIDER_MASS : 0);
  const m2 = s2.mass + (rider2 ? RIDER_MASS : 0);
  const dt = Math.max(s1.dtImpact, s2.dtImpact);
  const v = Math.max(0, vRel || 0);

  // 1. Normal impulse J = (1 + e) * (m1 * m2 / (m1 + m2)) * vRel
  const mu = (m1 * m2) / (m1 + m2);
  const impulse = (1 + RESTITUTION) * mu * v;
  const force = impulse / dt;

  // 2. Parked static friction impulse J_hold = muStatic * m2 * g * dt
  const holdImpulse = parked2 ? s2.muStatic * m2 * GRAVITY * dt : 0;
  const netImpulse = Math.max(0, impulse - holdImpulse);

  // 3. Post-impact delta-V for both bodies (Newton's 3rd Law)
  const dv1 = impulse / m1;
  const dv2 = netImpulse / m2;
  const moves = dv2 >= s2.minMoveV;

  // 4. Hitter deceleration shock & retained forward speed ratio kf
  //    If target did not break traction (e.g. scooter hitting parked 1.25-ton car), target acts like a rigid barrier
  const effDv1 = moves ? dv1 : Math.min(v * (1 + RESTITUTION), (impulse + holdImpulse * 0.5) / m1);
  const accel1 = effDv1 / dt;
  const ejectRider1 = kind1 === 'scooter' && accel1 >= A_EJECT;
  const kf = v > 1e-4 ? Math.max(0, 1 - dv1 / v) : 0;

  // 5. Target tipping roll angular velocity (rad/s) around its own longitudinal axis
  //    Scooter: omega = (J_net * hCm) / I_roll (with minimum tip torque once pushed off its stand)
  //    Car: SSF > muKinetic -> slides flat (rollSpeed = 0)
  const rollSpeed =
    kind2 === 'scooter' && moves
      ? Math.max(3.4, Math.min(6.5, (netImpulse * s2.hCm) / s2.iRoll))
      : 0;

  return {
    m1,
    m2,
    impulse,
    force,
    holdImpulse,
    netImpulse,
    dv1: effDv1,
    dv2: moves ? dv2 : 0,
    accel1,
    ejectRider1,
    moves,
    kf,
    rollSpeed,
    physOpt2: {
      linDamp: s2.linDamp,
      angDamp: s2.angDamp,
      friction: s2.muKinetic,
      restitution: s2.restitution,
    },
    shape2: s2.shape,
  };
}

/**
 * Solve a vehicle-vs-person collision using Newtonian impulse-momentum (SI units).
 * Used for both player vehicle hitting pedestrians and moving traffic hitting the walking player.
 */
export function solvePersonImpact({ vehicleKind, riderOnVehicle = true, vRel }) {
  const sv = vehicleSpec(vehicleKind);
  const m1 = sv.mass + (riderOnVehicle ? RIDER_MASS : 0);
  const m2 = PERSON_PHYS.mass;
  const dt = PERSON_PHYS.dtImpact;
  const v = Math.max(0, vRel || 0);

  const mu = (m1 * m2) / (m1 + m2);
  const impulse = (1 + PERSON_PHYS.eVehicle) * mu * v;
  const force = impulse / dt;
  const holdImpulse = PERSON_PHYS.muStatic * m2 * GRAVITY * dt;
  const netImpulse = Math.max(0, impulse - holdImpulse);

  const dv1 = impulse / m1;
  const dv2 = netImpulse / m2;
  const kf = v > 1e-4 ? Math.max(0, 1 - dv1 / v) : 0;
  const knockDown = dv2 >= PERSON_PHYS.knockDownV;
  // Low bumper pitch lifts a knocked person moderately rather than launching them into orbit
  const vy2 = knockDown ? Math.min(3.4, 0.9 + dv2 * 0.2) : 0;
  const accel1 = dv1 / sv.dtImpact;
  const ejectRider1 = vehicleKind === 'scooter' && accel1 >= A_EJECT;

  return {
    m1,
    m2,
    impulse,
    force,
    holdImpulse,
    netImpulse,
    dvVehicle: dv1,
    dvPerson: dv2,
    vyPerson: vy2,
    kf,
    knockDown,
    accel1,
    ejectRider1,
  };
}

/**
 * Solve a person-vs-person collision (equal mass 70 kg vs 70 kg).
 * Walking bumps separate solidly; full sprint tackles (>= ~6.2 m/s) can knock the other person down.
 */
export function solvePersonPersonImpact(vRel) {
  const m = PERSON_PHYS.mass;
  const dt = PERSON_PHYS.dtImpact;
  const v = Math.max(0, vRel || 0);
  const mu = m * 0.5;
  const impulse = (1 + PERSON_PHYS.ePerson) * mu * v;
  const force = impulse / dt;
  const holdImpulse = PERSON_PHYS.muStatic * m * GRAVITY * dt;
  const netImpulse = Math.max(0, impulse - holdImpulse);
  const dv1 = impulse / m;
  const dv2 = netImpulse / m;
  const kf = v > 1e-4 ? Math.max(0, 1 - dv1 / v) : 0;
  const knockDown = dv2 >= PERSON_PHYS.tackleDownV;
  const vy2 = knockDown ? Math.min(2.0, 0.7 + dv2 * 0.15) : 0;
  return { impulse, force, dv1, dv2, vy2, kf, knockDown };
}
