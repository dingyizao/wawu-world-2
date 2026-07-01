"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  companionPositionFromUser,
  createMemoryShardRefresh,
  type MapPoint,
  type MemoryShardSpawn,
} from "../../domain/map-interactions";
import { loadAmap, type AMapMap, type AMapMarker, type AMapNamespace } from "./amap-loader";
import { FallbackMap } from "./fallback-map";

const CHENGDU_CENTER: [number, number] = [104.0668, 30.5728];
const INITIAL_SHARDS = createMemoryShardRefresh({
  center: { longitude: CHENGDU_CENTER[0], latitude: CHENGDU_CENTER[1] },
  seed: "initial",
});

function markerContent(className: string, imagePath?: string) {
  const element = document.createElement("div");
  element.className = className;
  if (imagePath) {
    const image = document.createElement("img");
    image.alt = "";
    image.src = imagePath;
    element.append(image);
  }
  return element;
}

function shardContent(shard: MemoryShardSpawn) {
  const element = document.createElement("button");
  element.className = "amap-shard-marker";
  element.type = "button";
  element.setAttribute("aria-label", `拾取${shard.label}`);
  element.innerHTML = `
    <img alt="" src="/assets/generated/map/memory-shard-glow.png" />
    <span>+${shard.amount}</span>
  `;
  return element;
}

