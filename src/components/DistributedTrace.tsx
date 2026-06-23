import React, { useState, useMemo } from 'react';
import { Search, ListFilter, Activity, Play, ArrowRight, Layers, FileCode, CheckCircle2 } from 'lucide-react';

interface TraceSpan {
  id: string;
  name: string;
  component: string;
  startPct: number; // For visualization width starting
  endPct: number;
  durationMs: number;
  statusCode: 'OK' | 'ERROR';
  attributes: Record<string, string>;
  children?: TraceSpan[];
}

export default function DistributedTrace() {
  const [traceSearch, setTraceSearch] = useState('');
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);

  // High fidelity trace spans nested map representing typical compilation trace events
  const defaultTrace: TraceSpan[] = [
    {
      id: 'span-root',
      name: 'BUILD_REQUEST //app:buildforge_core',
      component: 'CLI_GATEWAY',
      startPct: 0,
      endPct: 100,
      durationMs: 4820,
      statusCode: 'OK',
      attributes: {
        'bazel.build_uuid': 'bf-104e-4b69-826c-d232a5bf8911',
        'cxx.compiler': 'clang++ [c++23 standard]',
        'cluster.grpc_version': 'v1.54.1',
        'auth.user_token': 'engineer-master-core'
      },
      children: [
        {
          id: 'span-parse',
          name: 'PARSE_BUILD_SPEC //:BUILD',
          component: 'LEXER_EBNF_PARSER',
          startPct: 2,
          endPct: 15,
          durationMs: 620,
          statusCode: 'OK',
          attributes: {
            'rules.found_count': '4',
            'lexer.token_count': '72',
            'parser.checks.success': 'true'
          }
        },
        {
          id: 'span-dag',
          name: 'DAG_RESOLVE_KAHN_SORT',
          component: 'SCHEDULER_COORD',
          startPct: 15,
          endPct: 22,
          durationMs: 330,
          statusCode: 'OK',
          attributes: {
            'graph.cyclic_dependency': 'false',
            'topo.batches_count': '3',
            'nodes.calculated_weight': '4'
          }
        },
        {
          id: 'span-thread-sched',
          name: 'THREAD_STEALER_DISPATCH',
          component: 'WORK_STEALER_SCHED',
          startPct: 22,
          endPct: 92,
          durationMs: 3370,
          statusCode: 'OK',
          attributes: {
            'parallelism.factor': '4.2',
            'steals.popped_count': '1',
            'workers.active_count': '3'
          },
          children: [
            {
              id: 'span-worker-1',
              name: 'COMPILE_OBJECT //:common_utils.cpp',
              component: 'gRPC_WORKER_EMEA_A',
              startPct: 24,
              endPct: 54,
              durationMs: 1450,
              statusCode: 'OK',
              attributes: {
                'thread.id': '0x7ff01b',
                'cache.index_match': 'false',
                'compiler.stdout': 'clang-17 SUCCESS'
              }
            },
            {
              id: 'span-worker-2',
              name: 'COMPILE_OBJECT //:graph_engine.cpp',
              component: 'gRPC_WORKER_US_B',
              startPct: 54,
              endPct: 84,
              durationMs: 1445,
              statusCode: 'OK',
              attributes: {
                'thread.id': '0x7ff02c',
                'cache.index_match': 'false',
                'compiler.stdout': 'clang-17 SUCCESS'
              }
            },
            {
              id: 'span-worker-3',
              name: 'COMPILE_OBJECT //:work_stealer.cpp',
              component: 'gRPC_WORKER_US_C',
              startPct: 56,
              endPct: 92,
              durationMs: 1730,
              statusCode: 'OK',
              attributes: {
                'thread.id': '0x7ff03d',
                'cache.index_match': 'true',
                'compiler.stdout': 'CACHE HIT LINK_SYMLINK'
              }
            }
          ]
        },
        {
          id: 'span-artifact',
          name: 'UPLOAD_TARBALLS_COMMIT',
          component: 'CACHE_STORE_SERVICE',
          startPct: 92,
          endPct: 100,
          durationMs: 500,
          statusCode: 'OK',
          attributes: {
            'compressor.alg': 'zstd',
            'storage.bytes': '1240402',
            'upload.endpoint': '/mnt/bazel_cache'
          }
        }
      ]
    }
  ];

  // Flatten spans hierarchically to make tracing, tree plotting, and query matching seamless
  const flatSpans = useMemo(() => {
    const list: { depth: number; span: TraceSpan }[] = [];
    const traverse = (item: TraceSpan, depth: number) => {
      list.push({ depth, span: item });
      if (item.children) {
        item.children.forEach(c => traverse(c, depth + 1));
      }
    };
    defaultTrace.forEach(t => traverse(t, 0));
    return list;
  }, []);

  // Filter trace by search query
  const filteredTrace = useMemo(() => {
    if (!traceSearch) return flatSpans;
    return flatSpans.filter(item => {
      const match = item.span.name.toLowerCase().includes(traceSearch.toLowerCase()) ||
                    item.span.component.toLowerCase().includes(traceSearch.toLowerCase());
      return match;
    });
  }, [flatSpans, traceSearch]);

  return (
    <div className="bg-[#0D0E11] border border-white/10 rounded-lg p-5 flex flex-col h-[520px]" id="trace_explorer_panel">
      {/* Control Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 mb-5 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-status-blue animate-pulse" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Distributed Trace Timeline (OpenTelemetry Gateway)</span>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search span or component..."
            value={traceSearch}
            onChange={(e) => setTraceSearch(e.target.value)}
            className="pl-8 pr-3 py-1 text-[11px] font-mono bg-black text-white hover:border-white/10 focus:border-status-blue rounded border border-white/5 outline-none w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Core Spans Tree Plot */}
        <div className="xl:col-span-2 overflow-y-auto space-y-2 pr-1 h-full scrollbar-thin">
          {filteredTrace.map(({ depth, span }) => {
            const isSpanSelected = selectedSpan?.id === span.id;
            
            return (
              <div
                key={span.id}
                onClick={() => setSelectedSpan(span)}
                className={`p-3 bg-black/20 hover:bg-black/40 border rounded transition flex flex-col gap-2 cursor-pointer ${
                  isSpanSelected ? 'border-[#60A5FA] bg-[#60A5FA]/5' : 'border-white/5'
                }`}
                style={{ marginLeft: `${depth * 14}px` }}
              >
                {/* Identification line */}
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-bold uppercase text-[9px] bg-black px-1 border border-white/5 rounded">
                      {span.component}
                    </span>
                    <span className="text-white font-bold truncate max-w-[190px] md:max-w-[340px]">{span.name}</span>
                  </div>
                  <span className="text-[#60A5FA] font-bold shrink-0">{span.durationMs} ms</span>
                </div>

                {/* Micro Span Horizontal Timeline Progress block */}
                <div className="h-2 bg-zinc-950 rounded relative overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-status-blue rounded-sm"
                    style={{
                      left: `${span.startPct}%`,
                      width: `${span.endPct - span.startPct}%`,
                      position: 'absolute'
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Span Metadata sidebar drawer */}
        <div className="bg-[#050506] border border-white/10 p-4 rounded-lg flex flex-col justify-between h-full overflow-y-auto">
          {selectedSpan ? (
            <div className="space-y-4">
              <div className="border-b border-white/5 pb-2">
                <span className="text-[8px] font-mono font-bold text-status-blue tracking-widest block uppercase">Selected Span Context</span>
                <span className="text-xs font-mono font-bold text-white leading-tight mt-1 truncate block">{selectedSpan.name}</span>
              </div>

              {/* Basic Properties */}
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-zinc-500">
                  <span>Traced Component:</span>
                  <span className="text-zinc-300">{selectedSpan.component}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Execution Duration:</span>
                  <span className="text-[#4ADE80] font-bold">{selectedSpan.durationMs} ms</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Trace Gid:</span>
                  <span className="text-zinc-400">{selectedSpan.id}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Heartbeat Status:</span>
                  <span className="text-emerald-400 font-bold">SPAN_OK</span>
                </div>
              </div>

              {/* Attributes block */}
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Span Attributes</span>
                <div className="bg-black/60 p-3 rounded border border-white/5 max-h-[160px] overflow-y-auto space-y-2 font-mono text-[10px] scrollbar-thin">
                  {Object.entries(selectedSpan.attributes).map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5 border-b border-white/5 pb-1 last:border-0">
                      <span className="text-zinc-500 font-semibold">{k}</span>
                      <span className="text-zinc-300 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 font-mono text-xs">
              <Layers className="w-8 h-8 opacity-40 mb-2 text-status-blue" />
              <span>Click on any trace span inside left timeline to inspect gRPC metadata &amp; Raft states.</span>
            </div>
          )}

          <div className="pt-3 border-t border-white/5 font-mono text-[9px] text-zinc-600 text-right">
            OpenTelemetry RPC payload.
          </div>
        </div>
      </div>
    </div>
  );
}
