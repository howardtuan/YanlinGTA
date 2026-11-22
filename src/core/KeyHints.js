// Key hints that read differently on a gamepad: dual(kbHTML, padHTML). padHTML may contain {A}, {RT},
// {L} (left stick) ... tokens; src/ui/Prompts.js turns them into the connected controller's button glyphs.
// Kept in core/ so that systems/ and entities/ can write hints without importing the ui layer.
export function dual(kb, pad) {
  return `<span class="kb-only">${kb}</span><span class="pad-only">${pad.replace(/\{(\w+)\}/g, (_, n) => `<kbd data-pb="${n}"></kbd>`)}</span>`;
}
