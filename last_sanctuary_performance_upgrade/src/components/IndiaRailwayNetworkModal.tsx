import React, { useState, useEffect } from 'react';
import { soundEngine } from '../utils/audio';

interface IndiaRailwayNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFastTravelToStation?: (stationName: string) => void;
}

interface NetworkNode {
  id: string;
  name: string;
  hindiName: string;
  type: 'major_city' | 'town_village' | 'military_base' | 'industrial_zone' | 'tourist_route' | 'freight_corridor';
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  platforms: number;
  electrification: string;
  activeTrains: string[];
}

export const IndiaRailwayNetworkModal: React.FC<IndiaRailwayNetworkModalProps> = ({
  isOpen,
  onClose,
  onFastTravelToStation,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'major_city' | 'military_base' | 'industrial_zone' | 'tourist_route' | 'freight_corridor'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('sanctuary_central');
  const [simTick, setSimTick] = useState<number>(0);

  // 1 Hz simulation tick for animated train pulses along network tracks
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSimTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const nodes: NetworkNode[] = [
    {
      id: 'delhi_central',
      name: 'New Delhi Central',
      hindiName: 'नई दिल्ली जंक्शन',
      type: 'major_city',
      x: 38,
      y: 28,
      platforms: 16,
      electrification: '25 kV AC 50 Hz',
      activeTrains: ['Sanctuary Rajdhani Express (12301)', 'Vande Bharat Express (22436)'],
    },
    {
      id: 'sanctuary_central',
      name: 'Sanctuary Central Terminus',
      hindiName: 'सैंक्चुअरी सेंट्रल टर्मिनल',
      type: 'major_city',
      x: 48,
      y: 42,
      platforms: 8,
      electrification: '25 kV AC 50 Hz & 48-Panel Rooftop Solar',
      activeTrains: ['Train 01 (Rajdhani)', 'Train 02 (Vande Bharat)', 'Train 03 (Mail)'],
    },
    {
      id: 'mumbai_cst',
      name: 'Mumbai CSMT',
      hindiName: 'मुंबई सीएसएमटी',
      type: 'major_city',
      x: 27,
      y: 60,
      platforms: 18,
      electrification: '25 kV AC 50 Hz',
      activeTrains: ['Tejas Express', 'Mumbai Mail'],
    },
    {
      id: 'howrah_kolkata',
      name: 'Howrah Junction',
      hindiName: 'हावड़ा जंक्शन',
      type: 'major_city',
      x: 74,
      y: 48,
      platforms: 23,
      electrification: '25 kV AC 50 Hz',
      activeTrains: ['Kolkata Rajdhani', 'Coromandel Express'],
    },
    {
      id: 'chennai_central',
      name: 'Chennai Central',
      hindiName: 'चेन्नई सेंट्रल',
      type: 'major_city',
      x: 52,
      y: 78,
      platforms: 12,
      electrification: '25 kV AC 50 Hz',
      activeTrains: ['Grand Trunk Express', 'Southern Superfast'],
    },
    {
      id: 'bengaluru_city',
      name: 'Bengaluru KSR',
      hindiName: 'बेंगलुरु क्रांतिवीर संगोली रायण्णा',
      type: 'major_city',
      x: 43,
      y: 82,
      platforms: 10,
      electrification: '25 kV AC 50 Hz',
      activeTrains: ['Karnataka Express', 'Vande Bharat Southern'],
    },
    {
      id: 'northern_apex',
      name: 'Northern Apex Research Outpost',
      hindiName: 'उत्तरी एपेक्स अनुसंधान बेस',
      type: 'military_base',
      x: 35,
      y: 12,
      platforms: 4,
      electrification: '25 kV AC Armored Catenary',
      activeTrains: ['Train 06 (Northern Apex Shield Express)'],
    },
    {
      id: 'canyon_pass_freight',
      name: 'Canyon Pass Freight Depot & Yard',
      hindiName: 'कैनियन पास फ्रेट डिपो',
      type: 'freight_corridor',
      x: 62,
      y: 34,
      platforms: 6,
      electrification: '25 kV Heavy Haul',
      activeTrains: ['WAG-9 Heavy Double-Stack CONCOR'],
    },
    {
      id: 'pine_valley',
      name: 'Pine Valley Junction',
      hindiName: 'पाइन वैली जंक्शन',
      type: 'town_village',
      x: 42,
      y: 36,
      platforms: 4,
      electrification: '25 kV AC 50 Hz',
      activeTrains: ['Highland Express Mail'],
    },
    {
      id: 'highland_ridge',
      name: 'Highland Ridge Tourist Hub',
      hindiName: 'हाइलैंड रिज हिल स्टेशन',
      type: 'tourist_route',
      x: 58,
      y: 22,
      platforms: 3,
      electrification: 'Panoramic Mountain Line',
      activeTrains: ['Himalayan Queen Heritage'],
    },
    {
      id: 'redwood_foothills',
      name: 'Redwood Industrial Zone',
      hindiName: 'रेडवुड औद्योगिक क्षेत्र',
      type: 'industrial_zone',
      x: 34,
      y: 50,
      platforms: 5,
      electrification: '25 kV Heavy Haul',
      activeTrains: ['Train 04 (Redwood Crossway)'],
    },
  ];

  const filteredNodes = nodes.filter((n) => {
    if (selectedFilter === 'all') return true;
    return n.type === selectedFilter;
  });

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1];

  const corridorLines: Array<[string, string, string]> = [
    ['northern_apex', 'delhi_central', '#38bdf8'],
    ['delhi_central', 'sanctuary_central', '#f59e0b'],
    ['delhi_central', 'highland_ridge', '#a855f7'],
    ['sanctuary_central', 'pine_valley', '#22c55e'],
    ['sanctuary_central', 'canyon_pass_freight', '#ef4444'],
    ['sanctuary_central', 'redwood_foothills', '#eab308'],
    ['sanctuary_central', 'howrah_kolkata', '#38bdf8'],
    ['sanctuary_central', 'mumbai_cst', '#f59e0b'],
    ['mumbai_cst', 'bengaluru_city', '#38bdf8'],
    ['bengaluru_city', 'chennai_central', '#22c55e'],
    ['chennai_central', 'howrah_kolkata', '#38bdf8'],
    ['canyon_pass_freight', 'howrah_kolkata', '#ef4444'],
  ];

  const getNodeCoords = (id: string) => {
    const n = nodes.find((node) => node.id === id);
    return n ? { x: n.x, y: n.y } : { x: 50, y: 50 };
  };

  const typeColorMap = {
    major_city: '#f59e0b',
    town_village: '#38bdf8',
    military_base: '#22c55e',
    industrial_zone: '#ea580c',
    tourist_route: '#a855f7',
    freight_corridor: '#ef4444',
  };

  const typeLabelMap = {
    major_city: 'Major City / Metropolitan Junction',
    town_village: 'Town & Rural Passenger Stop',
    military_base: 'Strategic Military Base / Research Outpost',
    industrial_zone: 'Industrial Zone & Steel Plant',
    tourist_route: 'Scenic Heritage & Mountain Route',
    freight_corridor: 'Dedicated High-Axle Freight Corridor (DFC)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 animate-fade-in select-none">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#070b14] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/30 border border-red-500/50 text-xl text-amber-300">
              🇮🇳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                  भारतीय रेल • INDIAN RAILWAYS
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  LIVE GRID
                </span>
              </div>
              <h2 className="text-white text-base sm:text-lg font-bold tracking-wide">
                Dynamic Railway Network Across the Entire World
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition-all active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-2.5 bg-[#0b101d] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-mono text-[11px] mr-1">Corridor Filter:</span>
            {[
              { id: 'all', label: 'All Routes' },
              { id: 'major_city', label: 'Major Cities', color: 'text-amber-400' },
              { id: 'military_base', label: 'Military Bases', color: 'text-emerald-400' },
              { id: 'freight_corridor', label: 'Freight DFC', color: 'text-rose-400' },
              { id: 'industrial_zone', label: 'Industrial Zones', color: 'text-orange-400' },
              { id: 'tourist_route', label: 'Tourist Routes', color: 'text-purple-400' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  soundEngine.playUIClick();
                  setSelectedFilter(f.id as any);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedFilter === f.id
                    ? 'bg-amber-600 text-white shadow-md font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
            <span>6 AI Trains Active</span>
            <span>•</span>
            <span className="text-emerald-400">100% 25kV Electrified</span>
            <span>•</span>
            <span>1,000 World Citizens</span>
          </div>
        </div>

        {/* Main Body: Interactive Map on Left, Station Telemetry on Right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden min-h-[460px]">
          
          {/* Map Canvas Viewport (2 cols) */}
          <div className="lg:col-span-2 relative bg-[#050811] p-4 flex items-center justify-center overflow-hidden border-r border-slate-800">
            {/* Ambient Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Glowing Map Frame SVG */}
            <svg className="w-full h-full max-h-[500px]" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Indian Railway Border Outline Contour */}
              <path
                d="M 32 8 Q 40 4 48 8 Q 62 14 65 24 Q 72 32 78 45 Q 84 55 76 68 Q 64 78 54 94 Q 48 98 42 90 Q 34 82 28 66 Q 22 55 24 40 Q 26 24 32 8 Z"
                fill="#0d1829"
                fillOpacity="0.45"
                stroke="#1e3a5f"
                strokeWidth="0.75"
                strokeDasharray="2 1"
              />

              {/* Railway Corridors */}
              {corridorLines.map(([fromId, toId, color], idx) => {
                const c1 = getNodeCoords(fromId);
                const c2 = getNodeCoords(toId);
                return (
                  <g key={`corridor_${idx}`}>
                    {/* Outer Glow Line */}
                    <line
                      x1={c1.x}
                      y1={c1.y}
                      x2={c2.x}
                      y2={c2.y}
                      stroke={color}
                      strokeWidth="1.2"
                      strokeOpacity="0.7"
                      filter="url(#glow)"
                    />
                    {/* Core Track Line */}
                    <line
                      x1={c1.x}
                      y1={c1.y}
                      x2={c2.x}
                      y2={c2.y}
                      stroke="#ffffff"
                      strokeWidth="0.4"
                      strokeDasharray="1.5 1"
                    />

                    {/* Animated Moving Train Pulse along track */}
                    <circle
                      r="1.0"
                      fill="#ffffff"
                      opacity="0.9"
                    >
                      <animate
                        attributeName="cx"
                        from={c1.x}
                        to={c2.x}
                        dur={`${7 + (idx % 4) * 2}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        from={c1.y}
                        to={c2.y}
                        dur={`${7 + (idx % 4) * 2}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                );
              })}

              {/* Station Nodes */}
              {filteredNodes.map((n) => {
                const isSelected = n.id === selectedNodeId;
                const nodeColor = typeColorMap[n.type];
                return (
                  <g
                    key={n.id}
                    className="cursor-pointer transition-transform hover:scale-125"
                    onClick={() => {
                      soundEngine.playUIClick();
                      setSelectedNodeId(n.id);
                    }}
                  >
                    {/* Outer Ring Pulse */}
                    {isSelected && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r="3.5"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="0.6"
                        opacity="0.8"
                      >
                        <animate
                          attributeName="r"
                          values="2.2; 4.8; 2.2"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.9; 0.2; 0.9"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* Node Core */}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.type === 'major_city' ? 2.2 : 1.6}
                      fill={nodeColor}
                      stroke="#ffffff"
                      strokeWidth="0.6"
                      filter="url(#glow)"
                    />

                    {/* Node Label */}
                    <text
                      x={n.x}
                      y={n.y + 3.4}
                      textAnchor="middle"
                      fill={isSelected ? '#fef08a' : '#cbd5e1'}
                      fontSize={n.type === 'major_city' ? '2.4' : '2.0'}
                      fontFamily="monospace"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      style={{ pointerEvents: 'none' }}
                    >
                      {n.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Legend Overlay */}
            <div className="absolute bottom-3 left-3 bg-[#0a0f1e]/90 border border-slate-800 rounded-xl p-2.5 flex flex-wrap gap-3 text-[10px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                <span>Major City</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                <span>Military Base</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                <span>Freight DFC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-400"></span>
                <span>Tourist Route</span>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Node Telemetry & Controls */}
          <div className="p-5 bg-[#080d1a] flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              {/* Header Info */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-700/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                  {typeLabelMap[selectedNode.type]}
                </span>
                <h3 className="text-white text-base font-bold mt-0.5">
                  {selectedNode.name}
                </h3>
                <p className="text-xs text-amber-300/80 font-medium">
                  {selectedNode.hindiName}
                </p>
              </div>

              {/* Station Facilities & Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Platforms</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedNode.platforms} Island Bays
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Signalling</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    4-Aspect Automatic
                  </span>
                </div>
              </div>

              {/* Electrification */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 block">Electrification & Traction</span>
                <span className="font-mono font-semibold text-sky-300">
                  {selectedNode.electrification}
                </span>
              </div>

              {/* Active Trains at Station */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 block mb-1">Active Scheduled Services</span>
                <div className="space-y-1">
                  {selectedNode.activeTrains.map((trn, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-slate-200">
                      <span className="text-emerald-400">🚆</span>
                      <span className="font-mono text-[11px] truncate">{trn}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Station Security & Amenities */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>RPF Security Post:</span>
                  <span className="text-emerald-400 font-mono">ACTIVE (24x7)</span>
                </div>
                <div className="flex justify-between">
                  <span>Jan Aahaar Dining:</span>
                  <span className="text-amber-400 font-mono">OPERATIONAL</span>
                </div>
                <div className="flex justify-between">
                  <span>CCTV Surveillance:</span>
                  <span className="text-sky-400 font-mono">32 HD CHANNELS</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-2 border-t border-slate-800 mt-4">
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  if (onFastTravelToStation) {
                    onFastTravelToStation(selectedNode.name);
                    onClose();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🚆</span>
                <span>Fast-Travel / Board Train to Station</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  onClose();
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-all"
              >
                Close Network Map
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
