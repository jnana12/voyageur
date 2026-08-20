"use client";

import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Maximize, Loader2 } from "lucide-react";
import { cn } from "@/utils/index";

// === TomTom API Key ===
const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || "INSERT_TOMTOM_KEY_HERE";

// === Map Context ===
type MapContextValue = {
  map: tt.Map | null;
  isLoaded: boolean;
};

const MapContext = createContext<MapContextValue | null>(null);

function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a Map component");
  }
  return context;
}

// === Default Loader ===
const DefaultLoader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
  </div>
);

// === Map Props ===
type MapProps = {
  children?: ReactNode;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  theme?: "light" | "dark"; // dark uses layer-basic-dark style
  attributionControl?: boolean;
} & Omit<tt.MapOptions, "container" | "key">;

type MapRef = tt.Map;

// === Map Component ===
const Map = forwardRef<MapRef, MapProps>(function Map(
  { children, center = [0, 0], zoom = 2, theme = "dark", attributionControl = true, ...props },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<tt.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useImperativeHandle(ref, () => mapInstance as tt.Map, [mapInstance]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = tt.map({
      key: TOMTOM_API_KEY,
      container: containerRef.current,
      center: center,
      zoom: zoom,
      stylesVisibility: {
        trafficFlow: false,
        trafficIncidents: false,
      },
      // @ts-ignore
      attributionControl: attributionControl,
      ...props,
    });

    map.on("load", () => {
      setIsLoaded(true);
    });

    setMapInstance(map);

    return () => {
      map.remove();
      setIsLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center/zoom if props change
  useEffect(() => {
    if (mapInstance && isLoaded) {
      mapInstance.setCenter(center);
      mapInstance.setZoom(zoom);
    }
  }, [mapInstance, isLoaded, center, zoom]);

  const contextValue = useMemo(
    () => ({
      map: mapInstance,
      isLoaded,
    }),
    [mapInstance, isLoaded]
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className="relative w-full h-full"
        style={theme === "dark" ? {
          filter: "invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1)",
        } : undefined}
      >
        {!isLoaded && <DefaultLoader />}
        {mapInstance && isLoaded && children}
      </div>
    </MapContext.Provider>
  );
});

// === Marker Context ===
type MarkerContextValue = {
  marker: tt.Marker;
  map: tt.Map | null;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error("Marker components must be used within MapMarker");
  }
  return context;
}

// === MapMarker Props ===
type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children: ReactNode;
  onClick?: (e: MouseEvent) => void;
};

function MapMarker({ longitude, latitude, children, onClick }: MapMarkerProps) {
  const { map, isLoaded } = useMap();
  const markerRef = useRef<tt.Marker | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (longitude == null || latitude == null || isNaN(longitude) || isNaN(latitude)) {
      console.warn("MapMarker: Invalid coordinates avoided", { longitude, latitude });
      return;
    }

    const el = document.createElement("div");
    el.style.cursor = "pointer";
    elementRef.current = el;

    const marker = new tt.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markerRef.current = marker;

    if (onClick) {
      el.addEventListener("click", onClick);
    }

    setIsReady(true);

    return () => {
      if (onClick) {
        el.removeEventListener("click", onClick);
      }
      marker.remove();
      markerRef.current = null;
      elementRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  // Update position
  useEffect(() => {
    if (markerRef.current && longitude != null && latitude != null && !isNaN(longitude) && !isNaN(latitude)) {
      markerRef.current.setLngLat([longitude, latitude]);
    }
  }, [longitude, latitude]);

  const contextValue = useMemo(
    () => ({
      marker: markerRef.current!,
      map,
    }),
    [map]
  );

  if (!isReady || !elementRef.current) return null;

  return (
    <MarkerContext.Provider value={contextValue}>
      {createPortal(children, elementRef.current)}
    </MarkerContext.Provider>
  );
}

// === MarkerContent ===
function MarkerContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-center", className)}>{children}</div>;
}

// === MarkerPopup (Placeholder) ===
function MarkerPopup({ children }: { children: ReactNode }) {
  // Full popup implementation would require TomTom Popup API
  // For now, this is a placeholder
  return null;
}

// === MarkerTooltip (Placeholder) ===
function MarkerTooltip({ children }: { children: ReactNode }) {
  return null;
}

// === MarkerLabel (Placeholder) ===
function MarkerLabel({ children }: { children: ReactNode }) {
  return null;
}

// === MapPopup (Placeholder) ===
function MapPopup({ children }: { children: ReactNode }) {
  return null;
}

