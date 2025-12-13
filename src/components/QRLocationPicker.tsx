/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, MapPin, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    google: typeof google;
  }
}
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface QRLocationPickerProps {
  qrCodeId: string;
  officeId: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialRadius?: number | null;
  onSave?: () => void;
}

export const QRLocationPicker = ({
  qrCodeId,
  officeId,
  initialLatitude,
  initialLongitude,
  initialRadius,
  onSave,
}: QRLocationPickerProps) => {
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  const [latitude, setLatitude] = useState<number | null>(initialLatitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialLongitude ?? null);
  const [radius, setRadius] = useState<number>(initialRadius ?? 100);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Google Maps API key
  const { data: apiKeyData, isLoading: loadingApiKey, error: apiKeyError } = useQuery({
    queryKey: ["google-maps-api-key"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-google-maps-key");
      if (error) throw error;
      return data as { apiKey: string };
    },
    staleTime: Infinity,
  });

  // Load Google Maps script
  useEffect(() => {
    if (!apiKeyData?.apiKey) return;

    const loadGoogleMaps = () => {
      if (window.google?.maps) {
        setMapLoaded(true);
        setLoadingMap(false);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyData.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapLoaded(true);
        setLoadingMap(false);
      };
      script.onerror = () => {
        setError("Failed to load Google Maps");
        setLoadingMap(false);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [apiKeyData?.apiKey]);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const defaultCenter = { 
      lat: latitude ?? 27.7172, 
      lng: longitude ?? 85.3240 
    };

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 17,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;

    // Add marker if location exists
    if (latitude !== null && longitude !== null) {
      addMarkerAndCircle(latitude, longitude, radius);
    }

    // Add click listener to set location
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setLatitude(lat);
        setLongitude(lng);
        addMarkerAndCircle(lat, lng, radius);
      }
    });
  }, [mapLoaded]);

  const addMarkerAndCircle = useCallback((lat: number, lng: number, rad: number) => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker and circle
    if (markerRef.current) markerRef.current.setMap(null);
    if (circleRef.current) circleRef.current.setMap(null);

    const position = { lat, lng };

    // Add new marker
    markerRef.current = new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      draggable: true,
      title: "Office Location",
    });

    // Add drag listener
    markerRef.current.addListener("dragend", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setLatitude(newLat);
        setLongitude(newLng);
        if (circleRef.current) {
          circleRef.current.setCenter({ lat: newLat, lng: newLng });
        }
      }
    });

    // Add radius circle
    circleRef.current = new google.maps.Circle({
      map: mapInstanceRef.current,
      center: position,
      radius: rad,
      fillColor: "#3b82f6",
      fillOpacity: 0.2,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });
  }, []);

  // Update circle radius when slider changes
  useEffect(() => {
    if (circleRef.current && latitude !== null && longitude !== null) {
      circleRef.current.setRadius(radius);
    }
  }, [radius, latitude, longitude]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("office_qr_codes")
        .update({
          latitude,
          longitude,
          radius_meters: radius,
        })
        .eq("id", qrCodeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-code", officeId] });
      toast.success("Location settings saved successfully");
      onSave?.();
    },
    onError: (error: any) => {
      console.error("Error saving location:", error);
      toast.error("Failed to save location settings");
    },
  });

  // Get current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        addMarkerAndCircle(lat, lng, radius);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
        }
      },
      (error) => {
        toast.error("Unable to get your location");
        console.error("Geolocation error:", error);
      }
    );
  };

  if (loadingApiKey || loadingMap) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (apiKeyError || error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg gap-2">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error || "Failed to load Google Maps. Please check API key configuration."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Office Location</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Use Current Location
        </Button>
      </div>

      <div
        ref={mapRef}
        className="w-full h-64 rounded-lg border overflow-hidden"
      />

      <p className="text-xs text-muted-foreground">
        Click on the map to set the office location, or drag the marker to adjust.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Latitude</Label>
          <Input
            type="number"
            step="any"
            value={latitude ?? ""}
            onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Latitude"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Longitude</Label>
          <Input
            type="number"
            step="any"
            value={longitude ?? ""}
            onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Longitude"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Check-in Radius</Label>
          <span className="text-sm font-medium">{radius} meters</span>
        </div>
        <Slider
          value={[radius]}
          onValueChange={(value) => setRadius(value[0])}
          min={25}
          max={500}
          step={25}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Employees must be within this radius to check in/out.
        </p>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || latitude === null || longitude === null}
        className="w-full"
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Location Settings
      </Button>

      {latitude === null || longitude === null ? (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-2 rounded-lg text-center">
          Set a location to enable geofenced check-in
        </p>
      ) : null}
    </div>
  );
};
