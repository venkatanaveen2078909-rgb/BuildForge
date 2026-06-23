import React, { useState } from 'react';
import { HelpCircle, Terminal, Layers, Server, Database, Shuffle, FolderGit } from 'lucide-react';

interface ComponentInfo {
  id: string;
  name: string;
  icon: any;
  responsibilities: string[];
  apis: string[];
  metrics: string[];
  desc: string;
}

export default function ArchitectureExplorer() {
  const [selectedCompId, setSelectedCompId] = useState<string>('coord');

  const components: ComponentInfo[] = [
    {
      id: 'cli',
      name: 'Command-Line Tool (CLI)',
      icon: Terminal,
      desc: 'The developer entry point for executing builds, querying graphs, and outputting local outputs.',
      responsibilities: [
        'Read workspace local BUILD target files configuration properties',
        'Compile local user changes and query graph structures',
        'Establish single duplex gRPC streams to Master Coordinator'
      ],
      apis: [
        'buildforge build //app:main',
        'buildforge query "deps(//app:main)"',
        'buildforge clean'
      ],
      metrics: [
        'CLI startup delay (ms)',
        'Local filesystem scanner throughput'
      ]
    },
    {
      id: 'coord',
      name: 'Master Coordinator Node',
      icon: ShieldCheck, // Custom icon resolved below
      desc: 'The centralized coordinator engine that handles heartbeats, allocates work-stealing queues, and monitors cluster safety.',
      responsibilities: [
        'Validate cluster worker nodes health checks and heartbeats',
        'Coordinate Kahn-sort topological layers and distribute workers',
        'Write trace logs and audit telemetry logs'
      ],
      apis: [
        'RegisterWorkerNode(WorkerInfo) -> ACK',
        'SendHeartbeatStream(stream Heartbeat) -> Ack',
        'ReportBuildTraceStatus(TraceId) -> TraceSpan'
      ],
      metrics: [
        'Registered active core compute threads count',
        'Failover consensus latency timers',
        'gRPC communication roundtrip'
      ]
    },
    {
      id: 'sched',
      name: 'Topological Kahn Scheduler',
      icon: Shuffle,
      desc: 'The graph solver that resolves circular dependency deadlocks and organizes parallelism layers.',
      responsibilities: [
        'Compute topological batches in dynamic tree configurations',
        'Popping and stealing modules inside local queue deques',
        'Balance target compile loads horizontally across nodes'
      ],
      apis: [
        'ResolveTopologicalMatrix(TargetGraph) -> TopoBatches',
        'StealWork(WorkerId, VictimWorkerId) -> TargetJob',
        'ReportQueueDepth() -> Int64'
      ],
      metrics: [
        'Scheduler sorting latency (ms)',
        'Queue depth and work-stealing frequencies'
      ]
    },
    {
      id: 'cache',
      name: 'Manifest Cache Layer',
      icon: Database,
      desc: 'An index-matching manifest store that evaluates target file hashes to eliminate duplicate comp unit rebuilds.',
      responsibilities: [
        'Query unique content-addressable hashes of targets',
        'Commit output build manifests back into SQLite/external index',
        'Deliver target hit rates telemetry parameters'
      ],
      apis: [
        'QueryCacheHits(HashKey) -> CacheResponse',
        'CommitCacheIndex(HashKey, ManifestData) -> StatusACK',
        'FlushCacheIndex() -> Status'
      ],
      metrics: [
        'Cache hits/misses increments',
        'Storage utilization and savings ratio'
      ]
    },
    {
      id: 'workers',
      name: 'Cluster Exec Workers',
      icon: Server,
      desc: 'Scalable bare-metal container pods executing compiler commands under separate CPU threads.',
      responsibilities: [
        'Execute compiler actions (clang++, clang) inside isolation sandbox',
        'Read and fetch dependencies input headers list',
        'Compress targets outputs into Zstandard tarball archives'
      ],
      apis: [
        'ExecuteCompileAction(CompileTask) -> ActionResponse',
        'FetchCacheInputs(ArtifactId) -> TargetBytes',
        'SyncHandshakeSocks() -> Ack'
      ],
      metrics: [
        'Thread CPU and RAM usage',
        'Compilation latency and throughput (unit/min)',
        'Active file I/O operations count'
      ]
    },
    {
      id: 'store',
      name: 'Zstd Artifact Store',
      icon: FolderGit,
      desc: 'High-availability storage mount holding raw compressed compiled artifacts for rapid extraction.',
      responsibilities: [
        'Maintain read/write access to persistent .tar.zst binaries',
        'Decompress cached headers index on demand',
        'Keep safe storage threshold and clear stale objects'
      ],
      apis: [
        'UploadZstdTarball(TargetName, FileBytes) -> UploadAcknowledgement',
        'DownloadZstdTarball(TargetName) -> FileStream',
        'EvictStaleObjects(DaysCount) -> EvictCount'
      ],
      metrics: [
        'Artifact capacity count',
        'Storage footprint bytes'
      ]
    }
  ];

  const activeComp = components.find(c => c.id === selectedCompId) || components[1];

  return (
    <div className="bg-[#050506]/30 border border-white/10 rounded-lg p-5 flex flex-col gap-6" id="architect_explorer_dashboard">
      <div className="border-b border-white/5 pb-3">
        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Distributed Compilation Architectural Topology</h3>
        <p className="font-mono text-[10px] text-zinc-500 mt-1 select-none">
          Click on any architectural pipeline components below to audit gRPC API endpoints, operational duties, and cluster variables.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Clickable Bento Box Architecture Pipeline */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {components.map((comp) => {
            const CompIcon = comp.icon;
            const isSelected = comp.id === selectedCompId;

            return (
              <button
                key={comp.id}
                onClick={() => setSelectedCompId(comp.id)}
                className={`text-left p-4 rounded-lg border transition-all cursor-pointer flex gap-3.5 ${
                  isSelected
                    ? 'border-[#60A5FA] bg-[#60A5FA]/5 text-white shadow-[0_0_15px_rgba(96,165,250,0.1)]'
                    : 'border-white/5 bg-black/35 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                <div className={`p-2 rounded-md shrink-0 h-10 w-10 flex items-center justify-center ${
                  isSelected ? 'bg-[#60A5FA]/20 text-[#60A5FA]' : 'bg-white/5 text-zinc-400'
                }`}>
                  <CompIcon className="w-5 h-5" />
                </div>

                <div className="space-y-1 overflow-hidden">
                  <h4 className="font-mono text-xs font-bold text-white tracking-tight">{comp.name}</h4>
                  <p className="font-mono text-[10px] text-zinc-500 leading-normal truncate">{comp.desc}</p>
                  <p className="font-mono text-[9px] text-[#88888E] uppercase tracking-wider font-extrabold mt-2">
                    {comp.apis.length} gRPC endpoints audit
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Component Inspection Panel */}
        <div className="bg-[#0D0E11] border border-white/10 p-5 rounded-lg flex flex-col justify-between space-y-5 h-full">
          <div className="space-y-4">
            <div className="border-b border-white/5 pb-2">
              <span className="text-[8px] font-mono font-bold text-[#60A5FA] tracking-widest block uppercase">Component Inspection</span>
              <span className="text-sm font-mono font-bold text-white mt-1 block">{activeComp.name}</span>
            </div>

            <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">{activeComp.desc}</p>

            {/* Duties */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">System Duties</span>
              <ul className="list-disc pl-4 text-[10px] font-mono text-zinc-300 space-y-1">
                {activeComp.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* Endpoints */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Core gRPC APIs</span>
              <div className="space-y-1">
                {activeComp.apis.map((api, i) => (
                  <code key={i} className="block text-[9px] font-mono p-1 bg-black rounded border border-white/5 text-emerald-400 select-all font-semibold">
                    {api}
                  </code>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Telemetry Metrics Reported</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {activeComp.metrics.map((m, i) => (
                  <span key={i} className="text-[9px] font-mono px-2 py-0.5 bg-white/5 border border-white/5 text-[#60A5FA] rounded uppercase">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom simple inline component helper for the dashboard
function ShieldCheck(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l7-2a1 1 0 0 1 .48 0l7 2A1 1 0 0 1 20 6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
