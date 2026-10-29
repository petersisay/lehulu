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
  selectedProviderId?: string;
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
  selectedProviderId,
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
  const routeHaloRef = useRef<L.Polyline | null>(null);
  const distanceMarkerRef = useRef<L.Marker | null>(null);
  const [activeProvider, setActiveProvider] = useState<ProviderProfile | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Active customer coordinates: GPS fix if available, or selectedCity center
  const customerCoords = useMemo<[number, number]>(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    return CITY_COORDINATES[selectedCity] || [8.54, 39.27];
  }, [userLocation, selectedCity]);

  // Determine active provider to connect the route line to
  const targetProvider = useMemo(() => {
    if (activeProvider) return activeProvider;
    if (selectedProviderId) {
      const found = providers.find((p) => p._id === selectedProviderId);
      if (found) return found;
    }
    return providers[0] || null;
  }, [activeProvider, selectedProviderId, providers]);

  // Sync external selectedProviderId into activeProvider
  useEffect(() => {
    if (selectedProviderId) {
      const found = providers.find((p) => p._id === selectedProviderId);
      if (found) {
        setActiveProvider(found);
      }
    }
  }, [selectedProviderId, providers]);

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
      setCopiedNotification(`Customer location set to [${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}]`);
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

  // Render Customer Location Pin (Live GPS Radar or City Center default anchor)
  const renderUserMarker = useCallback(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    if (userMarkerRef.current) {
      markersGroupRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (accuracyCircleRef.current) {
      markersGroupRef.current.removeLayer(accuracyCircleRef.current);
      accuracyCircleRef.current = null;
    }

    if (userLocation) {
      // Live GPS Fix with Accuracy Ring & Pulsing Radar
      const accuracy = userLocation.accuracy || 15;
      if (accuracy > 0 && accuracy < 25000) {
        accuracyCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
          radius: accuracy,
          color: '#2563eb',
          weight: 1.5,
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
        }).addTo(markersGroupRef.current);
      }

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
          <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 4px;">
            📍 You are here (Customer Location)
          </div>
          <div style="color: #475569;">Latitude: <strong>${userLocation.lat.toFixed(6)}°N</strong></div>
          <div style="color: #475569;">Longitude: <strong>${userLocation.lng.toFixed(6)}°E</strong></div>
          <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Accuracy: ±${Math.round(accuracy)} meters</div>
          <div style="margin-top: 6px; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 10px; text-align: center; background-color: #dbeafe; color: #1e40af;">
            ${isLiveTracking ? '🟢 Live GPS Tracking Active' : '📍 Customer Pin'}
          </div>
        </div>
      `;

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userRadarIcon, zIndexOffset: 1000 })
        .bindPopup(popupHtml)
        .bindTooltip('📍 Customer Location (Live GPS)', {
          permanent: false,
          direction: 'top',
          offset: [0, -22],
        })
        .addTo(markersGroupRef.current);
    } else {
      // Default City Anchor Pin (Always gives customer a concrete location on the map)
      const defaultIcon = L.divIcon({
        className: 'custom-buyer-default-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
            <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background-color: #3b82f6; opacity: 0.25;"></div>
            <div style="background-color: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.45); border: 2.5px solid white; z-index: 20; cursor: pointer;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
              </svg>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 190px;">
          <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 4px;">
            📍 Customer Location (${selectedCity})
          </div>
          <div style="color: #64748b; font-size: 11px;">
            Click anywhere on the map or tap <strong>Locate Me</strong> to pin your exact location.
          </div>
          <div style="margin-top: 6px; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 10px; text-align: center; background-color: #dbeafe; color: #1e40af;">
            🛣️ Route line is actively connected to specialist
          </div>
        </div>
      `;

      userMarkerRef.current = L.marker([customerCoords[0], customerCoords[1]], { icon: defaultIcon, zIndexOffset: 1000 })
        .bindPopup(popupHtml)
        .bindTooltip(`📍 Customer Location (${selectedCity} Center) • Click map to move`, {
          permanent: false,
          direction: 'top',
          offset: [0, -20],
        })
        .addTo(markersGroupRef.current);
    }
  }, [userLocation, customerCoords, selectedCity, isLiveTracking]);

  // Render Provider Location Markers with active route indicators
  const renderProviderMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    providers.forEach((prov) => {
      const latLng = normalizeCoordinates(prov.location?.coordinates);
      if (!latLng) return;

      const [pLat, pLng] = latLng;
      const isTarget = targetProvider?._id === prov._id;

      // Distance calculation from active customer coordinates
      const dKm = calculateDistanceKm(customerCoords[0], customerCoords[1], pLat, pLng);
      const distText = `${dKm} km`;

      const businessName = prov.businessName || 'Specialist';
      const categoryName =
        prov.categoryIds && prov.categoryIds.length > 0 && typeof prov.categoryIds[0] === 'object'
          ? (prov.categoryIds[0] as any).nameEn || 'Pro'
          : 'Service Pro';

      const priceText = prov.pricing?.startingPrice ? `${prov.pricing.startingPrice} ETB` : 'Quote';

      // Custom Provider Pin HTML with brand gradient & connected route styling
      const providerIconHtml = `
        <div style="
          background: ${isTarget ? 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' : 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)'};
          color: white;
          border-radius: 12px;
          padding: 5px 9px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          box-shadow: ${isTarget ? '0 0 16px rgba(59, 130, 246, 0.7), 0 4px 14px rgba(0,0,0,0.4)' : '0 4px 12px rgba(29, 78, 216, 0.4)'};
          border: ${isTarget ? '2.5px solid #60a5fa' : '2px solid white'};
          white-space: nowrap;
          cursor: pointer;
          transform: translate(-50%, -50%);
          transition: transform 0.15s ease-in-out;
        ">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${isTarget ? '#60a5fa' : '#93c5fd'};"></div>
          <span>${prov.isVerified ? '✓ ' : ''}${businessName}</span>
          <span style="background: ${isTarget ? 'rgba(96, 165, 250, 0.35)' : 'rgba(255,255,255,0.25)'}; border-radius: 4px; padding: 1px 4px; font-size: 10px; font-weight: 700;">
            ${distText}
          </span>
          ${isTarget ? '<span style="background: #2563eb; color: #ffffff; border-radius: 4px; padding: 1px 4px; font-size: 9px; font-weight: 800;">ROUTE</span>' : ''}
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
          <div style="color: #2563eb; font-weight: 700; font-size: 11px; margin-bottom: 6px;">📍 ${distText} from customer location</div>
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

      const marker = L.marker([pLat, pLng], { icon: providerIcon, zIndexOffset: isTarget ? 500 : 100 })
        .bindPopup(popupHtml)
        .bindTooltip(`${businessName} (${categoryName}) • ${distText} away`, {
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
  }, [providers, customerCoords, targetProvider, onProviderSelect]);

  // Synchronize Markers & High-Visibility Route Line between Customer & Provider
  useEffect(() => {
    if (!markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    // Render customer location marker (Live GPS or City Center default)
    renderUserMarker();

    // Render provider markers
    renderProviderMarkers();

    // Clear previous route layers
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    if (routeHaloRef.current) {
      routeHaloRef.current.remove();
      routeHaloRef.current = null;
    }
    if (distanceMarkerRef.current) {
      distanceMarkerRef.current.remove();
      distanceMarkerRef.current = null;
    }

    // Render high-visibility route line connecting customer and target provider
    if (targetProvider && mapInstanceRef.current) {
      const pCoords = normalizeCoordinates(targetProvider.location?.coordinates);
      if (pCoords) {
        // 1. Outer route glowing halo line for maximum contrast and high visibility
        routeHaloRef.current = L.polyline(
          [customerCoords, [pCoords[0], pCoords[1]]],
          {
            color: '#60a5fa',
            weight: 7,
            opacity: 0.38,
            lineCap: 'round',
            lineJoin: 'round',
          }
        ).addTo(mapInstanceRef.current);

        // 2. Core high-contrast dashed route line
        routePolylineRef.current = L.polyline(
          [customerCoords, [pCoords[0], pCoords[1]]],
          {
            color: '#1d4ed8',
            weight: 3.5,
            dashArray: '8, 8',
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }
        ).addTo(mapInstanceRef.current);

        // 3. Midpoint coordinates for floating distance badge
        const midLat = (customerCoords[0] + pCoords[0]) / 2;
        const midLng = (customerCoords[1] + pCoords[1]) / 2;
        const distKm = calculateDistanceKm(customerCoords[0], customerCoords[1], pCoords[0], pCoords[1]);
        const estMin = Math.max(2, Math.round((distKm / 35) * 60));

        const distIcon = L.divIcon({
          className: 'custom-route-distance-pill',
          html: `
            <div style="transform: translate(-50%, -50%); background: #1e3a8a; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; border: 2px solid white; box-shadow: 0 4px 12px rgba(30,58,138,0.45); white-space: nowrap; display: flex; align-items: center; gap: 5px; pointer-events: none; cursor: default;">
              <span>📍</span>
              <span>${distKm.toFixed(1)} km</span>
              <span style="color: #93c5fd; font-weight: 600; font-size: 10px;">(~${estMin} min)</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        distanceMarkerRef.current = L.marker([midLat, midLng], {
          icon: distIcon,
          interactive: false,
          zIndexOffset: 1200,
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current.bindTooltip(
          `🛣️ Route: Customer ➔ ${targetProvider.businessName || 'Provider'} (${distKm.toFixed(1)} km, ~${estMin} min)`,
          { sticky: true, direction: 'top', offset: [0, -10] }
        );
      }
    }
  }, [providers, customerCoords, targetProvider, renderUserMarker, renderProviderMarkers]);

  // Focus Route Line Camera to simultaneously frame customer and target provider
  const handleFocusRoute = useCallback(() => {
    if (!mapInstanceRef.current || !targetProvider) return;
    const pCoords = normalizeCoordinates(targetProvider.location?.coordinates);
    if (!pCoords) return;

    mapInstanceRef.current.fitBounds(
      [
        customerCoords,
        [pCoords[0], pCoords[1]],
      ],
      { padding: [55, 55], maxZoom: 15 }
    );
  }, [customerCoords, targetProvider]);

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
    <div id="map-discovery-container" className="relative w-full h-[480px] lg:h-[620px] rounded-xl overflow-hidden border border-slate-200/90 shadow-md z-0 flex flex-col bg-slate-50">
      {/* Top Floating Control Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Actions: Live GPS, Locate Me & Locate Route Line */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
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

          {targetProvider && (
            <button
              type="button"
              onClick={handleFocusRoute}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border border-blue-500 shadow-md flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
              title="Locate and fit the route line between customer and provider"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Locate Route Line</span>
            </button>
          )}
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
                Route connected to {targetProvider?.businessName || 'Specialist'}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>
                🛣️ Route Line connected to {targetProvider?.businessName || 'Specialist'} • Click map to move customer pin
              </span>
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
