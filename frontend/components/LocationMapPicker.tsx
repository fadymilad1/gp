'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationMapPickerProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
}

const NOMINATIM_UA = 'MedifyApp/1.0 (Business Info Location Picker)'

async function nominatimSearch(query: string): Promise<{ lat: string; lon: string; display_name: string } | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { 'User-Agent': NOMINATIM_UA } }
  )
  const data = await res.json()
  return Array.isArray(data) && data[0] ? data[0] : null
}

async function nominatimReverse(lat: number, lon: number): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'User-Agent': NOMINATIM_UA } }
  )
  const data = await res.json()
  return data?.display_name ?? null
}

export default function LocationMapPicker({ formData, setFormData }: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const mapRef = useRef<{ map: L.Map; marker: L.Marker } | null>(null)
  type LeafletMouseEvent = { latlng: { lat: number; lng: number } }
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const defaultCenter: [number, number] = [30.0444, 31.2357]

  const updateAddressFromCoordinates = (lat: number, lng: number) => {
    nominatimReverse(lat, lng).then((addr) => {
      if (addr) {
        setFormData((prev: any) => ({ ...prev, address: addr }))
      }
    })
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = (searchInputRef.current?.value ?? searchQuery).trim()
    if (!q) return
    setSearching(true)
    setMapError(null)
    try {
      const result = await nominatimSearch(q)
      if (!result || !mapRef.current) {
        setMapError('Location not found. Try a different address.')
        setSearching(false)
        return
      }
      const lat = parseFloat(result.lat)
      const lng = parseFloat(result.lon)
      mapRef.current.map.setView([lat, lng], 15)
      mapRef.current.marker.setLatLng([lat, lng])
      setFormData((prev: any) => ({
        ...prev,
        location: { lat, lng },
        address: result.display_name,
      }))
      setSearchQuery('')
      if (searchInputRef.current) searchInputRef.current.value = ''
    } catch {
      setMapError('Search failed. Please try again.')
    }
    setSearching(false)
  }

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined') return
    const L = require('leaflet')
    if (!L) return

    // Fix default marker icon in Next.js (broken paths)
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })

    const map = L.map(mapContainerRef.current).setView(defaultCenter, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const marker = L.marker(defaultCenter, { draggable: true }).addTo(map)

    map.on('click', (e: LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      marker.setLatLng([lat, lng])
      setFormData((prev: any) => ({ ...prev, location: { lat, lng } }))
      updateAddressFromCoordinates(lat, lng)
    })

    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      const lat = pos.lat
      const lng = pos.lng
      setFormData((prev: any) => ({ ...prev, location: { lat, lng } }))
      updateAddressFromCoordinates(lat, lng)
    })

    mapRef.current = { map, marker }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [setFormData])

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a location (e.g. city or full address)"
          className="flex-1 min-w-0 px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearch(e as unknown as React.FormEvent)
            }
          }}
        />
        <Button type="button" variant="secondary" disabled={searching} onClick={handleSearch}>
          {searching ? 'Searching...' : 'Search'}
        </Button>
      </div>
      <div
        ref={mapContainerRef}
        className="h-64 bg-neutral-light rounded-lg z-0"
      />
      {mapError && (
        <p className="text-xs text-error">{mapError}</p>
      )}
      {formData.location && (
        <p className="text-xs text-neutral-gray">
          Selected: {formData.location.lat?.toFixed(5)}, {formData.location.lng?.toFixed(5)}
        </p>
      )}
    </div>
  )
}
