import React, { useEffect, useRef } from "react";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import { Overlay } from "ol";

const OpenLayersMapComponent = ({ lat, lng, className }) => {
  const mapContainerRef = useRef(null);

  useEffect(() => {
    if (mapContainerRef.current) {
      const map = new Map({
        target: mapContainerRef.current,
        layers: [
          new TileLayer({
            source: new OSM(), // Using OpenStreetMap as the tile source
          }),
        ],
        view: new View({
          center: fromLonLat([lng, lat]), // Convert [longitude, latitude] to OpenLayers format
          zoom: 15,
        }),
      });

      // Marker Overlay
      const marker = new Overlay({
        position: fromLonLat([lng, lat]), // Set marker at the location
        element: document.createElement("div"), // This can be a custom marker element
      });

      // Optionally, you can style the marker
      marker.getElement().style.backgroundColor = "red"; // Red for visibility
      marker.getElement().style.width = "10px";
      marker.getElement().style.height = "10px";
      marker.getElement().style.borderRadius = "50%";

      map.addOverlay(marker);

      // Cleanup on unmount
      return () => {
        map.setTarget(undefined);
      };
    }
  }, [lat, lng]);

  return <div ref={mapContainerRef} className={className} />;
};

export default OpenLayersMapComponent;
