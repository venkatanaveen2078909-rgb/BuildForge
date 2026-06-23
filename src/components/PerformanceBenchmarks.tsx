import React from 'react';
import { Activity, TrendingUp, BarChart2, ShieldCheck, HelpCircle } from 'lucide-react';

export default function PerformanceBenchmarks() {
  // Simulated Percentile Offset values
  const percentiles = [
    { label: 'P50 Latency', value: '1.4 s', desc: 'Typical developer incremental edit run' },
    { label: 'P95 Latency', value: '3.1 s', desc: 'Heavily un-cached module linkage' },
    { label: 'P99 Latency', value: '4.8 s', desc: 'Cold distributed workspace bootstrap' }
  ];

  // Mock data for charting
  const historicalBuilds = [
    { buildNum: '#1039', durationSec: 1.4, queueDepth: 0, throughput: 8 },
    { buildNum: '#1040', durationSec: 2.1, queueDepth: 2, throughput: 6 },
    { buildNum: '#1041', durationSec: 4.8, queueDepth: 4, throughput: 3 },
    { buildNum: '#1042', durationSec: 3.2, queueDepth: 1, throughput: 7 },
    { buildNum: '#1043', durationSec: 1.2, queueDepth: 0, throughput: 9 },
    { buildNum: '#1044', durationSec: 1.5, queueDepth: 0, throughput: 9 },
    { buildNum: '#1045', durationSec: 1.1, queueDepth: 0, throughput: 110 }
  ];

  // SVG dimensions for charts
  const svgW = 480;
  const svgH = 120;

  // Render SVG Line Chart points for Build Durations:
  // Coordinates mapping: X spaced equally, Y mapped to inverse scale of height
  const maxSec = 5.0;
  const points = historicalBuilds.map((b, idx) => {
    const x = 40 + idx * ((svgW - 80) / (historicalBuilds.length - 1));
    const y = svgH - 20 - (b.durationSec / maxSec) * (svgH - 40);
    return { x, y, build: b.buildNum, val: b.durationSec };
  });

  const polylinePath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-6" id="benchmark_dashboard">
      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {percentiles.map((p) => (
          <div key={p.label} className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col justify-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#88888E]">{p.label}</span>
            <span className="text-2xl font-mono font-extrabold text-white mt-1">{p.value}</span>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">{p.desc}</p>
          </div>
        ))}

        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col justify-center">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#88888E]">COORDINATION PARALLELISM RATE</span>
          <span className="text-2xl font-mono font-extrabold text-[#4ADE80] mt-1">94.2%</span>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">Avoidable thread idling loss ratio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Historical Compile Duration chart */}
        <div className="bg-[#0D0E11]/80 border border-white/10 p-5 rounded-lg flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-status-blue" />
              <h4 className="text-[10px] uppercase font-mono text-white font-bold tracking-widest">Historical Build Durations (s)</h4>
            </div>
          </div>

          <div className="bg-black/40 p-2.5 rounded border border-white/5 flex flex-col items-center justify-center">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto text-zinc-600">
              {/* grid lines */}
              <line x1="40" y1="20" x2={svgW - 40} y2="20" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
              <line x1="40" y1="60" x2={svgW - 40} y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
              <line x1="40" y1="100" x2={svgW - 40} y2="100" stroke="rgba(255,255,255,0.07)" />

              {/* Line connector */}
              <polyline
                fill="none"
                stroke="#60A5FA"
                strokeWidth="2.5"
                points={polylinePath}
                className="transition-all duration-300"
              />

              {/* Data points circles */}
              {points.map((p, i) => (
                <g key={i} className="group relative">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="#050506"
                    stroke="#60A5FA"
                    strokeWidth="2"
                    className="cursor-crosshair hover:r-6 hover:fill-[#60A5FA] transition"
                  />
                  {/* Label coordinates text */}
                  <text x={p.x} y={115} fill="#88888E" fontSize="8" textAnchor="middle" fontFamily="monospace">
                    {p.build}
                  </text>
                  <text x={p.x} y={p.y - 8} fill="#E0E0E0" fontSize="8" textAnchor="middle" fontFamily="monospace">
                    {p.val}s
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <p className="font-mono text-[9px] text-[#88888E] mt-3 leading-tight select-none">
            Compile times drops after Build #1041 due to high index-matching cache reuse inside work-stealer.
          </p>
        </div>

        {/* Throughput and Queue Depth stats */}
        <div className="bg-[#0D0E11]/80 border border-white/10 p-5 rounded-lg flex flex-col">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
            <BarChart2 className="w-3.5 h-3.5 text-status-amber" />
            <h4 className="text-[10px] uppercase font-mono text-[#E0E0E0] font-bold tracking-widest">Topological Queue Depth History</h4>
          </div>

          <div className="bg-black/40 p-2.5 rounded border border-white/5 flex flex-col items-center justify-center">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto text-zinc-600">
              {/* grid lines */}
              <line x1="40" y1="20" x2={svgW - 40} y2="20" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
              <line x1="40" y1="100" x2={svgW - 40} y2="100" stroke="rgba(255,255,255,0.07)" />

              {/* Bar charts represent peak targets queued */}
              {historicalBuilds.map((b, idx) => {
                const x = 45 + idx * ((svgW - 80) / (historicalBuilds.length - 1)) - 10;
                const barH = (b.queueDepth / 5) * (svgH - 40);
                const y = svgH - 20 - barH;

                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={y}
                      width="18"
                      height={Math.max(barH, 2)}
                      fill="#FBBF24"
                      className="opacity-75 hover:opacity-100 transition"
                      rx="1"
                    />
                    <text x={x + 9} y={115} fill="#88888E" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      {b.buildNum}
                    </text>
                    <text x={x + 9} y={y - 5} fill="#FBBF24" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      {b.queueDepth}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="font-mono text-[9px] text-[#88888E] mt-3 leading-tight select-none">
            Queue peaks at Build #1041 due to complex dependency depths of cold linking core targets.
          </p>
        </div>
      </div>
    </div>
  );
}
