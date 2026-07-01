type AMapMap = {
  add: (overlay: unknown) => void;
  destroy: () => void;
  remove: (overlay: unknown | unknown[]) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
};

type AMapMarker = {
  on: (event: "click", handler: () => void) => void;
  setMap: (map: AMapMap | null) => void;
  setPosition: (position: [number, number]) => void;
};

type AMapNamespace = {
  Map: new (
    container: HTMLElement,
    options: {
      center: [number, number];
      zoom: number;
      mapStyle?: string;
      viewMode?: "2D" | "3D";
    },
  ) => AMapMap;
  Marker: new (options: {
    position: [number, number];
    content?: HTMLElement;
    offset?: unknown;
    anchor?: string;
    title?: string;
    zIndex?: number;
  }) => AMapMarker;
  Pixel: new (x: number, y: number) => unknown;
};

declare global {
  interface Window {
    _AMapSecurityConfig?: { serviceHost: string };
    AMapLoader?: {
      load: (options: {
        key: string;
        version: "2.0";
        plugins: string[];
      }) => Promise<AMapNamespace>;
    };
  }
}

let loadingPromise: Promise<AMapNamespace> | null = null;

function loadLoaderScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.AMapLoader) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-wawu-amap-loader="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("AMAP_LOADER_FAILED")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://webapi.amap.com/loader.js";
    script.async = true;
    script.dataset.wawuAmapLoader = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("AMAP_LOADER_FAILED")), {
      once: true,
    });
    document.head.append(script);
  });
}

export function loadAmap(key: string) {
  if (!key) {
    return Promise.reject(new Error("AMAP_CLIENT_CONFIG_MISSING"));
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  window._AMapSecurityConfig = {
    serviceHost: `${window.location.origin}/_AMapService`,
  };
  loadingPromise = loadLoaderScript().then(() => {
    if (!window.AMapLoader) {
      throw new Error("AMAP_LOADER_FAILED");
    }
    return window.AMapLoader.load({
      key,
      version: "2.0",
      plugins: [],
    });
  });
  return loadingPromise;
}

export type { AMapMap, AMapMarker, AMapNamespace };
