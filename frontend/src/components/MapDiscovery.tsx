import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProviderProfile } from '../types';

interface MapDiscoveryProps {
  providers: ProviderProfile[];
  selectedCity?: string;
  onProviderSelect?: (provider: ProviderProfile) => void;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  Adama: [8.54, 39.27],
  Bishoftu: [8.75, 38.98],
  'Addis Ababa': [9.02, 38.74],
};

export const MapDiscovery: React.FC<MapDiscoveryProps> = ({
  providers,
  selectedCity = 'Adama',
  onProviderSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const center = CITY_COORDINATES[selectedCity] || [8.54, 39.27];
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Recenter when city changes
  useEffect(() => {
    if (mapInstanceRef.current && selectedCity && CITY_COORDINATES[selectedCity]) {
      mapInstanceRef.current.setView(CITY_COORDINATES[selectedCity], 13);
    }
  }, [selectedCity]);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    providers.forEach((prov) => {
      const coords = prov.location?.coordinates;
      if (!coords || coords.length !== 2) return;

      const lng = coords[0];
      const lat = coords[1];
      if (isNaN(lat) || isNaN(lng)) return;

      const latLng: [number, number] = [lat, lng];
      bounds.extend(latLng);

      // Custom styled HTML marker icon
      const customIcon = L.divIcon({
        className: 'custom-lehulu-pin',
        html: `
          <div style="
            background: #047857;
            color: white;
            border-radius: 9999px;
            padding: 4px 8px;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
            border: 2px solid white;
            white-space: nowrap;
            transform: translate(-50%, -50%);
          ">
            <span>${prov.isVerified ? '✓ ' : ''}${prov.businessName || 'Pro'}</span>
            <span style="background: rgba(255,255,255,0.25); border-radius: 4px; padding: 1px 4px; font-size: 10px;">
              ${prov.pricing?.startingPrice ? prov.pricing.startingPrice + ' ETB' : ''}
            </span>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

      // Popup
      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 160px; padding: 4px;">
          <h4 style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${prov.businessName || 'Service Pro'}</h4>
          <p style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${prov.serviceCities?.join(', ') || ''}</p>
          <div style="font-weight: 600; color: #047857; margin-bottom: 8px;">
            Starting: ${prov.pricing?.startingPrice ? prov.pricing.startingPrice + ' ETB' : 'Quote'}
          </div>
          <a href="/providers/${prov._id}" style="
            display: inline-block;
            background: #047857;
            color: white;
            padding: 4px 10px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 11px;
          ">View Profile</a>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onProviderSelect) onProviderSelect(prov);
      });

      markersRef.current.push(marker);
    });

    if (providers.length > 1 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [providers, onProviderSelect]);

  return (
    <div className="relative w-full h-[450px] lg:h-[600px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
