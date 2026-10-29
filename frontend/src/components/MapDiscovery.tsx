import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Radio,
  LocateFixed,
  ShieldCheck,
  Star,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Zap,
  Wrench,
  Sparkles,
  Car,
  Camera,
  Layers,
} from 'lucide-react';
import { ProviderProfile } from '../types';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  isLiveTracking?: boolean;
}

interface MapDiscoveryProps {
  providers: ProviderProfile[];
  userLocation: UserLocation | null;
  onLocationSelect: (lat: number, lng: number, accuracy?: number) => void;
  selectedCity?: string;
  onProviderSelect?: (provider: ProviderProfile) => void;
  isLiveTracking?: boolean;
  onToggleLiveTracking?: () => void;
  onLocateMe?: () => void;
  gpsLoading?: boolean;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  Adama: [8.54, 39.27],
  Bishoftu: [8.75, 38.98],
  'Addis Ababa': [9.02, 38.74],
};

// Haversine distance calculator in kilometers
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Normalize coordinates between GeoJSON [lng, lat] and Leaflet [lat, lng]
export const normalizeCoordinates = (coords?: [number, number]): [number, number] | null => {
  if (!coords || coords.length !== 2) return null;
  const [c0, c1] = coords;
  if (isNaN(c0) || isNaN(c1)) return null;

  // Ethiopia geographic bounds: Latitude ~3°-15°N, Longitude ~33°-48°E
  if (c0 > 25 && c1 < 20) {
    // GeoJSON format [lng, lat] -> convert to Leaflet [lat, lng]
    return [c1, c0];
  }
  if (c1 > 25 && c0 < 20) {
    // Already in [lat, lng] format
    return [c0, c1];
  }
  return [c0, c1];
};

