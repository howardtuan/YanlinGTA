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
export const RIDER_MASS = 70; // kg default reference rider mass
export const BASE_HEIGHT = 1.72; // m base 3D character mesh height (Character.js)
export const A_EJECT = 42; // m/s^2 (~4.28 G sudden deceleration shock ejects a motorcycle rider)

// Taiwan young-adult anthropometric normal distribution parameters (衛福部 19-29 歲常態分佈)
export const ANTHRO_DIST = {
  male: {
    heightMean: 1.735, // m (173.5 cm)
    heightSd: 0.06, // m (6.0 cm)
    heightMin: 1.55,
    heightMax: 1.95,
    bmiMean: 23.0, // -> mean weight ~69.2 kg at 173.5 cm
    bmiSd: 3.4,
    weightMin: 48,
    weightMax: 115,
  },
  female: {
    heightMean: 1.605, // m (160.5 cm)
    heightSd: 0.055, // m (5.5 cm)
    heightMin: 1.45,
    heightMax: 1.8,
    bmiMean: 20.8, // -> mean weight ~53.6 kg at 160.5 cm
    bmiSd: 2.9,
    weightMin: 38,
    weightMax: 90,
  },
};

/**
 * Sample realistic human height (m) and weight (kg) from gender-specific normal distributions
 * via Box-Muller transform using two uniform inputs u1, u2 in (0, 1).
 * Weight correlates with height via normal BMI (W = BMI * H^2).
 */
export function sampleAnthropometry(female, u1, u2) {
  const d = female ? ANTHRO_DIST.female : ANTHRO_DIST.male;
  const a = Math.max(1e-6, Math.min(1 - 1e-6, u1));
  const b = Math.max(0, Math.min(1, u2));
  const r = Math.sqrt(-2 * Math.log(a));
  const z1 = r * Math.cos(2 * Math.PI * b);
  const z2 = r * Math.sin(2 * Math.PI * b);
  const height = Math.max(d.heightMin, Math.min(d.heightMax, d.heightMean + z1 * d.heightSd));
  const bmi = Math.max(15.5, Math.min(34, d.bmiMean + z2 * d.bmiSd));
  const weight = Math.max(d.weightMin, Math.min(d.weightMax, bmi * height * height));
  return {
    gender: female ? 'female' : 'male',
    height,
    weight,
    bmi,
    heightScale: height / BASE_HEIGHT,
  };
}

export const PERSON_PHYS = {
  mass: RIDER_MASS, // 70 kg fallback adult mass
  height: BASE_HEIGHT, // 1.72 m fallback adult height
  dtImpact: 0.1, // s soft-body contact duration
  muStatic: 0.6, // sneaker static grip on pavement
  eVehicle: 0.1, // inelastic vehicle-to-person impact
  ePerson: 0.08, // inelastic person-to-person shoulder bump
  knockDownV: 2.2, // m/s post-impact delta-V that knocks a standing person off their feet
  tackleDownV: 2.8, // m/s post-impact delta-V for a sprint tackle between two people
  gripForce: 450, // N max human handlebar brace force before grip breaks
  riderCmH: 1.15, // m seated rider CM height above ground
  barPivotH: 0.92, // m handlebar / front shield pivot height
  barPivotL: 0.55, // m horizontal distance from hips to handlebar pivot
  vaultEff: 0.85, // inelastic contact efficiency across thigh/handlebar vault
};

