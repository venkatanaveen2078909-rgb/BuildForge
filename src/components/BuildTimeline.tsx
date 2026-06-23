import React, { useState, useMemo } from 'react';
import { Clock, Filter, Server, Calendar, CheckCircle2, RefreshCw, Layers } from 'lucide-react';
import { BuildSession } from '../types';

interface BuildTimelineProps {
  logs: { id: string; msg: string; type: string }[];
  activeBuild: BuildSession | null;
  historyBuilds: BuildSession[];
}

interface TimelineItem {
  id: string;
  timestamp: string;
  task: string;
  durationMs: number;
  workerId: string;
  status: 'SUCCEEDED' | 'CACHED' | 'RUNNING' | 'FAILED' | 'QUEUED';
  buildId: string;
}

export default function BuildTimeline({
  logs,
  activeBuild,
  historyBuilds
}: BuildTimelineProps) {
  const [filterWorker, setFilterWorker] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterBuildId, setFilterBuildId] = useState<string>('ALL');

  // Derive structural logs matching compilation target outcomes
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const list: TimelineItem[] = [];

    // Synthesize items from previous and active build runs to display full data depth
    const allBuilds = [...historyBuilds];
    if (activeBuild) {
      allBuilds.unshift(activeBuild);
    }

    // Default seed logs always visible for high fidelity
    const baseDate = new Date();
    
    allBuilds.forEach((b) => {
      // Create global parsing steps
      list.push({
        id: `${b.buildId}-parse`,
        timestamp: new Date(new Date(b.startTime).getTime() - 2200).toISOString().substring(11, 19),
        task: 'WORKSPACE //BUILD Spec Lexer Analysis Completed',
        durationMs: 34,
        workerId: 'coordinator-node',
        status: 'SUCCEEDED',
        buildId: b.buildId
      });

      list.push({
        id: `${b.buildId}-dag`,
        timestamp: new Date(new Date(b.startTime).getTime() - 1100).toISOString().substring(11, 19),
        task: 'Topological Kahn Sorted Dependency Tree Generation',
        durationMs: 12,
        workerId: 'coordinator-node',
        status: 'SUCCEEDED',
        buildId: b.buildId
      });

      // Targets steps
      Object.entries(b.targets).forEach(([targetName, details]) => {
        const timeOffset = Math.floor(Math.random() * 2000) + 1000;
        list.push({
          id: `${b.buildId}-${targetName}`,
          timestamp: new Date(new Date(b.startTime).getTime() + timeOffset).toISOString().substring(11, 19),
          task: `COMPILE C++ MODULE: ${targetName}`,
          durationMs: details.durationMs || Math.floor(Math.random() * 1200 + 1000),
          workerId: details.workerId || (targetName.includes('utils') ? 'worker-us-central1-a' : 'worker-us-east4-b'),
          status: details.status,
          buildId: b.buildId
        });
      });

      // final linking step if succeeded
      if (b.status === 'SUCCEEDED') {
        list.push({
          id: `${b.buildId}-link`,
          timestamp: new Date(new Date(b.endTime || b.startTime).getTime()).toISOString().substring(11, 19),
          task: `gRPC LINK ASSEMBLY core_native_elf_binary`,
          durationMs: 420,
          workerId: 'coordinator-node',
          status: 'SUCCEEDED',
          buildId: b.buildId
        });
      }
    });

    // Fallback if no simulations have run yet
    if (list.length === 0) {
      const mockTimeStr = (offsetSec: number) => {
        const d = new Date(baseDate.getTime() - offsetSec * 1000);
        return d.toISOString().substring(11, 19);
      };
      
      return [
        { id: '1', timestamp: mockTimeStr(25), task: 'WORKSPACE //BUILD Spec Lexer Analysis Completed', durationMs: 45, workerId: 'coordinator-node', status: 'SUCCEEDED', buildId: 'b-9022' },
        { id: '2', timestamp: mockTimeStr(24), task: 'Topological Kahn Sorted Dependency Tree Generation', durationMs: 18, workerId: 'coordinator-node', status: 'SUCCEEDED', buildId: 'b-9022' },
        { id: '3', timestamp: mockTimeStr(22), task: 'COMPILE C++ MODULE: //:common_utils', durationMs: 1450, workerId: 'worker-us-central1-a', status: 'CACHED', buildId: 'b-9022' },
        { id: '4', timestamp: mockTimeStr(18), task: 'COMPILE C++ MODULE: //:graph_engine', durationMs: 2310, workerId: 'worker-us-east4-b', status: 'SUCCEEDED', buildId: 'b-9022' },
        { id: '5', timestamp: mockTimeStr(12), task: 'COMPILE C++ MODULE: //:work_stealer', durationMs: 1812, workerId: 'worker-europe-west3-c', status: 'SUCCEEDED', buildId: 'b-9022' },
        { id: '6', timestamp: mockTimeStr(8), task: 'COMPILE C++ MODULE: //:buildforge_core', durationMs: 3400, workerId: 'worker-us-central1-a', status: 'SUCCEEDED', buildId: 'b-9022' },
        { id: '7', timestamp: mockTimeStr(2), task: 'gRPC LINK ASSEMBLY core_native_elf_binary', durationMs: 640, workerId: 'coordinator-node', status: 'SUCCEEDED', buildId: 'b-9022' }
      ];
    }

    return list;
  }, [historyBuilds, activeBuild]);

  // Extract filters parameters dynamically
  const workerOptions = useMemo(() => {
    const set = new Set<string>();
    timelineItems.forEach(item => {
      if (item.workerId) set.add(item.workerId);
    });
    return Array.from(set).sort();
  }, [timelineItems]);

  const buildIdOptions = useMemo(() => {
    const set = new Set<string>();
    timelineItems.forEach(item => {
      if (item.buildId) set.add(item.buildId);
    });
    return Array.from(set).sort();
  }, [timelineItems]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return timelineItems.filter(item => {
      if (filterWorker !== 'ALL' && item.workerId !== filterWorker) return false;
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (filterBuildId !== 'ALL' && item.buildId !== filterBuildId) return false;
      return true;
    });
  }, [timelineItems, filterWorker, filterStatus, filterBuildId]);

  return (
    <div className="bg-[#0D0E11] border border-white/10 rounded-lg p-5 flex flex-col h-[520px]" id="build_timeline_explorer">
      {/* Filters Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 mb-5 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-status-green" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Distributed Execution Timeline</span>
        </div>

        {/* Dynamic Filters Form */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-black/40 px-2.5 py-1 rounded border border-white/5">
            <Filter className="w-3 h-3 text-zinc-500" />
            <span>FILTER:</span>
          </div>

          <select
            value={filterBuildId}
            onChange={(e) => setFilterBuildId(e.target.value)}
            className="bg-black/90 border border-white/5 px-2 py-1 text-[11px] font-mono rounded text-zinc-300 outline-none hover:border-white/15 focus:border-status-blue"
          >
            <option value="ALL">ALL BUILDS</option>
            {buildIdOptions.map(id => (
              <option key={id} value={id}>BUILD {id}</option>
            ))}
          </select>

          <select
            value={filterWorker}
            onChange={(e) => setFilterWorker(e.target.value)}
            className="bg-black/90 border border-white/5 px-2 py-1 text-[11px] font-mono rounded text-zinc-300 outline-none hover:border-white/15 focus:border-status-blue"
          >
            <option value="ALL">ALL WORKERS</option>
            {workerOptions.map(workerId => (
              <option key={workerId} value={workerId}>{workerId}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-black/90 border border-white/5 px-2 py-1 text-[11px] font-mono rounded text-zinc-300 outline-none hover:border-white/15 focus:border-status-blue"
          >
            <option value="ALL">ALL STATUS</option>
            <option value="SUCCEEDED">SUCCEEDED</option>
            <option value="CACHED">CACHED</option>
            <option value="RUNNING">RUNNING</option>
            <option value="QUEUED">QUEUED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Timeline items list stream */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 font-mono scrollbar-thin">
        {filteredItems.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
            No trace tasks match specified cluster configurations.
          </div>
        ) : (
          <div className="relative border-l border-white/5 ml-3 pl-4 space-y-4">
            {filteredItems.map((item, index) => {
              // Timeline Node Badge Color styling
              let badgeColor = 'bg-zinc-800 text-zinc-500 ring-zinc-700/30';
              if (item.status === 'SUCCEEDED') badgeColor = 'bg-emerald-950/45 text-[#4ADE80] ring-emerald-500/20';
              else if (item.status === 'CACHED') badgeColor = 'bg-blue-950/45 text-[#60A5FA] ring-blue-500/20';
              else if (item.status === 'RUNNING') badgeColor = 'bg-amber-950/45 text-amber-300 ring-amber-400/20 animate-pulse';
              else if (item.status === 'FAILED') badgeColor = 'bg-red-950/45 text-red-400 ring-red-500/20';

              return (
                <div key={item.id} className="relative group">
                  {/* Outer circle layout */}
                  <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 transition-all duration-300 ${badgeColor}`}></div>

                  <div className="bg-black/25 hover:bg-black/45 border border-white/5 hover:border-white/10 p-3 rounded transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] text-zinc-500 pt-0.5 whitespace-nowrap">{item.timestamp}</span>
                      
                      <div>
                        {/* Task identification */}
                        <h5 className="text-xs text-white font-bold tracking-tight">{item.task}</h5>
                        <div className="flex items-center gap-2.5 mt-1.5 text-[9px] text-[#88888E]">
                          <span className="bg-white/5 px-1 py-0.5 rounded border border-white/5 font-extrabold text-white">ID: {item.buildId}</span>
                          <span className="flex items-center gap-1">
                            <Server className="w-2.5 h-2.5 text-status-blue" /> {item.workerId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3.5 pl-10 md:pl-0">
                      <span className="text-[10px] text-zinc-400 select-none bg-black px-1.5 py-0.5 rounded border border-white/5">
                        +{item.durationMs} ms
                      </span>
                      <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-bold tracking-wider ${
                        item.status === 'SUCCEEDED' ? 'bg-[#4ADE80]/15 text-[#4ADE80]' :
                        item.status === 'CACHED' ? 'bg-[#60A5FA]/15 text-status-blue' :
                        item.status === 'RUNNING' ? 'bg-[#FBBF24]/15 text-status-amber animate-pulse' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-white/5 text-[9px] font-mono text-zinc-500 text-right selection:bg-transparent shrink-0">
        Trace log latency generated via Bazel core emulator protocols.
      </div>
    </div>
  );
}
