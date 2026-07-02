import { describe, expect, it } from "vitest";

import { MotionPedometer } from "./pedometer";

describe("motion pedometer", () => {
  it("counts a calibrated acceleration peak once", () => {
    const pedometer = new MotionPedometer();

    for (let timestamp = 0; timestamp < 2_000; timestamp += 100) {
      pedometer.observe({ x: 0, y: 0, z: 9.81, timestamp });
    }
    pedometer.observe({ x: 0, y: 0, z: 12.5, timestamp: 2_100 });
    pedometer.observe({ x: 0, y: 0, z: 9.81, timestamp: 2_200 });

    expect(pedometer.steps).toBe(1);
  });

  it("debounces peaks closer than 280 milliseconds", () => {
    const pedometer = new MotionPedometer();

    for (let timestamp = 0; timestamp < 2_000; timestamp += 100) {
      pedometer.observe({ x: 0, y: 0, z: 9.81, timestamp });
    }
    pedometer.observe({ x: 0, y: 0, z: 12.5, timestamp: 2_100 });
    pedometer.observe({ x: 0, y: 0, z: 9.81, timestamp: 2_150 });
    pedometer.observe({ x: 0, y: 0, z: 12.7, timestamp: 2_300 });
    pedometer.observe({ x: 0, y: 0, z: 9.81, timestamp: 2_400 });
    pedometer.observe({ x: 0, y: 0, z: 12.6, timestamp: 2_500 });

    expect(pedometer.steps).toBe(2);
  });
});
