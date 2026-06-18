import { Pose } from '../types/telemetry';

interface PoseViewProps {
  pose: Pose | null;
  isFrozen: boolean;
}

export function PoseView({ pose, isFrozen }: PoseViewProps) {
  // Canvas dimensions
  const svgWidth = 600;
  const svgHeight = 400;
  
  // Map range: -500m to +500m in both X and Y (large enough for circular path)
  const mapRange = 500;
  const scale = svgWidth / (2 * mapRange); // pixels per meter

  // Calculate vehicle position on map (with wrapping for large coordinates)
  let vehicleX = svgWidth / 2;
  let vehicleY = svgHeight / 2;
  let headingDeg = 0;

  if (pose) {
    // Use modulo to wrap coordinates around the map for visualization
    // Simpler wrapping formula: center at origin first, then wrap
    const wrappedX = ((pose.x + mapRange) % (mapRange * 2)) - mapRange;
    const wrappedY = ((pose.y + mapRange) % (mapRange * 2)) - mapRange;

    // Convert to canvas coordinates
    vehicleX = (svgWidth / 2) + wrappedX * scale;
    vehicleY = (svgHeight / 2) - wrappedY * scale; // Y inverted for standard math coords
    headingDeg = pose.headingDeg;
  }

  const vehicleColor = isFrozen ? '#ff9800' : '#4caf50';
  const borderColor = isFrozen ? '#e68900' : '#388e3c';

  // Generate grid lines based on map range
  const gridSpacing = 50; // pixels

  return (
    <div className="pose-view-container">
      <div className="pose-view-map">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className={`pose-canvas ${isFrozen ? 'pose-canvas--frozen' : ''}`}
        >
          {/* Grid background */}
          <defs>
            <pattern id="grid" width={gridSpacing} height={gridSpacing} patternUnits="userSpaceOnUse">
              <path d={`M ${gridSpacing} 0 L 0 0 0 ${gridSpacing}`} fill="none" stroke="#e0e0e0" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Grid fill */}
          <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

          {/* Center crosshairs (origin reference) */}
          <line x1={svgWidth / 2} y1="0" x2={svgWidth / 2} y2={svgHeight} stroke="#ccc" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="#ccc" strokeWidth="1" strokeDasharray="3,3" />

          {/* Map boundary labels */}
          <text x="5" y="15" fontSize="10" fill="#999">
            +{mapRange}m
          </text>
          <text x={svgWidth - 40} y="15" fontSize="10" fill="#999">
            -{mapRange}m
          </text>
          <text x="5" y={svgHeight - 5} fontSize="10" fill="#999">
            -{mapRange}m
          </text>
          <text x={svgWidth - 40} y={svgHeight - 5} fontSize="10" fill="#999">
            +{mapRange}m
          </text>

          {/* Vehicle - moves on map */}
          {pose && (
            <g>
              {/* Coordinate display at vehicle position */}
              <text x={vehicleX + 60} y={vehicleY - 50} fontSize="12" fill={vehicleColor} fontWeight="bold">
                ({pose.x.toFixed(0)}m, {pose.y.toFixed(0)}m)
              </text>

              {/* Vehicle body */}
              <g transform={`translate(${vehicleX}, ${vehicleY}) rotate(${headingDeg})`}>
                <defs>
                  <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={vehicleColor} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={vehicleColor} stopOpacity="1" />
                  </linearGradient>
                </defs>

                {/* Chassis shadow */}
                <rect x="-22" y="-32" width="44" height="64" rx="8" ry="8" fill="rgba(0,0,0,0.15)" />

                {/* Main body */}
                <rect x="-20" y="-30" width="40" height="60" rx="7" ry="7" fill="url(#bodyGrad)" stroke={borderColor} strokeWidth="2.5" />

                {/* Cabin / operator area (darker rectangle on top) */}
                <rect x="-12" y="-10" width="24" height="28" rx="4" ry="4" fill={borderColor} opacity="0.5" />

                {/* Fork arms at front (-Y direction is forward) */}
                <rect x="-16" y="-38" width="5" height="12" rx="2" fill="#888" stroke="#666" strokeWidth="1" />
                <rect x="11" y="-38" width="5" height="12" rx="2" fill="#888" stroke="#666" strokeWidth="1" />

                {/* Fork crossbar */}
                <rect x="-17" y="-40" width="34" height="4" rx="1" fill="#999" />

                {/* Direction arrow (forward indicator) */}
                <polygon points="0,-45 -8,-38 0,-35 8,-38" fill="#ffc107" opacity="0.95" />

                {/* Center hub */}
                <circle cx="0" cy="0" r="5" fill="white" opacity="0.6" />

                {/* Wheels */}
                <rect x="-22" y="-28" width="4" height="10" rx="2" fill="#333" />
                <rect x="18" y="-28" width="4" height="10" rx="2" fill="#333" />
                <rect x="-22" y="18" width="4" height="10" rx="2" fill="#333" />
                <rect x="18" y="18" width="4" height="10" rx="2" fill="#333" />
              </g>
            </g>
          )}

          {/* No telemetry placeholder */}
          {!pose && (
            <text x={svgWidth / 2} y={svgHeight / 2} fontSize="16" fill="#999" textAnchor="middle" dy="0.3em">
              Awaiting telemetry...
            </text>
          )}
        </svg>
      </div>

      {/* Pose info display — always reserved to prevent map from resizing */}
      <div className={`pose-info${!pose ? ' pose-info--empty' : ''}`}>
        <div className="pose-info-item">
          <span className="pose-info-label">X:</span>
          <span className="pose-info-value">{pose ? `${pose.x.toFixed(2)} m` : '—'}</span>
        </div>
        <div className="pose-info-item">
          <span className="pose-info-label">Y:</span>
          <span className="pose-info-value">{pose ? `${pose.y.toFixed(2)} m` : '—'}</span>
        </div>
        <div className="pose-info-item">
          <span className="pose-info-label">Heading:</span>
          <span className="pose-info-value">{pose ? `${pose.headingDeg.toFixed(0)}°` : '—'}</span>
        </div>
        {pose && (
          <div className={`pose-info-frozen${!isFrozen ? ' pose-info-frozen--hidden' : ''}`}>
            ⚠ Last Known Position
          </div>
        )}
      </div>
    </div>
  );
}
