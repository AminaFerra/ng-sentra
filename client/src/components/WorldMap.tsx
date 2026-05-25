import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const geoUrl = "/countries-110m.json";

export default function WorldMap() {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{
        scale: 140,
        center: [0, 30]
      }}
      className="w-full h-full"
    >
      <Geographies geography={geoUrl}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill="rgba(6, 182, 212, 0.1)"
              stroke="rgba(6, 182, 212, 0.6)"
              strokeWidth={1}
              strokeDasharray="2,4"
              style={{
                default: { outline: "none" },
                hover: { outline: "none", fill: "rgba(6, 182, 212, 0.3)" },
                pressed: { outline: "none" },
              }}
            />
          ))
        }
      </Geographies>
    </ComposableMap>
  );
}