export const MapDiscovery: React.FC<MapDiscoveryProps> = ({
  providers,
  userLocation,
  onLocationSelect,
  selectedCity = 'Adama',
  onProviderSelect,
  isLiveTracking = false,
  onToggleLiveTracking,
  onLocateMe,
  gpsLoading = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const [activeProvider, setActiveProvider] = useState<ProviderProfile | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Initialize Leaflet Map once container is mounted
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : CITY_COORDINATES[selectedCity] || [8.54, 39.27];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: userLocation ? 14 : 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Interactive Click-to-Place Pin: Customer can click anywhere on the map to set their exact location
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickedLat = Number(e.latlng.lat.toFixed(6));
      const clickedLng = Number(e.latlng.lng.toFixed(6));
      onLocationSelect(clickedLat, clickedLng, 10);
      setCopiedNotification(`Location set to [${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}]`);
      setTimeout(() => setCopiedNotification(null), 3000);
    });

    // Calibration ticks for proper tile rendering across all device viewports
    const timers = [
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 100),
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 300),
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 800),
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 1500),
    ];

    const handleResize = () => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  // Recenter when selectedCity changes (if no manual userLocation active)
  useEffect(() => {
    if (mapInstanceRef.current && !userLocation && selectedCity && CITY_COORDINATES[selectedCity]) {
      mapInstanceRef.current.flyTo(CITY_COORDINATES[selectedCity], 13, { duration: 1 });
    }
  }, [selectedCity, userLocation]);

  // Render Customer Live Radar Marker & GPS Accuracy Ring
  const renderUserMarker = useCallback((loc: UserLocation) => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    if (userMarkerRef.current) {
      markersGroupRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (accuracyCircleRef.current) {
      markersGroupRef.current.removeLayer(accuracyCircleRef.current);
      accuracyCircleRef.current = null;
    }

    // Accuracy Circle
    const accuracy = loc.accuracy || 15;
    if (accuracy > 0 && accuracy < 25000) {
      accuracyCircleRef.current = L.circle([loc.lat, loc.lng], {
        radius: accuracy,
        color: '#2563eb',
        weight: 1.5,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
      }).addTo(markersGroupRef.current);
    }

    // Custom Live Radar "You are here" Pin (Pulsating outer radar wave + Cobalt center)
    const userRadarIcon = L.divIcon({
      className: 'custom-buyer-radar-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: #2563eb; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background-color: #1d4ed8; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(29,78,216,0.45); border: 3px solid white; z-index: 20; cursor: pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const popupHtml = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 190px;">
        <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 4px; display: flex; items-center: gap: 4px;">
          📍 You are here (Customer Location)
        </div>
        <div style="color: #475569;">Latitude: <strong>${loc.lat.toFixed(6)}°N</strong></div>
        <div style="color: #475569;">Longitude: <strong>${loc.lng.toFixed(6)}°E</strong></div>
        <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Accuracy: ±${Math.round(accuracy)} meters</div>
        <div style="margin-top: 6px; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 10px; text-align: center; background-color: #dbeafe; color: #1e40af;">
          ${isLiveTracking ? '🟢 Live GPS Tracking Active' : '📍 Custom Pinned Location'}
        </div>
      </div>
    `;

    userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: userRadarIcon, zIndexOffset: 1000 })
      .bindPopup(popupHtml)
      .bindTooltip('You are here (Live Customer Pin)', {
        permanent: false,
        direction: 'top',
        offset: [0, -22],
      })
      .addTo(markersGroupRef.current);
  }, [isLiveTracking]);

  // Render Provider Location Markers with rich info
  const renderProviderMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    providers.forEach((prov) => {
      const latLng = normalizeCoordinates(prov.location?.coordinates);
      if (!latLng) return;

      const [pLat, pLng] = latLng;

      // Distance calculation from live user coordinates
      let distText = '';
      if (userLocation) {
        const dKm = calculateDistanceKm(userLocation.lat, userLocation.lng, pLat, pLng);
        distText = `${dKm} km`;
      } else if (prov.distanceKm !== undefined) {
        distText = `${prov.distanceKm.toFixed(1)} km`;
      }

      const businessName = prov.businessName || 'Specialist';
      const categoryName =
        prov.categoryIds && prov.categoryIds.length > 0 && typeof prov.categoryIds[0] === 'object'
          ? (prov.categoryIds[0] as any).nameEn || 'Pro'
          : 'Service Pro';

      const priceText = prov.pricing?.startingPrice ? `${prov.pricing.startingPrice} ETB` : 'Quote';

      // Custom Provider Pin HTML with brand gradient & trade badge
      const providerIconHtml = `
        <div style="
          background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
          color: white;
          border-radius: 12px;
          padding: 5px 9px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.4);
          border: 2px solid white;
          white-space: nowrap;
          cursor: pointer;
          transform: translate(-50%, -50%);
          transition: transform 0.15s ease-in-out;
        ">
          <div style="width: 7px; height: 7px; border-radius: 50%; background-color: #60a5fa;"></div>
          <span>${prov.isVerified ? '✓ ' : ''}${businessName}</span>
          ${
            distText
              ? `<span style="background: rgba(255,255,255,0.25); border-radius: 4px; padding: 1px 4px; font-size: 10px; font-weight: 700;">${distText}</span>`
              : `<span style="background: rgba(255,255,255,0.25); border-radius: 4px; padding: 1px 4px; font-size: 10px; font-weight: 700;">${priceText}</span>`
          }
        </div>
      `;

      const providerIcon = L.divIcon({
        className: 'custom-lehulu-provider-marker',
        html: providerIconHtml,
        iconSize: [0, 0],
      });

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <h4 style="font-weight: 800; color: #0f172a; margin: 0;">${businessName}</h4>
            ${prov.isVerified ? '<span style="font-size: 10px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">✓ Verified</span>' : ''}
          </div>
          <p style="color: #64748b; font-size: 11px; margin: 0 0 6px 0;">Trade: ${categoryName}</p>
          ${
            distText
              ? `<div style="color: #2563eb; font-weight: 700; font-size: 11px; margin-bottom: 6px;">📍 ${distText} from your location</div>`
              : ''
          }
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            Starting: <span style="color: #1d4ed8;">${priceText}</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="/providers/${prov._id}" style="
              flex: 1;
              text-align: center;
              background: #1d4ed8;
              color: white;
              padding: 5px 8px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 700;
              font-size: 11px;
            ">View Profile</a>
          </div>
        </div>
      `;

      const marker = L.marker([pLat, pLng], { icon: providerIcon })
        .bindPopup(popupHtml)
        .bindTooltip(`${businessName} (${categoryName}) ${distText ? '• ' + distText : ''}`, {
          direction: 'top',
          offset: [0, -14],
        })
        .addTo(markersGroupRef.current!);

      marker.on('click', () => {
        setActiveProvider(prov);
        if (onProviderSelect) onProviderSelect(prov);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([pLat, pLng], 15, { duration: 1 });
        }
      });
    });
  }, [providers, userLocation, onProviderSelect]);

  // Synchronize Markers & Distance Route Line
  useEffect(() => {
    if (!markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    // Render customer live location pin if present
    if (userLocation) {
      renderUserMarker(userLocation);
    }

    // Render provider pins
    renderProviderMarkers();

    // Route connection polyline between user and active provider
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (userLocation && activeProvider && mapInstanceRef.current) {
      const pCoords = normalizeCoordinates(activeProvider.location?.coordinates);
      if (pCoords) {
        routePolylineRef.current = L.polyline(
          [
            [userLocation.lat, userLocation.lng],
            [pCoords[0], pCoords[1]],
          ],
          {
            color: '#2563eb',
            weight: 3.5,
            dashArray: '6, 8',
            opacity: 0.85,
          }
        ).addTo(mapInstanceRef.current);
      }
    }
  }, [providers, userLocation, activeProvider, renderUserMarker, renderProviderMarkers]);

  // Map Camera Navigation Helpers
  const handleFlyToUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1.2 });
    } else if (onLocateMe) {
      onLocateMe();
    }
  };

  const handleFlyToCity = (cityName: string) => {
    if (CITY_COORDINATES[cityName] && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(CITY_COORDINATES[cityName], 13, { duration: 1 });
    }
  };

  return (
    <div className="relative w-full h-[480px] lg:h-[620px] rounded-xl overflow-hidden border border-slate-200/90 shadow-md z-0 flex flex-col bg-slate-50">
      {/* Top Floating Control Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Actions: Live GPS & Locate Me */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onToggleLiveTracking && (
            <button
              type="button"
              onClick={onToggleLiveTracking}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all cursor-pointer ${
                isLiveTracking
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'
                  : 'bg-white/95 hover:bg-white text-slate-700 border border-slate-200/90'
              }`}
              title="Continuous live GPS location tracking"
            >
              {isLiveTracking ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>Live GPS Tracking</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-blue-600" />
                  <span>Start Live GPS</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleFlyToUser}
            disabled={gpsLoading}
            className="px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 text-xs font-bold border border-slate-200/90 shadow-md flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
            title="Locate my position with high accuracy"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
            <span>{gpsLoading ? 'Locating...' : 'Locate Me'}</span>
          </button>
        </div>

        {/* Right Actions: Quick City Center Jumps */}
        <div className="hidden sm:flex items-center gap-1 pointer-events-auto bg-white/90 backdrop-blur-md p-1 rounded-lg border border-slate-200/90 shadow-md text-xs">
          <button
            type="button"
            onClick={() => handleFlyToCity('Adama')}
            className="px-2 py-1 rounded font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Adama
          </button>
          <button
            type="button"
            onClick={() => handleFlyToCity('Bishoftu')}
            className="px-2 py-1 rounded font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Bishoftu
          </button>
          <button
            type="button"
            onClick={() => handleFlyToCity('Addis Ababa')}
            className="px-2 py-1 rounded font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Addis
          </button>
        </div>
      </div>

      {/* Interactive Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      {/* Floating Bottom Status / Location Pill */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex justify-center">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-[11px] font-medium shadow-lg border border-slate-700/80 pointer-events-auto flex items-center gap-2">
          {userLocation ? (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>
                📍 Live Coordinates: {userLocation.lat.toFixed(4)}°N, {userLocation.lng.toFixed(4)}°E{' '}
                {userLocation.accuracy ? `(±${Math.round(userLocation.accuracy)}m)` : ''} •{' '}
                {providers.length} Specialists on Map
              </span>
            </>
          ) : (
            <>
              <span className="text-amber-400 font-bold">👆 Tip:</span>
              <span>Click anywhere on the map or tap &apos;Locate Me&apos; to place your customer pin</span>
            </>
          )}
        </div>
      </div>

      {/* Quick Copied / Click Notification Alert */}
      {copiedNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg border border-blue-400 animate-in fade-in duration-150">
          {copiedNotification}
        </div>
      )}
    </div>
  );
};

export default MapDiscovery;
