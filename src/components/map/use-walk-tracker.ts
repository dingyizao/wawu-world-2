"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  countGpsSteps,
  haversineDistanceMeters,
  pickupDecision,
  type LocationSample,
} from "../../domain/map-interactions";
import { MotionPedometer } from "../../domain/pedometer";
import type {
  ActiveMapShard,
  StepSource,
  StepSummary,
} from "../../domain/types";

export type WalkTrackerSession = {
  id: string;
  mode: "real" | "training";
};

type MotionPermissionEvent = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const TRAINING_CENTER = {
  longitude: 104.0668,
  latitude: 30.5728,
  accuracy: 5,
};

function geolocationSample(position: GeolocationPosition): LocationSample {
  return {
    longitude: position.coords.longitude,
    latitude: position.coords.latitude,
    accuracy: position.coords.accuracy,
    recordedAt: new Date(position.timestamp).toISOString(),
  };
}

export function useWalkTracker({
  onWalletChange,
}: {
  onWalletChange: (balance: number) => void;
}) {
  const sessionRef = useRef<WalkTrackerSession | null>(null);
  const samplesRef = useRef<LocationSample[]>([]);
  const shardsRef = useRef<ActiveMapShard[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const locationPollTimerRef = useRef<number | null>(null);
  const trainingTimerRef = useRef<number | null>(null);
  const motionFallbackTimerRef = useRef<number | null>(null);
  const motionHandlerRef = useRef<((event: DeviceMotionEvent) => void) | null>(
    null,
  );
  const motionGrantedRef = useRef(false);
  const motionEventSeenRef = useRef(false);
  const pedometerRef = useRef(new MotionPedometer());
  const startTimestampRef = useRef(0);
  const stepsRef = useRef(0);
  const stepSourceRef = useRef<StepSource>("gps-estimate");
  const collectingRef = useRef(new Set<string>());
  const refreshAtRef = useRef(0);
  const lastRefreshSampleRef = useRef<LocationSample | null>(null);

  const [latestSample, setLatestSample] = useState<LocationSample | null>(null);
  const [shards, setShards] = useState<ActiveMapShard[]>([]);
  const [steps, setStepsState] = useState(0);
  const [stepSource, setStepSource] = useState<StepSource>("gps-estimate");
  const [tracking, setTracking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState(
    "开始同行后，碎片会稳定刷新在附近",
  );
  const [collectionLabel, setCollectionLabel] = useState(
    "靠近碎片 25 米并连续定位两次后自动拾取",
  );

  const setSteps = useCallback((value: number) => {
    stepsRef.current = value;
    setStepsState(value);
  }, []);

  const setSource = useCallback((value: StepSource) => {
    stepSourceRef.current = value;
    setStepSource(value);
  }, []);

  const stopSensors = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (locationPollTimerRef.current !== null) {
      window.clearInterval(locationPollTimerRef.current);
      locationPollTimerRef.current = null;
    }
    if (trainingTimerRef.current !== null) {
      window.clearInterval(trainingTimerRef.current);
      trainingTimerRef.current = null;
    }
    if (motionFallbackTimerRef.current !== null) {
      window.clearTimeout(motionFallbackTimerRef.current);
      motionFallbackTimerRef.current = null;
    }
    if (motionHandlerRef.current) {
      window.removeEventListener("devicemotion", motionHandlerRef.current);
      motionHandlerRef.current = null;
    }
    setTracking(false);
  }, []);

  const claimShard = useCallback(
    async (shard: ActiveMapShard, samples: LocationSample[]) => {
      const session = sessionRef.current;
      if (!session || collectingRef.current.has(shard.id)) {
        return;
      }
      collectingRef.current.add(shard.id);
      setCollectionLabel(`正在自动拾取${shard.label}…`);
      try {
        const response = await fetch("/api/map/shards/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            walkId: session.id,
            shardId: shard.id,
            samples: samples.slice(-2),
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "CLAIM_MAP_SHARD_FAILED");
        }
        onWalletChange(body.memoryShards);
        shardsRef.current = shardsRef.current.filter(({ id }) => id !== shard.id);
        setShards(shardsRef.current);
        setCollectionLabel(
          session.mode === "training"
            ? `已自动拾取${shard.label} · 训练所得`
            : `已自动拾取${shard.label}`,
        );
      } catch {
        setCollectionLabel("自动拾取暂时失败，保持靠近后会再次尝试");
      } finally {
        collectingRef.current.delete(shard.id);
      }
    },
    [onWalletChange],
  );

  const refreshNearby = useCallback(async (sample: LocationSample) => {
    const session = sessionRef.current;
    const response = await fetch("/api/map/shards/nearby", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(session ? { walkId: session.id } : {}),
        position: sample,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "REFRESH_MAP_SHARDS_FAILED");
    }
    shardsRef.current = body.shards;
    setShards(body.shards);
    refreshAtRef.current = Date.parse(body.refreshAt);
    lastRefreshSampleRef.current = sample;
    setCollectionLabel("附近碎片已刷新 · 进入 25 米范围会自动拾取");
    return body.shards as ActiveMapShard[];
  }, []);

  const shouldRefreshNearby = useCallback((sample: LocationSample) => {
    const lastRefresh = lastRefreshSampleRef.current;
    return (
      shardsRef.current.length === 0 ||
      Date.now() >= refreshAtRef.current ||
      !lastRefresh ||
      haversineDistanceMeters(sample, lastRefresh) >= 100
    );
  }, []);

  const processSample = useCallback(
    async (sample: LocationSample) => {
      const session = sessionRef.current;
      const nextSamples = [...samplesRef.current, sample].slice(-200);
      samplesRef.current = nextSamples;
      setLatestSample(sample);
      setLocationLabel(
        session?.mode === "training"
          ? "训练路线播放中 · 不代表真实位置"
          : session?.mode === "real"
            ? `真实定位跟随中 · 精度 ±${Math.round(sample.accuracy)} 米`
            : `已刷新到当前位置 · 精度 ±${Math.round(sample.accuracy)} 米`,
      );
      if (session && stepSourceRef.current === "gps-estimate") {
        setSteps(countGpsSteps(nextSamples).steps);
      }
      if (shouldRefreshNearby(sample)) {
        try {
          await refreshNearby(sample);
        } catch {
          setCollectionLabel("附近碎片暂时无法刷新，同行计步仍会继续");
        }
      }
      if (!session) {
        return;
      }
      for (const shard of shardsRef.current) {
        const decision = pickupDecision(nextSamples, shard);
        if (decision.eligible) {
          void claimShard(shard, nextSamples);
        } else if (
          haversineDistanceMeters(sample, shard) <= 25 &&
          decision.reason === "TWO_FIXES_REQUIRED"
        ) {
          setCollectionLabel("已进入拾取范围 · 等待第 2 次定位确认");
        } else if (
          haversineDistanceMeters(sample, shard) <= 25 &&
          decision.reason === "STALE_FIXES"
        ) {
          setCollectionLabel("已进入拾取范围 · 等待新的定位确认");
        }
      }
    },
    [claimShard, refreshNearby, setSteps, shouldRefreshNearby],
  );

  const startMotion = useCallback(() => {
    if (!motionGrantedRef.current || motionHandlerRef.current) {
      return;
    }
    const handler = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (
        acceleration?.x === null ||
        acceleration?.y === null ||
        acceleration?.z === null ||
        acceleration?.x === undefined ||
        acceleration?.y === undefined ||
        acceleration?.z === undefined
      ) {
        return;
      }
      motionEventSeenRef.current = true;
      const value = pedometerRef.current.observe({
        x: acceleration.x,
        y: acceleration.y,
        z: acceleration.z,
        timestamp: event.timeStamp,
      });
      setSteps(value);
    };
    motionHandlerRef.current = handler;
    window.addEventListener("devicemotion", handler);
    motionFallbackTimerRef.current = window.setTimeout(() => {
      if (!motionEventSeenRef.current) {
        if (motionHandlerRef.current) {
          window.removeEventListener(
            "devicemotion",
            motionHandlerRef.current,
          );
          motionHandlerRef.current = null;
        }
        setSource("gps-estimate");
        setSteps(countGpsSteps(samplesRef.current).steps);
      }
    }, 2_000);
  }, [setSource, setSteps]);

  const startLocationPolling = useCallback(() => {
    if (locationPollTimerRef.current !== null) {
      return;
    }
    setTracking(true);
    setLocationLabel("持续定位不可用 · 已切换为前台定位轮询");
    const poll = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void processSample(geolocationSample(position));
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            stopSensors();
            setLocationLabel("定位权限已关闭 · 请在浏览器设置中重新授权");
          }
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      );
    };
    poll();
    locationPollTimerRef.current = window.setInterval(poll, 2_000);
  }, [processSample, stopSensors]);

  const startRealWatch = useCallback(() => {
    if (!sessionRef.current || sessionRef.current.mode !== "real") {
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void processSample(geolocationSample(position));
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          stopSensors();
          setLocationLabel("定位权限已关闭 · 请在浏览器设置中重新授权");
          return;
        }
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        startLocationPolling();
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
    startMotion();
    setTracking(true);
  }, [processSample, startLocationPolling, startMotion, stopSensors]);

  const prepareRealWalk = useCallback(async () => {
    if (!navigator.geolocation || !navigator.geolocation.watchPosition) {
      throw new Error("GEOLOCATION_UNAVAILABLE");
    }
    const MotionEvent = window.DeviceMotionEvent as MotionPermissionEvent | undefined;
    if (MotionEvent) {
      const permission = MotionEvent.requestPermission
        ? await MotionEvent.requestPermission()
        : "granted";
      motionGrantedRef.current = permission === "granted";
    }
    const firstPosition = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        });
      },
    );
    return geolocationSample(firstPosition);
  }, []);

  const refreshLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationLabel("当前浏览器不支持定位");
      return;
    }
    setLocating(true);
    setLocationLabel("正在刷新真实位置…");
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 0,
          });
        },
      );
      await processSample(geolocationSample(position));
    } catch {
      setLocationLabel("定位刷新失败 · 请确认浏览器定位权限已开启");
    } finally {
      setLocating(false);
    }
  }, [processSample]);

  const beginRealWalk = useCallback(
    (session: WalkTrackerSession, firstSample: LocationSample) => {
      stopSensors();
      sessionRef.current = session;
      samplesRef.current = [];
      shardsRef.current = [];
      lastRefreshSampleRef.current = null;
      setShards([]);
      pedometerRef.current = new MotionPedometer();
      motionEventSeenRef.current = false;
      startTimestampRef.current = Date.now();
      setSource(motionGrantedRef.current ? "motion" : "gps-estimate");
      setSteps(0);
      setTracking(true);
      void processSample(firstSample);
      startRealWatch();
    },
    [processSample, setSource, setSteps, startRealWatch, stopSensors],
  );

  const beginTrainingWalk = useCallback(
    async (session: WalkTrackerSession) => {
      stopSensors();
      sessionRef.current = session;
      samplesRef.current = [];
      shardsRef.current = [];
      lastRefreshSampleRef.current = null;
      setShards([]);
      startTimestampRef.current = Date.now();
      setSource("training");
      setSteps(328);
      setTracking(true);
      const initial: LocationSample = {
        ...TRAINING_CENTER,
        recordedAt: new Date().toISOString(),
      };
      await processSample(initial);
      let tick = 0;
      trainingTimerRef.current = window.setInterval(() => {
        tick += 1;
        setSteps(328 + tick * 24);
        const target = shardsRef.current[0];
        const point = target ?? TRAINING_CENTER;
        void processSample({
          longitude: point.longitude,
          latitude: point.latitude,
          accuracy: 5,
          recordedAt: new Date().toISOString(),
        });
      }, 1_200);
    },
    [processSample, setSource, setSteps, stopSensors],
  );

  const finishPayload = useCallback(
    (): { stepSummary: StepSummary; route: LocationSample[] } => ({
      stepSummary: {
        source: stepSourceRef.current,
        sensorSteps: stepsRef.current,
        durationMs: Math.max(0, Date.now() - startTimestampRef.current),
      },
      route: samplesRef.current,
    }),
    [],
  );

  const endWalk = useCallback(() => {
    stopSensors();
    sessionRef.current = null;
    setLatestSample(null);
    shardsRef.current = [];
    lastRefreshSampleRef.current = null;
    setShards([]);
    setLocationLabel("开始同行后，碎片会稳定刷新在附近");
    setCollectionLabel("靠近碎片 25 米并连续定位两次后自动拾取");
  }, [stopSensors]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!sessionRef.current || sessionRef.current.mode !== "real") {
        return;
      }
      if (document.hidden) {
        stopSensors();
        setLocationLabel("页面在后台，定位与计步已暂停");
      } else {
        startRealWatch();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopSensors();
    };
  }, [startRealWatch, stopSensors]);

  return {
    latestSample,
    shards,
    steps,
    stepSource,
    tracking,
    locating,
    locationLabel,
    collectionLabel,
    refreshLocation,
    prepareRealWalk,
    beginRealWalk,
    beginTrainingWalk,
    finishPayload,
    endWalk,
  };
}

export type WalkTracker = ReturnType<typeof useWalkTracker>;
