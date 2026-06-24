import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Cpu,
  Layers,
  Activity,
  Database,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Send,
  RefreshCw,
  Sliders,
  XCircle,
  Info,
  Hash,
  BookOpen,
  Zap,
  User,
  Bug,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Token,
  RuleCall,
  Diagnostic,
  BuildTarget,
  WorkerState,
  BuildSession,
  SystemMetrics
} from './types';

// Advanced infrastructure dashboards components
import InteractiveDAG from './components/InteractiveDAG';
import WorkerCluster from './components/WorkerCluster';
import BuildTimeline from './components/BuildTimeline';
import BuildReplay from './components/BuildReplay';
import CacheAnalytics from './components/CacheAnalytics';
import FaultInjection from './components/FaultInjection';
import DistributedTrace from './components/DistributedTrace';
import PerformanceBenchmarks from './components/PerformanceBenchmarks';
import ArchitectureExplorer from './components/ArchitectureExplorer';
import BuildComparison from './components/BuildComparison';

// Seed Workspace BUILD Script
const INITIAL_BUILD_CODE = `# BuildForge production-grade build configuration
# Modeled after Google Bazel BUILD grammar specifications

cc_library(
    name = "common_utils",
    srcs = ["utils.cpp", "hash.cpp"],
    deps = []
)

cc_library(
    name = "graph_engine",
    srcs = ["graph.cpp"],
    deps = [":common_utils"]
)

cc_library(
    name = "work_stealer",
    srcs = ["scheduler.cpp"],
    deps = [":common_utils"]
)

cc_binary(
    name = "buildforge_core",
    srcs = ["main.cpp"],
    deps = [":graph_engine", ":work_stealer"]
)

cc_test(
    name = "scheduler_test",
    srcs = ["scheduler_test.cpp"],
    deps = [":work_stealer"]
)
`;

const INITIAL_WORKERS: WorkerState[] = [
  {
    id: 'worker-us-central1-a',
    status: 'IDLE',
    capacity: 4,
    lastHeartbeat: new Date().toISOString(),
    cpuUsage: 2,
    memoryUsage: 120, // MB
    localQueue: [],
    tags: ['cpu-opt', 'has-compiler-v23']
  },
  {
    id: 'worker-us-east4-b',
    status: 'IDLE',
    capacity: 4,
    lastHeartbeat: new Date().toISOString(),
    cpuUsage: 1,
    memoryUsage: 94,
    localQueue: [],
    tags: ['gpu-opt', 'has-compiler-v23']
  },
  {
    id: 'worker-europe-west3-c',
    status: 'IDLE',
    capacity: 8,
    lastHeartbeat: new Date().toISOString(),
    cpuUsage: 3,
    memoryUsage: 154,
    localQueue: [],
    tags: ['high-mem', 'has-compiler-v23']
  }
];

