'use client';

import { useEffect, useRef } from 'react';
import { loadGoogleMaps } from './googleLoader';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

interface PlacePickerProps {
  onPlaceSelected: (place: {
    name: string;
    lat: number;
    lng: number;
    address: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

/**
 * PlacePicker - Google Places Autocomplete component
 * 
 * Allows users to search for locations using Google Places API.
 * When a place is selected, extracts coordinates and address.
 * 
 * Usage:
 * ```tsx
 * <PlacePicker
 *   onPlaceSelected={(place) => {
 *     setName(place.name);
 *     setLat(place.lat);
 *     setLng(place.lng);
 *     setAddress(place.address);
 *   }}
 * />
 * ```
 */
export default function PlacePicker({ onPlaceSelected, placeholder = 'Tìm kiếm địa điểm...', className = '' }: PlacePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    let mounted = true;

    // Load Google Maps and initialize Autocomplete
    loadGoogleMaps()
      .then(() => {
        if (!mounted || !inputRef.current) return;

        const google = window.google;
        if (!google?.maps?.places) {
          console.warn('Google Maps Places library not loaded. Autocomplete will not work.');
          return;
        }

        try {
          // Create Autocomplete instance
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            fields: ['geometry', 'name', 'formatted_address', 'place_id'],
            // Bias to Vietnam
            componentRestrictions: { country: 'vn' },
          });

          autocompleteRef.current = autocomplete;

          // Fix z-index for autocomplete dropdown to ensure it's clickable
          // Google Places Autocomplete creates a dropdown that might be behind other elements
          const fixZIndex = () => {
            const pacContainer = document.querySelector('.pac-container');
            if (pacContainer) {
              (pacContainer as HTMLElement).style.zIndex = '9999';
              (pacContainer as HTMLElement).style.position = 'absolute';
              // Ensure items are clickable
              const pacItems = pacContainer.querySelectorAll('.pac-item');
              pacItems.forEach((item) => {
                (item as HTMLElement).style.cursor = 'pointer';
              });
            }
          };
          
          // Fix immediately and also on input focus
          setTimeout(fixZIndex, 100);
          inputRef.current?.addEventListener('focus', fixZIndex);
          inputRef.current?.addEventListener('input', fixZIndex);

          // Listen for place selection
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();

            if (!place.geometry?.location) {
              console.warn('Place has no geometry');
              return;
            }

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const name = place.name || '';
            const address = place.formatted_address || '';

            console.log('📍 Place selected:', { name, lat, lng, address });

            onPlaceSelected({
              name,
              lat,
              lng,
              address,
            });
          });

          console.log('✅ Google Places Autocomplete initialized');
        } catch (error) {
          console.warn('Failed to initialize Google Places Autocomplete:', error);
        }
      })
      .catch((error) => {
        console.warn('Failed to load Google Maps for PlacePicker:', error);
        // Don't throw error, just log warning - user can still type manually
      });

    return () => {
      mounted = false;
      // Clean up Autocomplete listeners
      if (autocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [onPlaceSelected]);

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="pl-10"
        autoComplete="off"
      />
    </div>
  );
}

