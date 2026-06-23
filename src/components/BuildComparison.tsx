import React, { useState } from 'react';
import { Columns, ArrowRight, CheckCircle2, AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react';

interface CompareStats {
  id: string;
  name: string;
  timeSec: number;
  cacheHitRatio: number;
  failedTargetsCount: number;
  workerUsagePct: number;
  artifactsSizeKB: number;
  commitHash: string;
}

export default function BuildComparison() {
  const [buildAId, setBuildAId] = useState<string>('B-1042');
  const [buildBId, setBuildBId] = useState<string>('B-1045');

  // Simulated static compilation states for comparative analysis
  const buildsCatalog: Record<string, CompareStats> = {
    'B-1042': {
      id: 'B-1042',
      name: 'Build #1042 (Pruned workspace cold run)',
      timeSec: 4.8,
      cacheHitRatio: 25,
      failedTargetsCount: 1,
      workerUsagePct: 88,
      artifactsSizeKB: 2410,
      commitHash: '8b41ca0'
    },
    'B-1043': {
      id: 'B-1043',
      name: 'Build #1043 (Post-outage incremental retry)',
      timeSec: 3.1,
      cacheHitRatio: 60,
      failedTargetsCount: 0,
      workerUsagePct: 54,
      artifactsSizeKB: 1840,
      commitHash: 'fa20db1'
    },
    'B-1044': {
      id: 'B-1044',
      name: 'Build #1044 (Traced compiler profile test)',
      timeSec: 1.8,
      cacheHitRatio: 82,
      failedTargetsCount: 0,
      workerUsagePct: 35,
      artifactsSizeKB: 1240,
      commitHash: '31cb54d'
    },
    'B-1045': {
      id: 'B-1045',
      name: 'Build #1045 (Optimized content hash cache hit)',
      timeSec: 1.1,
      cacheHitRatio: 95,
      failedTargetsCount: 0,
      workerUsagePct: 15,
      artifactsSizeKB: 320,
      commitHash: 'bc40fe2'
    }
  };

  const a = buildsCatalog[buildAId] || buildsCatalog['B-1042'];
  const b = buildsCatalog[buildBId] || buildsCatalog['B-1045'];

  // Comparative calculations helper
  const calcDiff = (valA: number, valB: number, lowerIsBetter: boolean) => {
    if (valA === valB) return { text: 'equal', positive: null };
    const pct = ((Math.abs(valA - valB) / Math.max(valA, 1)) * 100).toFixed(0);
    const winForB = lowerIsBetter ? valB < valA : valB > valA;
    return {
      text: `${pct}% ${winForB ? 'faster/better' : 'slower/worse'}`,
      positive: winForB
    };
  };

  const timeDiff = calcDiff(a.timeSec, b.timeSec, true);
  const cacheDiff = calcDiff(a.cacheHitRatio, b.cacheHitRatio, false);
  const failedDiff = calcDiff(a.failedTargetsCount, b.failedTargetsCount, true);
  const workerDiff = calcDiff(a.workerUsagePct, b.workerUsagePct, true);
  const sizeDiff = calcDiff(a.artifactsSizeKB, b.artifactsSizeKB, true);

  return (
    <div className="bg-[#050506]/35 border border-white/10 p-5 rounded-lg flex flex-col gap-6" id="build_comparison_engine">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Columns className="w-4 h-4 text-status-blue" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Historical Compiler Comparison engine</span>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono">Comparing binary hash compiler metrics</p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/60 p-4 rounded border border-white/5 font-mono text-xs">
        <div className="flex flex-col gap-2">
          <label className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Select Baseline Build (A):</label>
          <select
            value={buildAId}
            onChange={(e) => setBuildAId(e.target.value)}
            className="bg-[#0D0E11] text-white border border-white/10 rounded px-2.5 py-1.5 focus:border-[#60A5FA] outline-none"
          >
            {Object.keys(buildsCatalog).map((id) => (
              <option key={id} value={id}>Build {id} [commit: {buildsCatalog[id].commitHash}]</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Select Target Build (B):</label>
          <select
            value={buildBId}
            onChange={(e) => setBuildBId(e.target.value)}
            className="bg-[#0D0E11] text-white border border-white/10 rounded px-2.5 py-1.5 focus:border-[#60A5FA] outline-none"
          >
            {Object.keys(buildsCatalog).map((id) => (
              <option key={id} value={id}>Build {id} [commit: {buildsCatalog[id].commitHash}]</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Comparative Matrix Analytics</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px]">
          {/* Build A Sidebar card */}
          <div className="bg-[#0D0E11] border border-white/10 p-4 rounded-lg space-y-4">
            <div className="border-b border-white/5 pb-2">
              <span className="text-[9px] text-[#88888E] uppercase tracking-wider">BUILD A</span>
              <h5 className="text-sm text-white font-bold truncate mt-1">{a.name}</h5>
              <code className="text-[9px] text-zinc-500 mt-1 block">commit: {a.commitHash}</code>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Duration Time:</span>
                <span className="text-white font-bold">{a.timeSec} s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cache Hits:</span>
                <span className="text-[#60A5FA] font-bold">{a.cacheHitRatio}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Failed Targets:</span>
                <span className={a.failedTargetsCount > 0 ? 'text-red-400 font-bold' : 'text-zinc-400'}>{a.failedTargetsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Allocated CPU usage:</span>
                <span className="text-zinc-300">{a.workerUsagePct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Output tarballs:</span>
                <span className="text-zinc-300">{a.artifactsSizeKB} KiB</span>
              </div>
            </div>
          </div>

          {/* Delta Comparison Column with dynamic visualizer improvements */}
          <div className="bg-[#0D0E11] border border-white/10 p-4 rounded-lg flex flex-col justify-between">
            <div className="border-b border-white/5 pb-2">
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">CALCULATED COMPARATOR DELTA</span>
              <span className="text-xs text-[#60A5FA] font-bold block mt-1">A vs B Improvements</span>
            </div>

            <div className="space-y-3 py-2 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded">
                <span className="text-zinc-500">Time delta:</span>
                <span className={`font-bold ${timeDiff.positive ? 'text-[#4ADE80]' : 'text-amber-500'}`}>{timeDiff.text}</span>
              </div>
              
              <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded">
                <span className="text-zinc-500">Cache shift:</span>
                <span className={`font-bold ${cacheDiff.positive ? 'text-[#4ADE80]' : 'text-amber-500'}`}>{cacheDiff.text}</span>
              </div>

              <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded">
                <span className="text-zinc-500">Failed shift:</span>
                <span className={`font-bold ${failedDiff.positive !== false ? 'text-[#4ADE80]' : 'text-red-400'}`}>{failedDiff.text}</span>
              </div>

              <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded">
                <span className="text-zinc-500">CPU shift:</span>
                <span className={`font-bold ${workerDiff.positive ? 'text-[#4ADE80]' : 'text-amber-500'}`}>{workerDiff.text}</span>
              </div>

              <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded">
                <span className="text-zinc-800">Storage saved:</span>
                <span className={`font-bold ${sizeDiff.positive ? 'text-[#4ADE80]' : 'text-amber-500'}`}>{sizeDiff.text}</span>
              </div>
            </div>
          </div>

          {/* Build B Sidebar card */}
          <div className="bg-[#0D0E11] border border-white/10 p-4 rounded-lg space-y-4">
            <div className="border-b border-white/5 pb-2">
              <span className="text-[9px] text-[#88888E] uppercase tracking-wider">BUILD B</span>
              <h5 className="text-sm text-white font-bold truncate mt-1">{b.name}</h5>
              <code className="text-[9px] text-zinc-500 mt-1 block">commit: {b.commitHash}</code>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Duration Time:</span>
                <span className="text-white font-bold">{b.timeSec} s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cache Hits:</span>
                <span className="text-[#60A5FA] font-bold">{b.cacheHitRatio}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Failed Targets:</span>
                <span className={b.failedTargetsCount > 0 ? 'text-red-400 font-bold' : 'text-zinc-400'}>{b.failedTargetsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Allocated CPU usage:</span>
                <span className="text-zinc-300">{b.workerUsagePct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Output tarballs:</span>
                <span className="text-zinc-300">{b.artifactsSizeKB} KiB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conclusion review report */}
        <div className="bg-black/40 p-4 rounded border border-white/5 space-y-1 text-xs font-mono text-zinc-300 flex items-center gap-3">
          <TrendingDown className="w-5 h-5 text-[#4ADE80] shrink-0" />
          <p>
            COMPARATOR ANALYSIS SUMMARY: Build <strong>{buildBId}</strong> represents a <strong>{((a.timeSec - b.timeSec)/a.timeSec * 100).toFixed(0)}% acceleration</strong> in duration compared to Build <strong>{buildAId}</strong>. Content addressable hash matching on compilation buffers prevented duplicate clang++ workloads.
          </p>
        </div>
      </div>
    </div>
  );
}
