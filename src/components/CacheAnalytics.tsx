import React from 'react';
import { Database, ShieldCheck, Zap, HardDrive, LayoutGrid, Award, Calendar } from 'lucide-react';
import { SystemMetrics } from '../types';

interface CacheAnalyticsProps {
  metrics: SystemMetrics;
}

export default function CacheAnalytics({ metrics }: CacheAnalyticsProps) {
  const hitPercentage = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(1);
  const missPercentage = (100 - parseFloat(hitPercentage)).toFixed(1);

  // Simulated daily cache hit efficiencies values
  const dailyEfficiency = [
    { day: 'Mon', ratio: 72 },
    { day: 'Tue', ratio: 68 },
    { day: 'Wed', ratio: 84 },
    { day: 'Thu', ratio: 91 },
    { day: 'Fri', ratio: 79 },
    { day: 'Sat', ratio: 82 },
    { day: 'Sun', ratio: 86 }
  ];

  // Most reused artifacts
  const reuseLeaderboard = [
    { artifact: '//:common_utils.cpp.o', size: '240.2 KB', count: 48, saveMs: 145000 },
    { artifact: 'libgraph_engine.so', size: '1.24 MB', count: 32, saveMs: 91000 },
    { artifact: 'scheduler_test.o', size: '410.8 KB', count: 18, saveMs: 34000 },
    { artifact: 'hash.cpp.h.index', size: '12.4 KB', count: 11, saveMs: 8200 }
  ];

  // Visual Heatmap Matrix block grid (12 columns x 4 rows representing cache block storage utilization)
  const heatmapCells = Array.from({ length: 48 }, (_, i) => {
    // Distribute weights for beautiful varying intensity
    const intensity = (i * 7 + 13) % 5; // 0, 1, 2, 3, 4
    return {
      index: i,
      intensity,
      label: `Block #${4000 + i}`
    };
  });

  return (
    <div className="space-y-6" id="cache_analytics_module">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col items-center text-center justify-center relative">
          <Database className="w-5 h-5 text-status-blue mb-1" />
          <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Hit Efficiency</span>
          <span className="text-2xl font-mono font-extrabold text-[#60A5FA] mt-1">{hitPercentage}%</span>
          <p className="text-[10px] text-zinc-600 font-mono mt-1">Incremental ratio</p>
        </div>

        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col items-center text-center justify-center relative">
          <Zap className="w-5 h-5 text-status-green mb-1" />
          <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Bytes Saved</span>
          <span className="text-2xl font-mono font-extrabold text-[#4ADE80] mt-1">
            {Math.round(metrics.bytesSaved / 1024)} KiB
          </span>
          <p className="text-[10px] text-zinc-600 font-mono mt-1">No compile IO overhead</p>
        </div>

        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col items-center text-center justify-center relative">
          <ShieldCheck className="w-5 h-5 text-status-amber mb-1" />
          <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Build Time Saved</span>
          <span className="text-2xl font-mono font-extrabold text-[#FBBF24] mt-1">
            {(metrics.timeSavedMs / 1000).toFixed(1)} s
          </span>
          <p className="text-[10px] text-zinc-600 font-mono mt-1">CPU cores hours saved</p>
        </div>

        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col items-center text-center justify-center relative">
          <Award className="w-5 h-5 text-white/60 mb-1" />
          <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Artifact Count</span>
          <span className="text-2xl font-mono font-extrabold text-white mt-1">1,402</span>
          <p className="text-[10px] text-zinc-600 font-mono mt-1">Zstd tarballs in store</p>
        </div>

        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col items-center text-center justify-center relative">
          <HardDrive className="w-5 h-5 text-zinc-500 mb-1" />
          <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Storage Utilization</span>
          <span className="text-2xl font-mono font-extrabold text-white mt-1">2.41 GiB</span>
          <p className="text-[10px] text-zinc-600 font-mono mt-1">Limit: 50.0 GiB</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Heatmap Section */}
        <div className="bg-[#0D0E11]/80 border border-white/10 p-5 rounded-lg flex flex-col">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
            <LayoutGrid className="w-3.5 h-3.5 text-status-blue" />
            <h4 className="text-[10px] uppercase font-mono text-white font-bold tracking-widest">Compiler Block Cache Heatmap</h4>
          </div>

          <p className="text-[11px] font-mono text-zinc-400 mb-4 leading-relaxed">
            Visual block usage matrix inside cluster cache layer. Higher visibility colors describe heavier hit counts.
          </p>

          <div className="grid grid-cols-12 gap-1.5 flex-1 relative justify-center bg-black/30 p-2.5 rounded border border-white/5">
            {heatmapCells.map((cell) => {
              // intensity colors
              let cellColor = 'bg-[#050506] hover:bg-zinc-800';
              if (cell.intensity === 1) cellColor = 'bg-blue-950/40 border border-blue-900/40 text-blue-300';
              else if (cell.intensity === 2) cellColor = 'bg-blue-900/60 border border-blue-800/40 text-blue-200';
              else if (cell.intensity === 3) cellColor = 'bg-[#60A5FA]/60 border border-[#60A5FA]/30 text-white';
              else if (cell.intensity === 4) cellColor = 'bg-[#60A5FA] border border-white/10 text-black shadow-[0_0_10px_rgba(96,165,250,0.3)]';

              return (
                <div
                  key={cell.index}
                  className={`aspect-square rounded-[1px] transition-all duration-150 relative cursor-crosshair group flex items-center justify-center ${cellColor}`}
                >
                  <span className="absolute hidden group-hover:block bottom-full mb-1 bg-black text-white text-[9px] font-mono px-2 py-1 rounded border border-white/10 whitespace-nowrap z-30">
                    {cell.label} (Hits: {cell.intensity * 12 + 4})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Color Key */}
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-4">
            <span>Least hit activity</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[1px] bg-[#050506] border border-white/5"></span>
              <span className="w-2.5 h-2.5 rounded-[1px] bg-blue-950/40"></span>
              <span className="w-2.5 h-2.5 rounded-[1px] bg-blue-900/60"></span>
              <span className="w-2.5 h-2.5 rounded-[1px] bg-[#60A5FA]/60"></span>
              <span className="w-2.5 h-2.5 rounded-[1px] bg-[#60A5FA]"></span>
            </div>
            <span>Heaviest compiler hit reuse</span>
          </div>
        </div>

        {/* Daily efficiency bar metrics */}
        <div className="bg-[#0D0E11]/80 border border-white/10 p-5 rounded-lg flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
            <Calendar className="w-3.5 h-3.5 text-status-amber" />
            <h4 className="text-[10px] uppercase font-mono text-white font-bold tracking-widest">7-Day Cache Efficiency</h4>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {dailyEfficiency.map((item) => (
              <div key={item.day} className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold">{item.day}</span>
                  <span className="text-white">{item.ratio}% Ratio</span>
                </div>
                <div className="h-2 bg-black rounded overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-status-blue transition-all duration-300"
                    style={{ width: `${item.ratio}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most reused artifacts lists */}
        <div className="bg-[#0D0E11]/80 border border-white/10 p-5 rounded-lg flex flex-col">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
            <Award className="w-3.5 h-3.5 text-status-green" />
            <h4 className="text-[10px] uppercase font-mono text-white font-bold tracking-widest">Artifact Cache Leaderboard</h4>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {reuseLeaderboard.map((item) => (
              <div
                key={item.artifact}
                className="bg-black/40 border border-white/5 p-3 rounded flex flex-col justify-between hover:border-white/10 transition"
              >
                <div className="flex justify-between items-start">
                  <p className="font-mono text-xs font-bold text-white truncate max-w-[170px]">{item.artifact}</p>
                  <span className="text-[9px] font-mono text-zinc-500 bg-black border border-white/5 px-1 py-0.5 rounded">
                    {item.size}
                  </span>
                </div>

                <div className="flex justify-between items-center mt-3 text-[10px] font-mono">
                  <span className="text-zinc-500">REUSE TICK TIMES:</span>
                  <span className="text-[#4ADE80] font-bold">{item.count}x hits</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-zinc-500 font-semibold text-[9px] uppercase">TOTAL LATENCY SAVES:</span>
                  <span className="text-[#60A5FA] font-bold">{(item.saveMs / 1000).toFixed(1)}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