export default function App() {
  const [code, setCode] = useState(INITIAL_BUILD_CODE);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [rules, setRules] = useState<RuleCall[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [astExpanded, setAstExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'scheduler' | 'parser' | 'cache' | 'docs'>('scheduler');
  const [subTab, setSubTab] = useState<'dag' | 'workers' | 'timeline' | 'replay' | 'cache_analytics' | 'chaos' | 'traces' | 'benchmarks' | 'architecture' | 'compare'>('dag');

  // Completed compilation history runs
  const [historyBuilds, setHistoryBuilds] = useState<BuildSession[]>([
    {
      buildId: 'b-9022',
      status: 'SUCCEEDED',
      traceId: 'bf-33923-a212-be20a',
      totalTargets: 4,
      completedTargets: 4,
      targets: {
        '//:common_utils': { name: '//:common_utils', status: 'CACHED', durationMs: 400, logs: [], workerId: 'worker-us-central1-a' },
        '//:graph_engine': { name: '//:graph_engine', status: 'SUCCEEDED', durationMs: 1400, logs: [], workerId: 'worker-us-east4-b' },
        '//:work_stealer': { name: '//:work_stealer', status: 'SUCCEEDED', durationMs: 1812, logs: [], workerId: 'worker-europe-west3-c' },
        '//:buildforge_core': { name: '//:buildforge_core', status: 'SUCCEEDED', durationMs: 3400, logs: [], workerId: 'worker-us-central1-a' }
      },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() - 3600000 + 4800).toISOString()
    }
  ]);

  // Global chaos simulation executors
  const killWorkerNode = (id: string) => {
    handleInjectFault(id);
  };

  const reviveWorkerNode = (id: string) => {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, status: 'IDLE', cpuUsage: 2, memoryUsage: 120 } : w));
    addLog(`[Fault Tolerance] Worker node ${id} manually reconnected and synchronized.`, 'success');
  };

  const killAllWorkers = () => {
    setWorkers(prev => prev.map(w => ({ ...w, status: 'DEAD', cpuUsage: 0, memoryUsage: 0, activeTaskId: undefined })));
  };

  const restoreAllWorkers = () => {
    setWorkers(prev => prev.map(w => ({ ...w, status: 'IDLE', cpuUsage: 2, memoryUsage: 120, lastHeartbeat: new Date().toISOString() })));
  };

  // Build Scheduler Simulator state
  const [workers, setWorkers] = useState<WorkerState[]>(INITIAL_WORKERS);
  const [buildTargets, setBuildTargets] = useState<BuildTarget[]>([]);
  const [topoBatches, setTopoBatches] = useState<string[][]>([]);
  const [cyclePath, setCyclePath] = useState<string[] | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1000); // ms per step
  
  const [activeBuild, setActiveBuild] = useState<BuildSession | null>(null);
  const [logs, setLogs] = useState<{ id: string; msg: string; type: 'info' | 'success' | 'warn' | 'error' | 'steal' }[]>([]);
  const [traceId, setTraceId] = useState('bf-104e-4b69-826c-d232a5bf8911');

  // Metrics history
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalBuilds: 14,
    successfulBuilds: 11,
    failedBuilds: 3,
    cacheHits: 48,
    cacheMisses: 22,
    hitRatio: 0.68,
    bytesSaved: 1240402, // ~1.2MB
    timeSavedMs: 245000, // 245s
    queueDepth: 0
  });

  // Copilot panel states
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: 'Hello, builder! I am your lead Distributed Systems & Tooling Copilot. I can help you analyze C++23 code rules, identify build dependency deadlock circularities, optimize work-stealing thread configurations, or generate BUILD nodes. How can I assist you in your buildForge workspace?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Active step of build scheduler execution
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const buildStateRef = useRef<BuildSession | null>(null);

  // Parse in-memory code initially & on code modification
  useEffect(() => {
    handleParse();
  }, [code]);

  const handleParse = async () => {
    try {
      const response = await fetch('/api/parse-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
        setRules(data.rules || []);
        setDiagnostics(data.diagnostics || []);
        
        // Convert rules to Targets representing BUILD nodes
        const parsedTargets: BuildTarget[] = (data.rules || []).map((r: any) => {
          const name = `//:${r.name || 'unnamed'}`;
          const srcs: string[] = [];
          if (r.args.srcs && r.args.srcs.type === 'ListExpr') {
            r.args.srcs.elements.forEach((e: any) => srcs.push(e.value));
          }
          const deps: string[] = [];
          if (r.args.deps && r.args.deps.type === 'ListExpr') {
            r.args.deps.elements.forEach((e: any) => {
              // Standardize dep names helper
              const cleanDep = e.value.startsWith(':') ? `//:${e.value.slice(1)}` : e.value;
              deps.push(cleanDep);
            });
          }
          return {
            name,
            ruleType: r.ruleType,
            srcs,
            deps,
            timeoutSeconds: 30
          };
        });

        setBuildTargets(parsedTargets);
        computeDependencyInvariants(parsedTargets);
      }
    } catch (e) {
      console.error('Remote parser failure, falling back to local simulation', e);
    }
  };

  // Compute Dependency Invariants: Kahn's Toposort, Cycle Detection & Batches
  const computeDependencyInvariants = (targets: BuildTarget[]) => {
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    const allNodesSet = new Set<string>();

    targets.forEach(t => {
      allNodesSet.add(t.name);
      if (!adj[t.name]) adj[t.name] = [];
      if (!(t.name in inDegree)) inDegree[t.name] = 0;

      t.deps.forEach(dep => {
        allNodesSet.add(dep);
        if (!adj[dep]) adj[dep] = [];
        adj[dep].push(t.name);
        inDegree[t.name] = (inDegree[t.name] || 0) + 1;
        if (!(dep in inDegree)) inDegree[dep] = 0;
      });
    });

    const allNodes = Array.from(allNodesSet).sort();
    
    // Cycle Detection DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parents: Record<string, string> = {};
    let detectedCycle: string[] | null = null;

    const dfs = (u: string): boolean => {
      visited.add(u);
      recStack.add(u);

      const neighbors = adj[u] || [];
      for (const v of neighbors) {
        if (!visited.has(v)) {
          parents[v] = u;
          if (dfs(v)) return true;
        } else if (recStack.has(v)) {
          // Reconstruct cycle path
          const path: string[] = [v];
          let curr = u;
          while (curr !== v) {
            path.push(curr);
            curr = parents[curr];
          }
          path.push(v);
          detectedCycle = path.reverse();
          return true;
        }
      }

      recStack.delete(u);
      return false;
    };

    for (const node of allNodes) {
      if (!visited.has(node)) {
        if (dfs(node)) break;
      }
    }

    if (detectedCycle) {
      setCyclePath(detectedCycle);
      setTopoBatches([]);
      return;
    } else {
      setCyclePath(null);
    }

    // Compute Independent Batches using Kahn's algorithm
    const tempInDegree = { ...inDegree };
    const batches: string[][] = [];
    let currentBatch: string[] = [];

    allNodes.forEach(n => {
      if (tempInDegree[n] === 0) {
        currentBatch.push(n);
      }
    });
    currentBatch.sort();

    while (currentBatch.length > 0) {
      batches.push(currentBatch);
      const nextBatch: string[] = [];
      currentBatch.forEach(u => {
        const neighbors = adj[u] || [];
        neighbors.forEach(v => {
          tempInDegree[v]--;
          if (tempInDegree[v] === 0) {
            nextBatch.push(v);
          }
        });
      });
      nextBatch.sort();
      currentBatch = nextBatch;
    }

    setTopoBatches(batches);
  };

  // Submit and start parallel build simulation
  const startBuildSimulation = async (bypassCache = false) => {
    if (cyclePath) {
      addLog('Cannot build target graph: A circular dependency loop exists!', 'error');
      return;
    }
    if (buildTargets.length === 0) {
      addLog('No target rules loaded to solve', 'warn');
      return;
    }

    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    try {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (!response.ok) {
        addLog('Failed to start build on backend', 'error');
        return;
      }
      const data = await response.json();
      setTraceId(data.traceId);
      
      const initialSession: BuildSession = {
        buildId: data.sessionId,
        status: 'RUNNING',
        traceId: data.traceId,
        totalTargets: data.totalTargets,
        completedTargets: 0,
        targets: {},
        startTime: new Date().toISOString()
      };
      
      setActiveBuild(initialSession);
      buildStateRef.current = initialSession;
      setLogs([]);
      addLog(`Coordinator Initialized with trace ID: ${data.traceId}`, 'info');

      runSchedulerStep(data.sessionId);
    } catch (e) {
      addLog('Error connecting to backend', 'error');
    }
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' | 'steal' = 'info') => {
    setLogs(prev => [...prev, { id: Math.random().toString(), msg, type }]);
  };

  const runSchedulerStep = (sessionId: string) => {
    simIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/build/${sessionId}`);
        if (!response.ok) return;
        const data = await response.json();
        
        const targetsRecord: Record<string, any> = {};
        data.targets.forEach((t: any) => {
          targetsRecord[t.name] = {
            name: t.name,
            status: t.status,
            workerId: t.worker_id,
            durationMs: t.duration_ms,
            cacheKey: t.cache_key,
            logs: []
          };
        });
        
        const newSession = {
          buildId: data.session.id,
          status: data.session.status,
          traceId: data.session.trace_id,
          totalTargets: data.session.total_targets,
          completedTargets: data.session.completed_targets,
          targets: targetsRecord,
          startTime: data.session.start_time,
          endTime: data.session.end_time
        };
        
        setActiveBuild(newSession);
        buildStateRef.current = newSession;
        
        setWorkers(data.workers.map((w: any) => ({
          id: w.id,
          status: w.status,
          capacity: w.capacity,
          activeTaskId: w.active_task_id,
          lastHeartbeat: w.last_heartbeat,
          cpuUsage: w.cpu_usage,
          memoryUsage: w.memory_usage,
          tags: w.tags ? w.tags.split(',') : [],
          localQueue: []
        })));
        
        if (data.logs && data.logs.length > 0) {
          const newLogs = data.logs.map((l: any) => ({
             id: l.id.toString(),
             msg: `[Backend] ${l.log}`,
             type: 'info'
          }));
          setLogs(newLogs);
        }

        if (data.session.status === 'SUCCEEDED' || data.session.status === 'FAILED') {
           clearInterval(simIntervalRef.current!);
           addLog(`[Coordinator] buildforge trace finished with status: ${data.session.status}`, data.session.status === 'SUCCEEDED' ? 'success' : 'error');
           setHistoryBuilds(prev => [newSession, ...prev]);
        }

      } catch (err) {
        console.error(err);
      }
    }, 1000);
  };

  // Inject dead worker failure mid-execution
  const handleInjectFault = (workerId: string) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === workerId) {
        addLog(`[Fault Injection] Worker node ${workerId} hard-killed (simulating network fault). Coordinator tracking heartbeats...`, 'error');
        
        // Re-assign active task if worker failed mid-task
        if (w.activeTaskId && activeBuild) {
          const currentTask = w.activeTaskId;
          addLog(`[Fault Tolerance] Task ${currentTask} re-assigned back to coordinator build queue.`, 'warn');
          
          // Re-trigger running state setup
          const updatedSession = { ...activeBuild };
          if (updatedSession.targets[currentTask]) {
            updatedSession.targets[currentTask].status = 'QUEUED';
          }
          setActiveBuild(updatedSession);
          buildStateRef.current = updatedSession;
        }

        return { ...w, status: 'DEAD', cpuUsage: 0, memoryUsage: 0, activeTaskId: undefined };
      }
      return w;
    }));

    // Revive node after 5 seconds to simulate auto-restart/health system
    setTimeout(() => {
      setWorkers(prev => prev.map(w => {
        if (w.id === workerId && w.status === 'DEAD') {
          addLog(`[Fault Tolerance] Worker node ${workerId} completed self-restart. Registered under Coordinator with new gRPC ACK.`, 'success');
          return { ...w, status: 'IDLE', lastHeartbeat: new Date().toISOString() };
        }
        return w;
      }));
    }, 5000);
  };

  const handleResetSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    setActiveBuild(null);
    setWorkers(INITIAL_WORKERS.map(w => ({ ...w })));
    setLogs([]);
    computeDependencyInvariants(buildTargets);
    addLog('Simulation reset. Core queues flushed.', 'info');
  };

  // Gemini Staff Engineer Copilot Chat Submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userMsg }].map(m => ({
            role: m.role,
            content: m.content
          })),
          buildState: {
            targets: buildTargets,
            batches: topoBatches,
            cycles: cyclePath,
            workers,
            metrics
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        const err = await response.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.error || 'Failed to connect to Copilot.'}` }]);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${err?.message || 'Failed to reach API endpoint.'}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-technical-bg text-[#E0E0E0] flex flex-col font-sans selection:bg-status-blue selection:text-darker overflow-x-hidden border-t-2 border-white/15" id="app_root">
      {/* Specialist Technical Header */}
      <header className="h-14 border-b border-technical bg-darker flex items-center justify-between px-6 shrink-0 relative z-50 shadow-md shadow-black/45" id="app_header">
        <div className="flex items-center gap-4">
          {/* Brand White Stamp */}
          <div className="bg-white text-black font-extrabold px-2 py-0.5 text-xs tracking-tighter rounded-[2px] select-none hover:bg-slate-200 transition">FORGE</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tracking-widest text-[#E0E0E0] uppercase font-bold">BuildForge</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 bg-white/5 text-dim rounded border border-white/5">v1.2.0-rc4</span>
          </div>
        </div>

        {/* Dynamic Global Telemetry metrics */}
        <div className="hidden xl:flex items-center gap-8 font-mono text-xs text-dim">
          <div className="flex flex-col items-end">
            <span className="text-dim uppercase text-[9px] tracking-wider">Trace Token</span>
            <span className="text-status-blue font-semibold">{traceId.substring(0, 15)}...</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-dim uppercase text-[9px] tracking-wider">Cache Saving Ratio</span>
            <span className="text-status-green font-semibold">{(metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100 || 0).toFixed(1)}%</span>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-dim uppercase text-[9px] tracking-wider font-semibold">Active Status</span>
            <span className="text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse"></span>COORDINATOR_ONLINE
            </span>
          </div>
        </div>

        {/* Workflow Navigator Tab controllers */}
        <div className="flex items-center gap-1 bg-darker/60 p-1 rounded border border-technical">
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`px-3 py-1 text-xs font-mono rounded tracking-tight transition-all duration-150 ${
              activeTab === 'scheduler'
                ? 'bg-white/10 text-white font-bold border border-white/10'
                : 'text-dim hover:text-[#E0E0E0]'
            }`}
          >
            01_SCHEDULER
          </button>
          <button
            onClick={() => setActiveTab('parser')}
            className={`px-3 py-1 text-xs font-mono rounded tracking-tight transition-all duration-150 ${
              activeTab === 'parser'
                ? 'bg-white/10 text-white font-bold border border-white/10'
                : 'text-dim hover:text-[#E0E0E0]'
            }`}
          >
            02_LEX_AST
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1 text-xs font-mono rounded tracking-tight transition-all duration-150 ${
              activeTab === 'docs'
                ? 'bg-white/10 text-white font-bold border border-white/10'
                : 'text-dim hover:text-[#E0E0E0]'
            }`}
          >
            03_ADR_LOGS
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0" id="main_workspace">
        
        {/* LEFT COLUMN: BUILD configuration rule editor */}
        <section className="w-full lg:w-[440px] border-r border-technical flex flex-col bg-sidebar-bg shrink-0 select-text" id="rule_editor_pane">
          <div className="p-4 bg-darker border-b border-technical flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-status-blue" />
              <h2 className="text-xs font-mono font-bold tracking-wider text-[#E0E0E0]">WORKSPACE //BUILD_SPECS</h2>
            </div>
            <span className="text-[10px] font-mono text-dim bg-darker px-2 py-0.5 rounded border border-technical">C++23 EBNF</span>
          </div>

          <div className="flex-1 flex flex-col min-h-[280px] lg:min-h-0 text-xs font-mono relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full flex-1 p-4 bg-darker/95 text-status-green placeholder:text-zinc-700 outline-none resize-none focus:ring-1 focus:ring-white/5 border-0 leading-relaxed overflow-y-auto"
              spellCheck="false"
              id="build_textarea"
            />
            
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-[#0A0B0D] p-1 rounded border border-technical">
              <button
                onClick={() => setCode(INITIAL_BUILD_CODE)}
                title="Reset Workspace"
                className="p-1 px-2 hover:bg-white/5 text-dim hover:text-white rounded transition text-[10px] font-mono flex items-center gap-1 border border-transparent hover:border-white/5"
              >
                <RotateCcw className="w-3 h-3 text-status-amber" /> RESET
              </button>
              <button
                onClick={handleParse}
                className="px-2.5 py-1 bg-white/5 text-[#E0E0E0] border border-technical hover:bg-white/10 font-mono text-[10px] hover:text-white rounded transition"
              >
                COMPILE_AST()
              </button>
            </div>
          </div>

          {/* Grammar & Rule Diagnostic Panel */}
          <div className="p-4 border-t border-technical bg-darker/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-mono text-dim uppercase tracking-wider">Parser Compilation Diagnostics</h3>
              <span className="w-2 h-2 rounded-full bg-status-green"></span>
            </div>
            
            {diagnostics.length > 0 ? (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {diagnostics.map((diag, index) => (
                  <div key={index} className="p-3 bg-red-950/10 border border-red-500/15 rounded flex items-start gap-2.5 text-[11px] font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-bold">Line {diag.location.line}, Col {diag.location.col}: {diag.message}</p>
                      <p className="text-zinc-500 mt-0.5">{diag.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-white/5 border border-technical rounded flex items-center gap-3 text-[11px] font-mono">
                <CheckCircle2 className="w-4 h-4 text-status-green shrink-0" />
                <div>
                  <p className="text-white font-bold">AST_SYNTAX_VERIFIED</p>
                  <p className="text-dim text-[10px] mt-0.5">Grammar parser completed scan. Clean dependency structures resolved.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CENTER / MAIN PANELS based on activeTab */}
        <section className="flex-1 flex flex-col bg-technical-bg select-text grid-pattern overflow-y-auto relative" id="main_pane">
          
          {/* SCHEDULER TAB: Workspace compiler scheduler, work-stealing, and heartbeats */}
          {activeTab === 'scheduler' && (
            <div className="p-6 space-y-6 flex-1 flex flex-col relative z-10" id="scheduler_view">
              
              {/* Simulator Execution Control Box */}
              <div className="bg-[#0D0E11] rounded-lg border border-technical p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-white/5 p-2 rounded text-status-blue border border-technical">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono text-white font-bold tracking-wider uppercase">Thread Scheduler Controller</h3>
                    <p className="text-[11px] text-dim font-mono">Simulate multi-core thread cycles & circular-dependency solvers</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => startBuildSimulation(false)}
                    disabled={!!cyclePath || buildTargets.length === 0 || (activeBuild && activeBuild.status === 'RUNNING')}
                    className="flex items-center gap-1.5 px-4 h-8 bg-white hover:bg-slate-200 text-black font-mono font-bold text-xs disabled:opacity-30 transition rounded cursor-pointer border border-white"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" /> RUN_BUILD
                  </button>

                  <button
                    onClick={() => startBuildSimulation(true)}
                    disabled={!!cyclePath || buildTargets.length === 0 || (activeBuild && activeBuild.status === 'RUNNING')}
                    className="flex items-center gap-1.5 px-3 h-8 bg-darker hover:bg-white/5 border border-technical text-zinc-300 font-mono text-xs disabled:opacity-30 transition rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> REBUILD_ALL
                  </button>

                  <button
                    onClick={handleResetSimulation}
                    className="flex items-center gap-1 px-3 h-8 bg-[#0D0E11] hover:bg-white/5 border border-technical text-dim hover:text-white font-mono text-xs transition rounded"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> FLUSH
                  </button>

                  {/* Frequency Slider */}
                  <div className="flex items-center gap-2 px-3 h-8 bg-darker rounded border border-technical text-[11px] font-mono">
                    <span className="text-dim">STEP_DELAY:</span>
                    <input
                      type="range"
                      min={300}
                      max={2000}
                      step={100}
                      value={simulationSpeed}
                      onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                      className="w-20 accent-white cursor-pointer h-1"
                    />
                    <span className="text-white font-bold w-10 text-right">{simulationSpeed}ms</span>
                  </div>
                </div>
              </div>

              {/* Sub-Navigator Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#0D0E11]/90 p-2.5 rounded-lg border border-technical relative z-25 shrink-0">
                <span className="font-mono text-[10px] text-zinc-500 font-bold tracking-wider mr-2 uppercase block">Module:</span>
                {[
                  { id: 'dag', label: '01_TAP_DAG' },
                  { id: 'workers', label: '02_WORKERS' },
                  { id: 'timeline', label: '03_TIMELINE' },
                  { id: 'replay', label: '04_REPLAY' },
                  { id: 'cache_analytics', label: '05_CACHE' },
                  { id: 'chaos', label: '06_CHAOS' },
                  { id: 'traces', label: '07_TRACES' },
                  { id: 'benchmarks', label: '08_BENCHMARKS' },
                  { id: 'architecture', label: '09_ARCH' },
                  { id: 'compare', label: '10_COMPARE' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSubTab(t.id as any)}
                    className={`px-3 py-1 font-mono text-[10px] font-bold tracking-tight rounded border transition-all cursor-pointer ${
                      subTab === t.id
                        ? 'bg-white/10 text-white border-white/10 shadow-sm'
                        : 'bg-black/35 text-dim border-transparent hover:text-white hover:border-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Inner Tab Component Mount */}
              <div className="flex-1 min-h-0">
                {subTab === 'dag' && (
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Kahn's Batches List */}
                    <div className="xl:col-span-1 bg-[#0D0E11] rounded-lg border border-technical p-4 flex flex-col h-[520px]">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-technical">
                        <Layers className="w-3.5 h-3.5 text-status-blue" />
                        <h4 className="text-[10px] font-mono text-white uppercase tracking-wider font-bold">DAG_TOPO_BATCHES</h4>
                      </div>
                      
                      {cyclePath ? (
                        <div className="p-3 bg-red-950/10 border border-red-500/15 rounded text-xs leading-relaxed font-mono">
                          <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1">
                            <XCircle className="w-4 h-4 shrink-0" />
                            <span>DEADLOCK CIRCULARITY</span>
                          </div>
                          <p className="text-dim mb-2 text-[11px]">Cycle detected parse-side. Target path loop cannot resolve topologically:</p>
                          <div className="flex flex-wrap items-center gap-1 text-[10px] bg-red-950/15 p-2 rounded border border-red-500/10 text-red-300">
                            {cyclePath.map((node, i) => (
                              <React.Fragment key={i}>
                                <span className="font-bold">{node}</span>
                                {i < cyclePath.length - 1 && <span className="text-zinc-600">→</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ) : topoBatches.length > 0 ? (
                        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 scrollbar-thin">
                          {topoBatches.map((batch, idx) => (
                            <div key={idx} className="p-2.5 bg-darker border border-technical rounded">
                              <p className="text-[9px] font-mono font-bold text-status-blue tracking-widest uppercase mb-1.5">Batch_0{idx + 1}</p>
                              <div className="space-y-1">
                                {batch.map((node, nIdx) => {
                                  const target = buildTargets.find(b => b.name === node);
                                  return (
                                    <div key={nIdx} className="flex justify-between items-center text-[11px] px-2 py-1 bg-[#0A0B0D] rounded border border-technical font-mono">
                                      <span className="text-zinc-300 truncate max-w-[130px]">{node}</span>
                                      <span className="text-[9px] text-[#88888E] uppercase">{target?.ruleType || 'dep'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-dim italic font-mono p-4">No workspace targets defined.</p>
                      )}
                    </div>

                    {/* Advanced Interactive SVG DAG Graph view */}
                    <div className="xl:col-span-3">
                      <InteractiveDAG
                        targets={buildTargets}
                        topoBatches={topoBatches}
                        activeBuild={activeBuild}
                        cyclePath={cyclePath}
                      />
                    </div>
                  </div>
                )}

                {subTab === 'workers' && (
                  <WorkerCluster
                    workers={workers}
                    onKillWorker={killWorkerNode}
                    onReviveWorker={reviveWorkerNode}
                  />
                )}

                {subTab === 'timeline' && (
                  <BuildTimeline
                    logs={logs}
                    activeBuild={activeBuild}
                    historyBuilds={historyBuilds}
                  />
                )}

                {subTab === 'replay' && (
                  <BuildReplay />
                )}

                {subTab === 'cache_analytics' && (
                  <CacheAnalytics metrics={metrics} />
                )}

                {subTab === 'chaos' && (
                  <FaultInjection
                    onKillAllWorkers={killAllWorkers}
                    onRestoreAllWorkers={restoreAllWorkers}
                  />
                )}

                {subTab === 'traces' && (
                  <DistributedTrace />
                )}

                {subTab === 'benchmarks' && (
                  <PerformanceBenchmarks />
                )}

                {subTab === 'architecture' && (
                  <ArchitectureExplorer />
                )}

                {subTab === 'compare' && (
                  <BuildComparison />
                )}
              </div>

              {/* Logger feed console */}
              <div className="bg-darker border border-technical rounded flex flex-col min-h-[160px] max-h-[300px] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-technical bg-white/5 select-none font-mono">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Terminal className="w-3.5 h-3.5 text-status-blue" />
                    <span>STRUCTURED BUILD LOGS</span>
                  </div>
                  <span className="text-[10px] text-dim font-bold">LEVEL: DEBUG | TRACE: {traceId.substring(0, 8)}</span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-1.5 font-mono text-xs text-zinc-300 bg-darker leading-relaxed scrollbar-thin">
                  {logs.length === 0 ? (
                    <p className="text-[11px] text-dim italic select-none">No active build session logs found. Trigger "RUN BUILD" above...</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="text-[11px] flex gap-2">
                        <span className="text-dim">[{new Date().toISOString().substring(11, 19)}]</span>
                        {log.type === 'error' && <span className="text-red-400 font-bold">[CRITICAL]</span>}
                        {log.type === 'warn' && <span className="text-status-amber font-bold">[WARN]</span>}
                        {log.type === 'success' && <span className="text-status-green font-bold">[OK]</span>}
                        {log.type === 'steal' && <span className="text-status-blue font-bold">[STEAL]</span>}
                        {log.type === 'info' && <span className="text-zinc-500">[INFO]</span>}
                        <span className={
                          log.type === 'error' ? 'text-red-300' :
                          log.type === 'warn' ? 'text-status-amber' :
                          log.type === 'success' ? 'text-status-green' :
                          log.type === 'steal' ? 'text-status-blue font-semibold' :
                          'text-zinc-300'
                        }>{log.msg}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* PARSER TAB: detailed token streams, expandable compiler AST visualization */}
          {activeTab === 'parser' && (
            <div className="p-6 space-y-6 flex-1 flex flex-col" id="parser_view">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                
                {/* Visual Tokens Table Column */}
                <div className="bg-[#0D0E11] border border-technical rounded-lg p-5 flex flex-col min-h-[300px]">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-technical">
                    <Hash className="w-3.5 h-3.5 text-status-blue" />
                    <h4 className="text-[10px] font-mono text-white uppercase tracking-wider font-bold">Lexical Token Stream</h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto max-h-[480px]">
                    <div className="divide-y divide-white/5 font-mono text-xs">
                      {tokens.length === 0 ? (
                        <p className="text-xs text-dim italic p-3 font-mono">Verify specs configuration parsing on the left panel.</p>
                      ) : (
                        tokens.map((tok, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 px-1 text-[11px] hover:bg-white/5 transition">
                            <div className="flex items-center gap-2">
                              <span className="text-dim font-mono w-6 text-[10px]">{idx + 1}</span>
                              <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold ${
                                tok.type === 'Ident' ? 'bg-status-blue/10 text-status-blue border border-status-blue/20' :
                                tok.type === 'String' ? 'bg-status-green/10 text-status-green border border-status-green/20' :
                                'bg-darker text-zinc-300 border border-technical'
                              }`}>{tok.type}</span>
                            </div>
                            <span className="text-zinc-300 max-w-[160px] truncate">{tok.lexeme || 'EOF'}</span>
                            <span className="text-dim text-[9px] font-mono">L:{tok.location.line} C:{tok.location.col}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Abstract Syntax Tree Interactive JSON Tree Column */}
                <div className="bg-[#0D0E11] border border-technical rounded-lg p-5 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-technical">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-status-green" />
                      <h4 className="text-[10px] font-mono text-white uppercase tracking-wider font-bold">Abstract Syntax Tree (AST node_specs)</h4>
                    </div>
                    <button
                      onClick={() => setAstExpanded(!astExpanded)}
                      className="text-[10px] text-zinc-300 font-mono border border-technical px-2 py-0.5 bg-white/5 rounded hover:bg-white/10 uppercase"
                    >
                      {astExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto max-h-[480px] bg-darker p-4 rounded border border-technical font-mono text-[11px] text-status-green leading-relaxed leading-5">
                    {rules.length === 0 ? (
                      <p className="text-xs text-dim italic font-mono">Verify specs configuration parsing to output AST JSON.</p>
                    ) : astExpanded ? (
                      <pre className="whitespace-pre-wrap select-text">{JSON.stringify(rules, null, 2)}</pre>
                    ) : (
                      <div className="space-y-3 select-none">
                        {rules.map((rule, rIdx) => (
                          <div key={rIdx} className="border border-technical p-3 bg-[#0A0B0D] rounded">
                            <p className="font-bold text-status-amber font-mono text-xs">{rule.ruleType}</p>
                            <div className="ml-3 mt-1.5 text-zinc-300 space-y-1 text-[11px] font-mono">
                              <p><span className="text-dim">name =</span> "{rule.name}"</p>
                              <p><span className="text-dim">srcs =</span> {rule.args.srcs?.type === 'ListExpr' ? `[${rule.args.srcs.elements.map((e: any) => `"${e.value}"`).join(', ')}]` : '[]'}</p>
                              <p><span className="text-dim">deps =</span> {rule.args.deps?.type === 'ListExpr' ? `[${rule.args.deps.elements.map((e: any) => `"${e.value}"`).join(', ')}]` : '[]'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* DOCUMENTATION & ADR READ ROOM VIEW */}
          {activeTab === 'docs' && (
            <div className="p-6 space-y-6 flex-1 flex flex-col select-text" id="docs_view_frame">
              
              <div className="flex items-center gap-3 bg-[#0D0E11] rounded-lg border border-technical p-4">
                <div className="p-2 bg-white/5 text-status-blue rounded border border-technical">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-mono text-white tracking-widest uppercase font-bold">C++23 distributed system design records</h3>
                  <p className="text-[11px] text-dim font-mono">Formal Architectural Design Specifications (ADRs)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text max-h-[480px] overflow-y-auto pr-1">
                <div className="border border-technical bg-darker/60 p-5 rounded font-mono text-[11px] space-y-3">
                  <h4 className="font-bold text-status-blue tracking-wide">ADR-001: AST RECURSIVE DECENT SCANNER</h4>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    In BuildForge, raw specs files are read directly into memory. Our lexical scan computes row-and-column diagnostic tokens without complex dependency layers, ensuring minimal workspace overhead.
                  </p>
                </div>

                <div className="border border-technical bg-darker/60 p-5 rounded font-mono text-[11px] space-y-3">
                  <h4 className="font-bold text-status-blue tracking-wide">ADR-002: DECENTRALIZED WORK-STEALING</h4>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    Multi-core workers are structured using std::jthread workers. If one CPU core hits a slow lock compilation target block, others will steal independent tasks from the worker queue dynamically.
                  </p>
                </div>

                <div className="border border-technical bg-darker/60 p-5 rounded font-mono text-[11px] space-y-3">
                  <h4 className="font-bold text-status-blue tracking-wide">ADR-003: SHA-256 CAS REPOSITOR</h4>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    Binary outputs are safely stored in our content-addressable storage index matching exact manifest checksum hashes, fully mitigating duplicate compilations across multiple runs.
                  </p>
                </div>

                <div className="border border-technical bg-darker/60 p-5 rounded font-mono text-[11px] space-y-3">
                  <h4 className="font-bold text-status-blue tracking-wide">ADR-004: FAULT TOLERANCE ARCHITECTURE</h4>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    In the event of physical cell disconnection, the coordinator re-assigns active targets to alive cluster instances without failing the thread loop execution sequence.
                  </p>
                </div>
              </div>

              {/* Diagrams block */}
              <div className="border border-technical bg-[#0D0E11] p-5 rounded space-y-3">
                <h4 className="text-[10px] font-mono text-white font-bold tracking-widest uppercase">SCHEDULER ENGINE WORKFLOW PIPELINE</h4>
                <div className="border border-technical p-4 rounded bg-darker font-mono text-[11px] text-zinc-400 leading-relaxed">
                  <p className="text-status-green font-bold">//WORKSPACE/BUILD CONFIG</p>
                  <p className="ml-4 text-zinc-600">│  (handwritten lexer.cpp tokenizes specifications)</p>
                  <p className="ml-4 text-zinc-600">▼</p>
                  <p className="text-status-blue font-bold">LEX_TOKENS_STREAM</p>
                  <p className="ml-4 text-zinc-600">│  (recursive-descent parsing outputs compiler tree)</p>
                  <p className="ml-4 text-zinc-600">▼</p>
                  <p className="text-status-blue font-bold">AST MODULE SCHEMA</p>
                  <p className="ml-4 text-zinc-600">│  (Kahn's topological sorter resolves circular loops)</p>
                  <p className="ml-4 text-zinc-600">▼</p>
                  <p className="text-status-amber font-bold">INDEPENDENT PARALLEL EXECUTION BATCHES</p>
                  <p className="ml-4 text-zinc-600">│  (Allocated dynamically across std::jthread worker pools)</p>
                  <p className="ml-4 text-zinc-600">▼</p>
                  <p className="text-zinc-300 font-bold">C++23 WORK-STEALING ARTIFACT_STORE</p>
                </div>
              </div>

            </div>
          )}

        </section>

        {/* RIGHT COLUMN: Senior Google Software Engineer Copilot Chat panel */}
        <section className="w-full lg:w-[350px] border-l border-technical bg-sidebar-bg flex flex-col shrink-0" id="engineer_copilot_pane">
          <div className="p-4 bg-darker border-b border-technical flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-[#E0E0E0]">
              <Sparkles className="w-4 h-4 text-status-blue animate-pulse" />
              <span>STAFF COPILOT</span>
            </div>
            <span className="text-[10px] font-mono text-dim bg-[#0A0B0D] border border-technical px-1.5 py-0.5 rounded">GEMINI_3.5</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin select-text text-xs" id="chat_messages_container">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                
                {msg.role !== 'user' && (
                  <div className="w-7 h-7 rounded bg-white/5 border border-technical flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4 text-status-blue" />
                  </div>
                )}

                <div className={`p-3 rounded max-w-[240px] leading-relaxed select-text font-mono text-[11px] ${
                  msg.role === 'user'
                    ? 'bg-white text-black font-semibold rounded-tr-none shadow'
                    : 'bg-darker border border-technical rounded-tl-none text-zinc-300'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded bg-white/5 border border-technical flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                )}

              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded bg-white/5 border border-technical flex items-center justify-center shrink-0 animate-spin">
                  <RefreshCw className="w-3.5 h-3.5 text-status-blue" />
                </div>
                <div className="bg-darker border border-technical p-3 rounded text-zinc-400 font-mono text-[11px] italic">
                  Analyzing thread lock bounds and circular dependencies...
                </div>
              </div>
            )}
          </div>

          {/* Prompt sending input form */}
          <form onSubmit={handleChatSubmit} className="p-3 border-t border-technical bg-darker">
            <div className="flex items-center gap-2 bg-[#0A0B0D] p-1.5 rounded border border-technical font-mono">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="PROMPT_COORDINATOR_ENGINE..."
                className="flex-1 bg-transparent px-2 text-[11px] text-[#E0E0E0] outline-none placeholder:text-zinc-600 font-mono"
                id="copilot_input"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || chatLoading}
                className="p-1 px-3 bg-white hover:bg-slate-200 text-black font-semibold rounded text-[11px] transition disabled:opacity-40 font-mono cursor-pointer"
              >
                ASK
              </button>
            </div>
          </form>
        </section>

      </main>

      {/* Specialist Footer Stats Bar */}
      <footer className="h-8 border-t border-technical bg-sidebar-bg flex items-center px-6 justify-between select-none">
        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-dim">
          <div className="flex items-center gap-1.5">
            <span>CPU_CELLS:</span>
            <span className="text-white">12.4%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>RAM_BUFF_STORE:</span>
            <span className="text-white">4.1GiB / 128GiB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>NET_SOCKET_TX:</span>
            <span className="text-status-green">TX: 45MB/s</span>
          </div>
        </div>
        <div className="font-mono text-[10px] text-dim font-bold">
          BUILD_TARGET: //src/buildforge:release_static
        </div>
      </footer>
    </div>
  );
}
