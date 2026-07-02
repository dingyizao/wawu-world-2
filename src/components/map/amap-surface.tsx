"use client";

import { useEffect, useRef, useState } from "react";

import { companionPositionFromUser } from "../../domain/map-interactions";
import type { ActiveMapShard } from "../../domain/types";
import { convertGpsPoint } from "./amap-coordinates";
import {
  loadAmap,
  type AMapMap,
  type AMapMarker,
  type AMapNamespace,
} from "./amap-loader";
import { FallbackMap } from "./fallback-map";
import type { WalkTracker } from "./use-walk-tracker";

const CHENGDU_CENTER: [number, number] = [104.0668, 30.5728];

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

function shardContent(shard: ActiveMapShard) {
  const element = document.createElement("div");
  element.className = "amap-shard-marker";
  element.setAttribute("aria-label", `${shard.label}，靠近后自动拾取`);
  element.innerHTML = `
    <img alt="" src="/assets/generated/map/memory-shard-glow.png" />
    <span>+${shard.amount}</span>
  `;
  return element;
}

export function AmapSurface({
  amapJsKey,
  companionName,
  tracker,
  walkAssetPath,
}: {
  amapJsKey: string;
  companionName: string;
  tracker: WalkTracker;
  walkAssetPath: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const amapRef = useRef<AMapNamespace | null>(null);
  const playerMarkerRef = useRef<AMapMarker | null>(null);
  const companionMarkerRef = useRef<AMapMarker | null>(null);
  const shardMarkersRef = useRef<AMapMarker[]>([]);
  const [mode, setMode] = useState<"loading" | "real" | "fallback">("loading");

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
        setMode("real");
      })
      .catch(() => {
        if (!cancelled) {
          setMode("fallback");
        }
      });

    return () => {
      cancelled = true;
      shardMarkersRef.current.forEach((marker) => marker.setMap(null));
      shardMarkersRef.current = [];
      map?.destroy();
      mapRef.current = null;
      amapRef.current = null;
      playerMarkerRef.current = null;
      companionMarkerRef.current = null;
    };
  }, [amapJsKey, companionName, walkAssetPath]);

  useEffect(() => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (mode !== "real" || !AMap || !map || !tracker.latestSample) {
      return;
    }
    let cancelled = false;
    convertGpsPoint(AMap, tracker.latestSample)
      .then((point) => {
        if (cancelled) {
          return;
        }
        const companion = companionPositionFromUser(point);
        const userCenter: [number, number] = [
          point.longitude,
          point.latitude,
        ];
        playerMarkerRef.current?.setPosition(userCenter);
        companionMarkerRef.current?.setPosition([
          companion.longitude,
          companion.latitude,
        ]);
        map.setCenter(userCenter);
        map.setZoom(17);
      })
      .catch(() => {
        if (!cancelled) {
          setMode("fallback");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, tracker.latestSample]);

  useEffect(() => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (mode !== "real" || !AMap || !map) {
      return;
    }
    let cancelled = false;
    shardMarkersRef.current.forEach((marker) => marker.setMap(null));
    shardMarkersRef.current = [];
    Promise.all(
      tracker.shards.map(async (shard) => ({
        shard,
        point: await convertGpsPoint(AMap, shard),
      })),
    )
      .then((converted) => {
        if (cancelled) {
          return;
        }
        const markers = converted.map(({ point, shard }) =>
          new AMap.Marker({
            position: [point.longitude, point.latitude],
            content: shardContent(shard),
            offset: new AMap.Pixel(-24, -48),
            title: shard.label,
            zIndex: 80,
          }),
        );
        shardMarkersRef.current = markers;
        map.add(markers);
      })
      .catch(() => {
        if (!cancelled) {
          setMode("fallback");
        }
      });
    return () => {
      cancelled = true;
      shardMarkersRef.current.forEach((marker) => marker.setMap(null));
      shardMarkersRef.current = [];
    };
  }, [mode, tracker.shards]);

  if (mode === "fallback") {
    return (
      <div className="amap-wrap">
        <FallbackMap />
        <button
          className="map-locate-button"
          disabled={tracker.locating}
          onClick={() => void tracker.refreshLocation()}
          type="button"
        >
          {tracker.locating ? "定位中…" : "刷新定位"}
        </button>
        <span className="map-location-label">{tracker.locationLabel}</span>
        <span className="map-shard-label">{tracker.collectionLabel}</span>
      </div>
    );
  }

  return (
    <div className="amap-wrap">
      <div className="amap-surface" ref={containerRef} />
      {mode === "loading" ? (
        <div className="map-loading">正在铺开城市地图…</div>
      ) : (
        <>
          <span className="map-mode-chip map-mode-chip--real">高德真实地图</span>
          <button
            className="map-locate-button"
            disabled={tracker.locating}
            onClick={() => void tracker.refreshLocation()}
            type="button"
          >
            {tracker.locating ? "定位中…" : "刷新定位"}
          </button>
          <span className="map-location-label">{tracker.locationLabel}</span>
          <span className="map-shard-label">{tracker.collectionLabel}</span>
        </>
      )}
    </div>
  );
}