// === MapRoute Props ===
type MapRouteProps = {
  id?: string;
  coordinates: [number, number][]; // [lng, lat][]
  color?: string;
  width?: number;
  opacity?: number;
  dashArray?: [number, number];
};

function MapRoute({
  id: propId,
  coordinates,
  color = "#ef4444",
  width = 4,
  opacity = 1,
  dashArray,
}: MapRouteProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;
  const [styleReady, setStyleReady] = useState(false);

  // Wait for style to be loaded
  useEffect(() => {
    if (!map || !isLoaded) return;

    const checkStyle = () => {
      if ((map as any).isStyleLoaded?.()) {
        setStyleReady(true);
      }
    };

    checkStyle();
    (map as any).on?.('style.load', checkStyle);

    return () => {
      (map as any).off?.('style.load', checkStyle);
    };
  }, [map, isLoaded]);

  useEffect(() => {
    // Wait for map and style to be fully ready
    if (!isLoaded || !map || !styleReady) return;
    if (typeof map.getSource !== 'function' || typeof map.getLayer !== 'function') {
      console.warn("MapRoute: map methods not available yet");
      return;
    }

    try {
      // Add source
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coordinates,
            },
          },
        });
      }

      // Add layer
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": color,
            "line-width": width,
            "line-opacity": opacity,
            ...(dashArray && { "line-dasharray": dashArray }),
          },
        });
      }
    } catch (e) {
      console.warn("MapRoute: Error adding source/layer", e);
    }

    return () => {
      try {
        if (map && typeof map.getLayer === 'function' && map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map && typeof map.getSource === 'function' && map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (e) {
        // Silently ignore cleanup errors - map may already be destroyed
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, styleReady, sourceId, layerId]);

  // Update data on coordinate change
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (typeof map.getSource !== 'function') return;

    try {
      const source = map.getSource(sourceId);
      if (source && "setData" in source) {
        (source as any).setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        });
      }
    } catch (e) {
      // Silently ignore - source may not exist yet
    }
  }, [isLoaded, map, coordinates, sourceId]);

  // Update paint properties
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (typeof map.getLayer !== 'function') return;

    try {
      if (!map.getLayer(layerId)) return;

      map.setPaintProperty(layerId, "line-color", color);
      map.setPaintProperty(layerId, "line-width", width);
      map.setPaintProperty(layerId, "line-opacity", opacity);
      if (dashArray) {
        map.setPaintProperty(layerId, "line-dasharray", dashArray);
      }
    } catch (e) {
      // Silently ignore paint errors
    }
  }, [isLoaded, map, layerId, color, width, opacity, dashArray]);

  return null;
}

// === MapControls ===
type MapControlsProps = {
  showZoom?: boolean;
  showLocate?: boolean;
  showCompass?: boolean;
  showFullscreen?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

function MapControls({
  showZoom = true,
  showLocate = true,
  showCompass = false,
  showFullscreen = false,
  position = "bottom-right",
}: MapControlsProps) {
  const { map, isLoaded } = useMap();
  const containerRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-right": "bottom-2 right-2",
  };

  const handleZoomIn = () => (map as any)?.zoomIn?.();
  const handleZoomOut = () => (map as any)?.zoomOut?.();

  const handleLocate = () => {
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        (map as any).flyTo?.({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
        });
      },
      (err) => console.warn("Geolocation error:", err)
    );
  };

  const handleFullscreen = () => {
    const el = containerRef.current?.closest(".relative");
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  if (!isLoaded) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute z-10 flex flex-col gap-1 p-1 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg",
        positionClasses[position]
      )}
    >
      {showZoom && (
        <>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/10 rounded transition-colors text-white"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/10 rounded transition-colors text-white"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </>
      )}
      {showLocate && (
        <button
          onClick={handleLocate}
          className="p-2 hover:bg-white/10 rounded transition-colors text-white"
          aria-label="Locate"
        >
          <Locate className="w-4 h-4" />
        </button>
      )}
      {showFullscreen && (
        <button
          onClick={handleFullscreen}
          className="p-2 hover:bg-white/10 rounded transition-colors text-white"
          aria-label="Fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// === MapClusterLayer (Placeholder) ===
function MapClusterLayer<P = any>(props: any) {
  // Clustering requires more complex TomTom setup
  return null;
}

// === Exports ===
export {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MarkerLabel,
  MapPopup,
  MapControls,
  MapRoute,
  MapClusterLayer,
};

export type { MapRef };
