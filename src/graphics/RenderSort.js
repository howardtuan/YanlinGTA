// Opaque draw order (perf-refactor Phase 2, phase-2-render-and-igpu-opt.md §三.5): three's default sorts the
// opaque list by groupOrder, renderOrder, material, distance. This keeps the first two (the ground layers rely
// on renderOrder) and then groups by the compiled shader program before the material, so materials that share a
// program draw one after another and WebGL switches programs less often; then front to back as before.
// The program id is read from the renderer's material properties and cached on the material for a short while
// (a program changes only when the material is recompiled: quality switch, the number of lights).
const REFRESH = 120; // render() calls between program-id lookups per material

export function installOpaqueSort(renderer) {
  const props = renderer.properties,
    info = renderer.info.render;
  const pid = (m) => {
    const f = info.frame;
    if (m.__pidAt === undefined || f - m.__pidAt > REFRESH) {
      m.__pid = props.get(m).currentProgram?.id ?? 0;
      m.__pidAt = f;
    }
    return m.__pid;
  };
  const sort = (a, b) =>
    a.groupOrder - b.groupOrder ||
    a.renderOrder - b.renderOrder ||
    pid(a.material) - pid(b.material) ||
    a.material.id - b.material.id ||
    a.z - b.z ||
    a.id - b.id;
  renderer.setOpaqueSort(sort);
  return sort;
}
