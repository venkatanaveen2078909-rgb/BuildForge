import React from 'react';
import { Server, Activity, ShieldAlert, Wifi, Cpu, Layers } from 'lucide-react';
import { WorkerState } from '../types';

interface WorkerClusterProps {
  workers: WorkerState[];
  onKillWorker: (id: string) => void;
  onReviveWorker: (id: string) => void;
}

export default function WorkerCluster({
  workers,
  onKillWorker,
  onReviveWorker
}: WorkerClusterProps) {
  return (
    <div className="space-y-6" id="worker_cluster_dashboard">
      {/* Cluster Metrics Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#88888E]">REGISTERED CORES</span>
          <span className="text-2xl font-mono font-extrabold text-white">
            {workers.reduce((acc, w) => acc + (w.status !== 'DEAD' ? w.capacity : 0), 0)} / 16
          </span>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">Available execution strands</p>
        </div>

        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#88888E]">AVG CLUSTER LATENCY</span>
          <span className="text-2xl font-mono font-extrabold text-[#60A5FA]">
            {workers.some(w => w.status !== 'DEAD') ? '1.45 ms' : 'N/A'}
          </span>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">gRPC Roundtrip ACK time</p>
        </div>

        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#88888E]">TOTAL HEAP RESERVATION</span>
          <span className="text-2xl font-mono font-extrabold text-white">
            {workers.reduce((acc, w) => acc + (w.status !== 'DEAD' ? w.memoryUsage : 0), 0)} MiB
          </span>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">RAM commitment inside Bazel workspace</p>
        </div>

        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#88888E]">CLUSTER THROUGHPUT</span>
          <span className="text-2xl font-mono font-extrabold text-[#4ADE80]">
            {workers.filter(w => w.status === 'EXECUTING').length * 4.2 + 8.1} targets/min
          </span>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">Active compiler speed</p>
        </div>
      </div>

      {/* Grid of gRPC worker compute nodes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {workers.map((worker) => {
          const isDead = worker.status === 'DEAD';
          
          return (
            <div
              key={worker.id}
              className={`bg-[#0D0E11]/85 border p-5 rounded-lg flex flex-col relative overflow-hidden transition-all duration-200 ${
                isDead ? 'border-red-900 bg-red-950/5' : 'border-white/10 hover:border-white/15 shadow-md shadow-black/30'
              }`}
            >
              {/* Node status light */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-transparent to-transparent"></div>

              {/* Header inside worker card */}
              <div className="flex items-start justify-between pb-3 border-b border-white/5 mb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Server className={`w-3.5 h-3.5 ${isDead ? 'text-red-500' : 'text-status-blue'}`} />
                    <span className="font-mono text-sm font-bold text-white tracking-tight">{worker.id}</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">Target Architect: x86_64</span>
                </div>

                {isDead ? (
                  <span className="px-2 py-0.5 bg-red-950/35 text-red-400 border border-red-500/10 font-bold rounded text-[9px] font-mono tracking-widest">
                    OFFLINE
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest uppercase border ${
                    worker.status === 'EXECUTING' ? 'bg-amber-950/30 border-amber-500/20 text-[#FBBF24]' :
                    worker.status === 'FETCHING_INPUTS' ? 'bg-blue-950/20 border-status-blue/20 text-[#60A5FA]' :
                    'bg-zinc-900 border-zinc-800 text-[#4ADE80]'
                  }`}>
                    {worker.status}
                  </span>
                )}
              </div>

              {!isDead ? (
                <div className="space-y-4 font-mono text-xs text-zinc-300 flex-1">
                  {/* Cpu meter progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Cpu className="w-3 h-3" /> THREAD_MUTEX_LOAD
                      </span>
                      <span className="text-white font-bold">{worker.cpuUsage}%</span>
                    </div>
                    <div className="h-1.5 bg-black rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          worker.cpuUsage > 75 ? 'bg-red-500' : worker.cpuUsage > 40 ? 'bg-[#FBBF24]' : 'bg-status-blue'
                        }`}
                        style={{ width: `${worker.cpuUsage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Latency and Throughput stats */}
                  <div className="grid grid-cols-2 gap-4 text-[11px] pt-1">
                    <div className="bg-[#050506] p-2.5 rounded border border-white/5">
                      <p className="text-zinc-500 text-[9px]">PING LATENCY</p>
                      <p className="text-white font-bold text-xs mt-0.5">
                        {worker.status === 'EXECUTING' ? '1.58 ms' : '0.92 ms'}
                      </p>
                    </div>
                    <div className="bg-[#050506] p-2.5 rounded border border-white/5">
                      <p className="text-zinc-500 text-[9px]">LOCAL BATCH DEQUE</p>
                      <p className="text-white font-bold text-xs mt-0.5">
                        {worker.activeTaskId ? '1 target active' : '0 empty'}
                      </p>
                    </div>
                  </div>

                  {/* Active target compile string */}
                  <div className="bg-black/40 p-3 rounded border border-white/5 space-y-1">
                    <p className="text-[10px] text-zinc-500">ACTIVE COMPILER TASK</p>
                    <p className="text-white text-xs font-bold font-mono truncate">
                      {worker.activeTaskId ? worker.activeTaskId.replace('//:', ':') : 'idle waiting for build'}
                    </p>
                  </div>

                  {/* RAM storage parameters */}
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>RAM Heap Commit</span>
                    <span className="text-white font-bold">{worker.memoryUsage} MiB</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>C++ Compilation Unit</span>
                    <span className="text-zinc-400 select-none">C++23 Modules Spec</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black/20 rounded border border-red-950/20 mb-4">
                  <ShieldAlert className="w-8 h-8 text-red-500/40 mb-2" />
                  <p className="text-[11px] text-zinc-400 font-mono font-bold">ACK HEARTBEAT_FAILED</p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-1">Node is disconnected from core coordination socket.</p>
                </div>
              )}

              {/* Tags inside card footer */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {worker.tags.map((tag, i) => (
                    <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 bg-[#050506] border border-white/5 text-zinc-500 rounded uppercase">
                      {tag}
                    </span>
                  ))}
                </div>

                {isDead ? (
                  <button
                    onClick={() => onReviveWorker(worker.id)}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold bg-[#4ADE80]/10 hover:bg-[#4ADE80] border border-[#4ADE80]/20 text-[#4ADE80] hover:text-black rounded transition select-none flex items-center gap-1 cursor-pointer"
                  >
                    <Wifi className="w-3 h-3" /> RECONNECT_NODE
                  </button>
                ) : (
                  <button
                    onClick={() => onKillWorker(worker.id)}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold bg-red-950/20 hover:bg-red-600 border border-red-900 text-red-400 hover:text-white rounded transition select-none cursor-pointer"
                  >
                    KILL_WORKER
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
