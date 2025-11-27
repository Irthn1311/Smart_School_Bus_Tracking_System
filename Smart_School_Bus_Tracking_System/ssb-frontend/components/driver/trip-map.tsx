"use client"

import React, { useEffect, useRef, useState } from "react"

interface Marker {
  id: string
  lat: number
  lng: number
  label?: string
}

interface TripMapProps {
  center?: { lat: number; lng: number }
  zoom?: number
  markers?: Marker[]
  className?: string
}

function loadGoogleMaps(apiKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Not in a browser"))
    if ((window as any).google && (window as any).google.maps) return resolve()

    const existing = document.querySelector(`script[data-google-maps]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")))
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.setAttribute("data-google-maps", "true")
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google Maps"))
    document.head.appendChild(script)
  })
}

export default function TripMap({ center = { lat: 10.762622, lng: 106.660172 }, zoom = 13, markers = [], className = "" }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) {
      setError("Missing Google Maps API key. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment.")
      return
    }

    let mounted = true

    loadGoogleMaps(key)
      .then(() => {
        if (!mounted) return
        if (!mapRef.current) return
        const g = (window as any).google
        mapInstance.current = new g.maps.Map(mapRef.current, {
          center,
          zoom,
          disableDefaultUI: false,
        })
        // add markers
        markersRef.current = markers.map((m) => {
          const mk = new g.maps.Marker({
            position: { lat: m.lat, lng: m.lng },
            map: mapInstance.current,
            title: m.label || m.id,
          })
          if (m.label) {
            const infowindow = new g.maps.InfoWindow({ content: `<div style="min-width:120px">${m.label}</div>` })
            mk.addListener("click", () => infowindow.open({ anchor: mk, map: mapInstance.current }))
          }
          return mk
        })
      })
      .catch((e) => {
        console.error(e)
        setError("Google Maps failed to load")
      })

    return () => {
      mounted = false
      // cleanup markers
      try {
        markersRef.current.forEach((m) => m.setMap(null))
        markersRef.current = []
      } catch (e) {
        /* ignore */
      }
    }
  }, [center.lat, center.lng, zoom])

  // If no API key, render fallback placeholder (keeps previous demo look)
  if (error) {
    return (
      <div className={`relative h-[400px] w-full bg-muted/30 rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-success/5">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="font-medium text-foreground mb-2">Bản đồ tạm thời</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return <div ref={mapRef} className={`w-full h-[400px] rounded-lg ${className}`} />
}
