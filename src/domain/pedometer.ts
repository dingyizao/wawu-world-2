export type MotionSample = {
  x: number;
  y: number;
  z: number;
  timestamp: number;
};

export class MotionPedometer {
  private firstTimestamp: number | null = null;
  private gravity = 9.81;
  private lastStepTimestamp = Number.NEGATIVE_INFINITY;
  private aboveThreshold = false;
  private stepCount = 0;

  get steps() {
    return this.stepCount;
  }

  observe(sample: MotionSample) {
    this.firstTimestamp ??= sample.timestamp;
    const magnitude = Math.hypot(sample.x, sample.y, sample.z);
    this.gravity = this.gravity * 0.9 + magnitude * 0.1;
    const linearAcceleration = Math.abs(magnitude - this.gravity);
    const calibrated = sample.timestamp - this.firstTimestamp >= 2_000;
    const aboveThreshold = linearAcceleration >= 1.1;

    if (
      calibrated &&
      aboveThreshold &&
      !this.aboveThreshold &&
      sample.timestamp - this.lastStepTimestamp >= 280
    ) {
      this.stepCount += 1;
      this.lastStepTimestamp = sample.timestamp;
    }
    this.aboveThreshold = aboveThreshold;
    return this.stepCount;
  }
}
