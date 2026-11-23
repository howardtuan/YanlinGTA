// Node module hook: the game imports three.js by its bare name ('three', 'three/addons/...').
// With node_modules installed (npm ci) node resolves both by itself. Without it, 'three' falls back to the copy in
// vendor/ so a clear message can say what is missing ('three/addons/*' is not vendored).
const THREE_URL = new URL('../../../vendor/three.module.js', import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three' || specifier.startsWith('three/')) {
    try {
      return await nextResolve(specifier, context);
    } catch (e) {
      if (specifier === 'three') return { url: THREE_URL, shortCircuit: true };
      throw new Error(
        `找不到 ${specifier}：請先在 repo 根目錄執行 npm ci（平面圖工具要用 node_modules 裡的 three）`
      );
    }
  }
  return nextResolve(specifier, context);
}

// Builders that the game keeps private to a big module (e.g. buildMcD in src/world/Interiors.js) are exported for the
// plan tool here, so the game's files stay untouched: a settings file asks for them with env.gamePrivate().
export async function load(url, context, nextLoad) {
  const r = await nextLoad(url, context);
  const m = /[?&]fp-export=([\w,]+)/.exec(url);
  if (m && r.source != null)
    return { ...r, source: `${r.source}\nexport { ${m[1].split(',').join(', ')} };\n` };
  return r;
}
