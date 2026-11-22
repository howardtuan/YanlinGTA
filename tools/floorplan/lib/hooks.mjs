// Node module hook: the game imports three.js by its bare name (index.html maps it with an import map).
// Here the same name is pointed at vendor/three.module.js so js/*.js load in node unchanged.
const THREE_URL = new URL('../../../vendor/three.module.js', import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: THREE_URL, shortCircuit: true };
  return nextResolve(specifier, context);
}
