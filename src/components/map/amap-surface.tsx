"use client";

import { useEffect, useRef, useState } from "react";

import { loadAmap, type AMapMap } from "./amap-loader";
import { FallbackMap } from "./fallback-map";

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

export function AmapSurface({
  companionName,
  walkAssetPath,
}: {
  companionName: string;
  walkAssetPath: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const [mode, setMode] = useState<"loading" | "real" | "fallback">("loading");
  const [locationLabel, setLocationLabel] = useState("成都 · 等待定位");

  useEffect(() => {
    let cancelled = false;
    let map: AMapMap | null = null;

    loadAmap()
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
      map?.destroy();
      mapRef.current = null;
    };
  }, [companionName, walkAssetPath]);

  function locate() {
    if (!navigator.geolocation || !mapRef.current) {
      setMode("fallback");
      return;
    }
    setLocationLabel("正在确认你的位置…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const center: [number, number] = [coords.longitude, coords.latitude];
        mapRef.current?.setCenter(center);
        mapRef.current?.setZoom(17);
        setLocationLabel("真实定位已开启 · 分身使用视觉偏移同行");
      },
      () => {
        setLocationLabel("定位未授权 · 可继续浏览地图");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
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
            开启定位同行
          </button>
          <span className="map-location-label">{locationLabel}</span>
        </>
      )}
    </div>
  );
}
