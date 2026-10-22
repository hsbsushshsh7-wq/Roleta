import { describe, expect, it } from "vitest";
import {
  normalize,
  planSpin,
  pointedIndex,
  uniformIndex,
  displayedIndex,
} from "../src/engine/draw";
import { wheelPaths } from "../src/engine/wheelGeometry";
function words(value: number): [number, number] {
  return [Math.floor(value / 4294967296), value >>> 0];
}
describe("unbiased random selection", () => {
  it("rejects a modulo-biased sample at the top of the 53-bit space", () => {
    let calls = 0;
    const index = uniformIndex(3, () => {
      calls++;
      return calls === 1 ? [0x1fffff, 0xffffffff] : [0, 5];
    });
    expect(calls).toBe(2);
    expect(index).toBe(2);
  });
  it.each([1, 4, 10, 400, 10000, 4294967300, Number.MAX_SAFE_INTEGER])(
    "reaches endpoints for %s choices",
    (count) => {
      expect(uniformIndex(count, () => [0, 0])).toBe(0);
      expect(uniformIndex(count, () => words(count - 1))).toBe(count - 1);
    },
  );
  it("fails safely for an empty or invalid wheel", () => {
    for (const count of [0, -2, 1.2, Infinity])
      expect(() => uniformIndex(count, () => [0, 0])).toThrow();
  });
  it("stops if the random provider never returns an accepted sample", () => {
    expect(() => uniformIndex(3, () => [0x1fffff, 0xffffffff])).toThrow();
  });
  it("samples all 400 characters without index bias", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) seen.add(uniformIndex(400, () => words(i)));
    expect(seen.size).toBe(400);
  });
});
describe("right-side pointer alignment", () => {
  it.each([1, 2, 4, 10, 13, 24, 400, 720, 721, 10000])(
    "aligns every index for a wheel with %s entries",
    (count) => {
      const source = { count, label: (i: number) => `Option ${i}` };
      for (let i = 0; i < count; i++) {
        const plan = planSpin(source, 359.92, () => words(i));
        expect(plan.index).toBe(i);
        expect(plan.value).toBe(`Option ${i}`);
        expect(plan.angle).toBeGreaterThan(359.92 + 7 * 360 - 0.001);
        expect(pointedIndex(plan.angle, plan.displayCount)).toBe(
          plan.visualIndex,
        );
        expect(plan.visualIndex).toBe(
          displayedIndex(i, count, plan.displayCount),
        );
      }
    },
  );
  it("keeps alignment over repeated rotations", () => {
    let angle = 0;
    for (let i = 0; i < 800; i++) {
      const p = planSpin({ count: 400, label: String }, angle, () => words(i));
      expect(pointedIndex(p.angle, 400)).toBe(p.index);
      angle = normalize(p.angle);
    }
  });
  it("excludes only the previous option and reaches all others", () => {
    const results = Array.from(
      { length: 9 },
      (_, i) =>
        planSpin({ count: 10, label: String }, 0, () => words(i), 4).index,
    );
    expect(results).toEqual([0, 1, 2, 3, 5, 6, 7, 8, 9]);
    expect(
      planSpin({ count: 1, label: String }, 0, () => words(0), 0).index,
    ).toBe(0);
  });
  it("batches 400 wedges into 12 SVG paths", () => {
    const paths = wheelPaths(400);
    expect(paths).toHaveLength(12);
    expect(paths.join("").match(/M150 150/g)?.length).toBe(400);
  });
});