export const VEHICLE_PHYS = {
  scooter: {
    mass: 110, // kg (dry + fuel, without rider)
    dtImpact: 0.12, // s collision duration
    muStatic: 0.5, // parked on 2 wheels + side/center stand
    muKinetic: 0.55, // fallen scooter scraping on asphalt (a = 5.4 m/s^2)
    hCm: 0.52, // m center of mass height
    bumperH: 0.58, // m front shield impact height
    iRoll: 38.4, // kg*m^2 roll inertia about ground contact line: m * (rg^2 + h^2)
    minMoveV: 0.45, // m/s minimum target speed after overcoming static hold to trigger dynamic slide
    linDamp: 0.08, // minimal aerodynamic drag; Coulomb friction does the real stopping
    angDamp: 0.25,
    restitution: 0.08,
    // Narrow 2-wheel footprint (0.24 m wide, 0.88 m tall -> ~15° balance angle) so gravity tips it cleanly onto its side
    shape: { shape: 'box', hx: 0.12, hy: 0.44, hz: 0.78 },
  },
  car: {
    mass: 1250, // kg sedan curb weight
    dtImpact: 0.18, // s bumper / crumple zone duration
    muStatic: 0.88, // 4 rubber tires locked in Park + handbrake
    muKinetic: 0.8, // 4 locked tires skidding on dry asphalt (a = 7.85 m/s^2)
    hCm: 0.55, // m (SSF = track/(2*hCm) ≈ 1.55 > muKinetic -> slides flat rather than flipping)
    bumperH: 0.52, // m front bumper height
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
  rider1Mass = null,
  kind2,
  rider2 = false,
  rider2Mass = null,
  parked2 = true,
  vRel,
}) {
  const s1 = vehicleSpec(kind1);
  const s2 = vehicleSpec(kind2);
  const m1 = s1.mass + (rider1 ? (rider1Mass ?? RIDER_MASS) : 0);
  const m2 = s2.mass + (rider2 ? (rider2Mass ?? RIDER_MASS) : 0);
  const dt = Math.max(s1.dtImpact, s2.dtImpact);
  const v = Math.max(0, vRel || 0);

  // 1. Normal impulse J = (1 + e) * (m1 * m2 / (m1 + m2)) * vRel
  const mu = (m1 * m2) / (m1 + m2);
  const impulse = (1 + RESTITUTION) * mu * v;

  // 2. Parked static friction impulse J_hold = muStatic * m2 * g * dt
  const holdImpulse = parked2 ? s2.muStatic * m2 * GRAVITY * dt : 0;
  const netImpulse = Math.max(0, impulse - holdImpulse);

  // 3. Post-impact delta-V for both bodies (Newton's 3rd Law: equal & opposite impulse J)
  //    If static friction holds target rigidly (dv2 < minMoveV), target behaves as an infinite-mass barrier:
  //    J_rigid = (1 + e) * m1 * vRel, so dv1 = (1 + e) * vRel and dv2 = 0.
  const rawDv2 = netImpulse / m2;
  const moves = rawDv2 >= s2.minMoveV;
  const effImpulse = moves ? impulse : (1 + RESTITUTION) * m1 * v;
  const dv1 = effImpulse / m1;
  const dv2 = moves ? rawDv2 : 0;

  // 4. Hitter deceleration shock (a1 = dv1 / dt) & retained forward speed ratio kf = max(0, 1 - dv1 / v)
  const accel1 = dv1 / dt;
  const ejectRider1 = kind1 === 'scooter' && accel1 >= A_EJECT;
  const kf = v > 1e-4 ? Math.max(0, 1 - dv1 / v) : 0;

  // 5. Target tipping roll angular velocity (rad/s) around its own longitudinal axis:
  //    Scooter: omega = (J_net * hCm) / I_roll (narrow 2-wheel base tips over; gravity completes fall past 15°).
  //    No floor: a knocked scooter already starts leaning past its balance angle (ParkedScooters.knockSlot), so
  //    gravity tips it over anyway; a floor (it was 3.4 rad/s) put in rotational energy no impulse gave, which
  //    kept every domino chain going down a whole row however lightly the first scooter was touched.
  //    Car: SSF > muKinetic -> slides flat (rollSpeed = 0)
  const rollSpeed =
    kind2 === 'scooter' && moves ? Math.min(6.5, (netImpulse * s2.hCm) / s2.iRoll) : 0;

  return {
    m1,
    m2,
    impulse: effImpulse,
    force: effImpulse / dt,
    holdImpulse,
    netImpulse: moves ? netImpulse : 0,
    dv1,
    dv2,
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
 * Decomposes post-impact speed dv2 into horizontal and upward components using bumper-to-CM geometry
 * so total launch speed strictly equals dv2 = J_net / m_person (no free vertical energy added).
 */
export function solvePersonImpact({
  vehicleKind,
  riderOnVehicle = true,
  riderMass = null,
  personMass = PERSON_PHYS.mass,
  personHeight = PERSON_PHYS.height,
  vRel,
}) {
  const sv = vehicleSpec(vehicleKind);
  const m1 = sv.mass + (riderOnVehicle ? (riderMass ?? RIDER_MASS) : 0);
  const m2 = Math.max(30, personMass || PERSON_PHYS.mass);
  const h = Math.max(1.2, personHeight || PERSON_PHYS.height);
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

  // Geometric bumper-below-CM pitch angle: alpha = asin(kappa * max(0, hCm - hBumper) / hCm)
  // Decomposes dv2 into (dv2*cos(alpha), dv2*sin(alpha)) -> |v_person| === dv2 (energy conserving!)
  const hCm = 0.55 * h;
  const lever = Math.max(0, (hCm - sv.bumperH) / hCm);
  const sinA = knockDown ? Math.min(0.42, lever * 0.65) : 0;
  const cosA = Math.sqrt(1 - sinA * sinA);
  const dvHoriz = dv2 * cosA;
  const vy2 = dv2 * sinA;

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
    dvPerson: dvHoriz,
    dvTotal: dv2,
    vyPerson: vy2,
    kf,
    knockDown,
    accel1,
    ejectRider1,
  };
}

/**
 * Solve motorcycle rider ejection velocity from Newton's 1st Law (inertia), handlebar grip break impulse,
 * and handlebar/seat pivot vault geometry (zero arbitrary floors or hardcoded speed multipliers).
 */
export function solveRiderEjection({
  speed,
  impact,
  nx,
  nz,
  fx,
  fz,
  dv1,
  pushed = false,
  riderMass = PERSON_PHYS.mass,
}) {
  const m = Math.max(30, riderMass || PERSON_PHYS.mass);
  const dt = VEHICLE_PHYS.scooter.dtImpact;
  const dvGrip = (PERSON_PHYS.gripForce * dt) / m; // speed shed before hands lose grip (~0.77 m/s at 70 kg)
  const theta = Math.atan2(PERSON_PHYS.riderCmH - PERSON_PHYS.barPivotH, PERSON_PHYS.barPivotL);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  if (pushed) {
    const vBase = Math.max(0, (dv1 ?? impact * 0.5) - dvGrip);
    const vEff = vBase * PERSON_PHYS.vaultEff;
    return {
      vx: nx * vEff * cosT,
      vz: nz * vEff * cosT,
      vy: vEff * sinT,
    };
  }

  // Forward crash: rider continues forward along pre-crash velocity by inertia, vaulting over the handlebars
  const vLaunch = Math.max(0, Math.abs(speed || 0) - dvGrip);
  const d = fx * nx + fz * nz;
  const tangX = fx - d * nx;
  const tangZ = fz - d * nz;
  // Predominantly forward inertia with slight natural glancing component along obstacle surface
  let dirX = fx * 0.9 + tangX * 0.1;
  let dirZ = fz * 0.9 + tangZ * 0.1;
  const dl = Math.hypot(dirX, dirZ) || 1;
  dirX /= dl;
  dirZ /= dl;

  const vEff = vLaunch * PERSON_PHYS.vaultEff;
  return {
    vx: dirX * vEff * cosT,
    vz: dirZ * vEff * cosT,
    vy: vEff * sinT,
  };
}

/**
 * Solve a person-vs-person collision using both people's actual masses (m1, m2 in kg).
 */
export function solvePersonPersonImpact(vRel, mass1 = PERSON_PHYS.mass, mass2 = PERSON_PHYS.mass) {
  const m1 = Math.max(30, mass1 || PERSON_PHYS.mass);
  const m2 = Math.max(30, mass2 || PERSON_PHYS.mass);
  const dt = PERSON_PHYS.dtImpact;
  const v = Math.max(0, vRel || 0);
  const mu = (m1 * m2) / (m1 + m2);
  const impulse = (1 + PERSON_PHYS.ePerson) * mu * v;
  const force = impulse / dt;
  const holdImpulse = PERSON_PHYS.muStatic * m2 * GRAVITY * dt;
  const netImpulse = Math.max(0, impulse - holdImpulse);
  const dv1 = impulse / m1;
  const dv2 = netImpulse / m2;
  const kf = v > 1e-4 ? Math.max(0, 1 - dv1 / v) : 0;
  const knockDown = dv2 >= PERSON_PHYS.tackleDownV;
  // Energy-conserving slight upward pitch when tackled (~14° shoulder-level launch)
  const sinA = knockDown ? 0.24 : 0;
  const cosA = Math.sqrt(1 - sinA * sinA);
  return {
    m1,
    m2,
    impulse,
    force,
    dv1,
    dv2: dv2 * cosA,
    dv2Total: dv2,
    vy2: dv2 * sinA,
    kf,
    knockDown,
  };
}