export function AmapSurface({
  amapJsKey,
  companionName,
  onWalletChange,
  walkAssetPath,
}: {
  amapJsKey: string;
  companionName: string;
  onWalletChange: (balance: number) => void;
  walkAssetPath: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const amapRef = useRef<AMapNamespace | null>(null);
  const playerMarkerRef = useRef<AMapMarker | null>(null);
  const companionMarkerRef = useRef<AMapMarker | null>(null);
  const shardMarkersRef = useRef<AMapMarker[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const hasLiveLocationRef = useRef(false);
  const latestCenterRef = useRef<MapPoint>({
    longitude: CHENGDU_CENTER[0],
    latitude: CHENGDU_CENTER[1],
  });
  const [mode, setMode] = useState<"loading" | "real" | "fallback">("loading");
  const [locationLabel, setLocationLabel] = useState("成都 · 等待定位");
  const [following, setFollowing] = useState(false);
  const [shards, setShards] = useState<MemoryShardSpawn[]>(INITIAL_SHARDS);
  const [collectingShardId, setCollectingShardId] = useState<string | null>(null);
  const [collectionLabel, setCollectionLabel] = useState("地图上会随机刷新可拾取的记忆碎片");

  useEffect(() => {
    let cancelled = false;
    let map: AMapMap | null = null;

    loadAmap(amapJsKey)
      .then((AMap) => {
        if (cancelled || !containerRef.current) {
          return;
        }
        map = new AMap.Map(containerRef.current, {
          center: CHENGDU_CENTER,
          zoom: 15,
          viewMode: "2D",
        });
        mapRef.current = map;
        amapRef.current = AMap;

        const playerMarker = new AMap.Marker({
          position: CHENGDU_CENTER,
          content: markerContent("amap-player-marker"),
          offset: new AMap.Pixel(-18, -18),
          title: "我",
        });
        const companionMarker = new AMap.Marker({
          position: CHENGDU_CENTER,
          content: markerContent("amap-companion-marker", walkAssetPath),
          offset: new AMap.Pixel(12, -42),
          title: companionName,
        });
        playerMarkerRef.current = playerMarker;
        companionMarkerRef.current = companionMarker;
        map.add([playerMarker, companionMarker]);
        if (!cancelled) {
          setMode("real");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMode("fallback");
        }
      });

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      shardMarkersRef.current.forEach((marker) => marker.setMap(null));
      shardMarkersRef.current = [];
      map?.destroy();
      mapRef.current = null;
      amapRef.current = null;
      playerMarkerRef.current = null;
      companionMarkerRef.current = null;
    };
  }, [amapJsKey, companionName, walkAssetPath]);

  const collectShard = useCallback(async (shard: MemoryShardSpawn) => {
    if (collectingShardId) {
      return;
    }
    setCollectingShardId(shard.id);
    setCollectionLabel(`正在拾取${shard.label}…`);
    try {
      const response = await fetch("/api/map/shards/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shardId: shard.id,
          amount: shard.amount,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "CLAIM_MAP_SHARD_FAILED");
      }
      onWalletChange(body.memoryShards);
      setShards((current) => current.filter(({ id }) => id !== shard.id));
      setCollectionLabel(`已拾取${shard.label}，新的余额已更新`);
    } catch {
      setCollectionLabel("这枚碎片暂时没有收好，请稍后再试");
    } finally {
      setCollectingShardId(null);
    }
  }, [collectingShardId, onWalletChange]);

  useEffect(() => {
    if (mode !== "real" || !mapRef.current || !amapRef.current) {
      return;
    }
    const map = mapRef.current;
    const AMap = amapRef.current;
    shardMarkersRef.current.forEach((marker) => marker.setMap(null));
    const markers = shards.map((shard) => {
      const marker = new AMap.Marker({
        position: [shard.longitude, shard.latitude],
        content: shardContent(shard),
        offset: new AMap.Pixel(-24, -48),
        title: shard.label,
        zIndex: 80,
      });
      marker.on("click", () => {
        void collectShard(shard);
      });
      return marker;
    });
    shardMarkersRef.current = markers;
    map.add(markers);

    return () => {
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [mode, shards, collectShard]);

  useEffect(() => {
    if (mode !== "real") {
      return;
    }
    const timer = window.setInterval(() => {
      setShards(
        createMemoryShardRefresh({
          center: latestCenterRef.current,
          seed: `${Date.now()}`,
        }),
      );
      setCollectionLabel("新的记忆碎片已刷新在你附近");
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [mode]);

  function updateLivePosition(position: MapPoint) {
    latestCenterRef.current = position;
    const companion = companionPositionFromUser(position);
    const userCenter: [number, number] = [position.longitude, position.latitude];
    const companionCenter: [number, number] = [
      companion.longitude,
      companion.latitude,
    ];
    playerMarkerRef.current?.setPosition(userCenter);
    companionMarkerRef.current?.setPosition(companionCenter);
    mapRef.current?.setCenter(userCenter);
    mapRef.current?.setZoom(17);
    setLocationLabel("真实定位跟随中 · 用户移动时光点会同步变化");
  }

  function stopFollowing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setFollowing(false);
    setLocationLabel("定位跟随已暂停 · 地图保留最后位置");
  }

  function locate() {
    if (following) {
      stopFollowing();
      return;
    }
    if (!navigator.geolocation || !navigator.geolocation.watchPosition || !mapRef.current) {
      setLocationLabel("浏览器不支持持续定位 · 可继续浏览地图");
      return;
    }
    setFollowing(true);
    setLocationLabel("正在请求真实位置并开启跟随…");
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const center = {
          longitude: coords.longitude,
          latitude: coords.latitude,
        };
        updateLivePosition(center);
        if (!hasLiveLocationRef.current) {
          hasLiveLocationRef.current = true;
          setShards(
            createMemoryShardRefresh({
              center,
              seed: `${Math.round(coords.longitude * 10000)}-${Math.round(coords.latitude * 10000)}`,
            }),
          );
        }
      },
      () => {
        stopFollowing();
        setLocationLabel("定位未授权或暂时不可用 · 可继续浏览地图");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 },
    );
  }

  if (mode === "fallback") {
    return <FallbackMap />;
  }

  return (
    <div className="amap-wrap">
      <div className="amap-surface" ref={containerRef} />
      {mode === "loading" ? (
        <div className="map-loading">正在铺开城市地图…</div>
      ) : (
        <>
          <span className="map-mode-chip map-mode-chip--real">高德真实地图</span>
          <button className="map-locate-button" onClick={locate} type="button">
            {following ? "停止定位跟随" : "开启定位跟随"}
          </button>
          <span className="map-location-label">{locationLabel}</span>
          <span className="map-shard-label">{collectionLabel}</span>
        </>
      )}
    </div>
  );
}
