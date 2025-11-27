/**
 * MapView Component for Real-time Bus Tracking
 * Supports both Google Maps and Leaflet
 */

"use client"
    
// Compatibility proxy: re-export the frontend (Leaflet) MapView implementation.
// Keeps existing imports like `@/components/tracking/MapView` working during the
// migration away from the old Google Maps implementation.

export { default, MapView } from "../../ssb-frontend/components/tracking/MapView"
