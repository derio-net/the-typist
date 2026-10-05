import fixtureYaml from '../../tests/fixtures/lists/two-records.yaml?raw';
import { parseList } from '../schema';
import { createKeyboard } from '../platform/keyboard';
import { advance, createWorld, typeChar, type World, type WorldEvent } from '../engine/world';
import { createRenderer } from '../render/renderer';

/** Dev-only play page: one wave of the two-record fixture (`/?dev=fixture`). */
export function startFixture(root: HTMLElement): void {
  const res = parseList(fixtureYaml);
  if (!res.ok) {
    root.textContent = res.errors.join('\n');
    return;
  }
  root.textContent = '';
  const canvas = document.createElement('canvas');
  const input = document.createElement('input');
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'typing input');
  input.style.cssText = 'position:absolute;opacity:0;left:0;top:0;width:1px;height:1px';
  root.append(canvas, input);
  input.focus();
  canvas.addEventListener('click', () => input.focus());

  const renderer = createRenderer(canvas);
  let world: World = createWorld(res.list.records, { measure: renderer.measure });
  const queue: WorldEvent[] = [];
  createKeyboard(input, (c) => {
    world = typeChar(world, c);
    queue.push(...world.events);
  });

  let last = performance.now();
  const frame = (now: number) => {
    const next = advance(world, Math.min(now - last, 250));
    last = now;
    world = next;
    queue.push(...world.events);
    renderer.push(queue.splice(0), now);
    renderer.draw(world, now);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
