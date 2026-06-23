import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, SkipBack, SkipForward, Landmark, History, RotateCcw, Cpu, CheckCircle2 } from 'lucide-react';

interface ReplayStep {
  stepIndex: number;
  description: string;
  workerStates: {
    [workerId: string]: { task: string; status: string; cpu: number };
  };
  targetStates: {
    [targetName: string]: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'CACHED' | 'FAILED';
  };
  metrics: {
    cacheHits: number;
    completed: number;
  };
}

export default function BuildReplay() {
  const [selectedBuildId, setSelectedBuildId] = useState<string>('b-9022');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 1x, 2x, 4x
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Structural mock data representing two distinct builds for side-by-side replay:
  // Build b-9022 (Healthy cache-heavy build) and Build b-4180 (Build with fault/retry, network latency)
  const steps_b9022: ReplayStep[] = [
    {
      stepIndex: 0,
      description: 'Build Initialized. Initial static manifest read complete.',
      workerStates: {
        'worker-us-central1-a': { task: 'idle', status: 'IDLE', cpu: 2 },
        'worker-us-east4-b': { task: 'idle', status: 'IDLE', cpu: 1 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'QUEUED',
        '//:graph_engine': 'QUEUED',
        '//:work_stealer': 'QUEUED',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 0, completed: 0 }
    },
    {
      stepIndex: 1,
      description: 'Layer 0 scheduled: targeting ":common_utils". Cache matched!',
      workerStates: {
        'worker-us-central1-a': { task: 'Fetch inputs for //:common_utils', status: 'FETCHING_INPUTS', cpu: 12 },
        'worker-us-east4-b': { task: 'idle', status: 'IDLE', cpu: 1 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'CACHED',
        '//:graph_engine': 'QUEUED',
        '//:work_stealer': 'QUEUED',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 1, completed: 1 }
    },
    {
      stepIndex: 2,
      description: 'Layer 1 scheduled: ":graph_engine" and ":work_stealer" dispatched to thread pool.',
      workerStates: {
        'worker-us-central1-a': { task: 'Compiling scheduler.cpp', status: 'EXECUTING', cpu: 65 },
        'worker-us-east4-b': { task: 'Compiling graph.cpp', status: 'EXECUTING', cpu: 82 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'CACHED',
        '//:graph_engine': 'RUNNING',
        '//:work_stealer': 'RUNNING',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 1, completed: 1 }
    },
    {
      stepIndex: 3,
      description: '":work_stealer" compilation complete. packaging compilation artifacts.',
      workerStates: {
        'worker-us-central1-a': { task: 'Uploading artifacts for //:work_stealer', status: 'UPLOADING_ARTIFACTS', cpu: 14 },
        'worker-us-east4-b': { task: 'Compiling graph.cpp', status: 'EXECUTING', cpu: 44 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'CACHED',
        '//:graph_engine': 'RUNNING',
        '//:work_stealer': 'SUCCEEDED',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 1, completed: 2 }
    },
    {
      stepIndex: 4,
      description: 'Both dependents built. final linking in progress for ":buildforge_core".',
      workerStates: {
        'worker-us-central1-a': { task: 'idle', status: 'IDLE', cpu: 2 },
        'worker-us-east4-b': { task: 'Linking binary buildforge_core', status: 'EXECUTING', cpu: 94 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'CACHED',
        '//:graph_engine': 'SUCCEEDED',
        '//:work_stealer': 'SUCCEEDED',
        '//:buildforge_core': 'RUNNING'
      },
      metrics: { cacheHits: 1, completed: 3 }
    },
    {
      stepIndex: 5,
      description: 'All nodes compile clean. output path written to dist/bin/core_native_elf_binary.',
      workerStates: {
        'worker-us-central1-a': { task: 'idle', status: 'IDLE', cpu: 2 },
        'worker-us-east4-b': { task: 'idle', status: 'IDLE', cpu: 1 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'CACHED',
        '//:graph_engine': 'SUCCEEDED',
        '//:work_stealer': 'SUCCEEDED',
        '//:buildforge_core': 'SUCCEEDED'
      },
      metrics: { cacheHits: 1, completed: 4 }
    }
  ];

  const steps_b4180: ReplayStep[] = [
    {
      stepIndex: 0,
      description: 'Replay start. distributed cold build requested by developer.',
      workerStates: {
        'worker-us-central1-a': { task: 'idle', status: 'IDLE', cpu: 2 },
        'worker-us-east4-b': { task: 'idle', status: 'IDLE', cpu: 1 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'QUEUED',
        '//:graph_engine': 'QUEUED',
        '//:work_stealer': 'QUEUED',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 0, completed: 0 }
    },
    {
      stepIndex: 1,
      description: '":common_utils" compilation assigned to US-Central worker. Thrashing CPU...',
      workerStates: {
        'worker-us-central1-a': { task: 'Compiling utils.cpp', status: 'EXECUTING', cpu: 99 },
        'worker-us-east4-b': { task: 'idle', status: 'IDLE', cpu: 1 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'RUNNING',
        '//:graph_engine': 'QUEUED',
        '//:work_stealer': 'QUEUED',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 0, completed: 0 }
    },
    {
      stepIndex: 2,
      description: 'FAULT DETECTED: US-Central worker crashed mid-compilation! Disk I/O lost.',
      workerStates: {
        'worker-us-central1-a': { task: 'HARD_CRASH_SEGFAULT', status: 'DEAD', cpu: 0 },
        'worker-us-east4-b': { task: 'idle', status: 'IDLE', cpu: 1 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'FAILED',
        '//:graph_engine': 'QUEUED',
        '//:work_stealer': 'QUEUED',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 0, completed: 0 }
    },
    {
      stepIndex: 3,
      description: 'COORDINATOR DISPATCH RECOVERY: Reassigning ":common_utils" to Europe helper node.',
      workerStates: {
        'worker-us-central1-a': { task: 'CRASH_STATE_DUMP', status: 'DEAD', cpu: 0 },
        'worker-us-east4-b': { task: 'idle', status: 'IDLE', cpu: 1 },
        'worker-europe-west3-c': { task: 'Compiling utils.cpp (Retrying)', status: 'EXECUTING', cpu: 90 }
      },
      targetStates: {
        '//:common_utils': 'RUNNING',
        '//:graph_engine': 'QUEUED',
        '//:work_stealer': 'QUEUED',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 0, completed: 0 }
    },
    {
      stepIndex: 4,
      description: 'Retried task succeeded in Europe pool. Distributing compile cache downstream.',
      workerStates: {
        'worker-us-central1-a': { task: 'coordinator recovery reboot', status: 'IDLE', cpu: 5 },
        'worker-us-east4-b': { task: 'idle', status: 'IDLE', cpu: 1 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'SUCCEEDED',
        '//:graph_engine': 'QUEUED',
        '//:work_stealer': 'QUEUED',
        '//:buildforge_core': 'QUEUED'
      },
      metrics: { cacheHits: 0, completed: 1 }
    },
    {
      stepIndex: 5,
      description: 'Full recovery achieved. Dependent graph targets execute cleanly with cache hits.',
      workerStates: {
        'worker-us-central1-a': { task: 'idle', status: 'IDLE', cpu: 2 },
        'worker-us-east4-b': { task: 'Compiling graph.cpp via local cache index', status: 'EXECUTING', cpu: 20 },
        'worker-europe-west3-c': { task: 'idle', status: 'IDLE', cpu: 3 }
      },
      targetStates: {
        '//:common_utils': 'SUCCEEDED',
        '//:graph_engine': 'CACHED',
        '//:work_stealer': 'CACHED',
        '//:buildforge_core': 'SUCCEEDED'
      },
      metrics: { cacheHits: 2, completed: 4 }
    }
  ];

  // Resolve steps depending on user build selected
  const activeStepsSet = selectedBuildId === 'b-9022' ? steps_b9022 : steps_b4180;
  const currentStep = activeStepsSet[currentStepIndex] || activeStepsSet[0];

  // Automate ticks inside playback:
  useEffect(() => {
    if (isPlaying) {
      const stepDuration = 1500 / speedMultiplier;
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= activeStepsSet.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, stepDuration);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speedMultiplier, activeStepsSet, currentStepIndex]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStepIndex < activeStepsSet.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  return (
    <div className="bg-[#050506]/35 border border-white/10 p-5 rounded-lg flex flex-col gap-6" id="build_replay_panel">
      {/* Selector and Main Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0D0E11] p-3 rounded border border-white/5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-status-amber" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Historical Replay Room</span>
        </div>

        {/* Build Selector */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-zinc-500">LOAD BUILD:</span>
          <select
            value={selectedBuildId}
            onChange={(e) => {
              setSelectedBuildId(e.target.value);
              setCurrentStepIndex(0);
              setIsPlaying(false);
            }}
            className="bg-black border border-white/5 rounded px-2.5 py-1 font-mono text-xs text-white uppercase hover:border-white/10"
          >
            <option value="b-9022">b-9022 (Healthy Cache Hit Ratio)</option>
            <option value="b-4180">b-4180 (Crash & Chaos Recovery)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Control Center */}
        <div className="bg-[#0D0E11]/90 border border-white/10 p-4 rounded-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Replay Status</h4>
            <div className="bg-black/60 p-3 rounded border border-white/5 space-y-1">
              <span className="text-[9px] font-mono text-zinc-500">STEP {currentStep.stepIndex + 1} OF {activeStepsSet.length}</span>
              <p className="text-white text-xs font-mono leading-relaxed h-[48px] overflow-y-auto">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Core buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 py-2 border-y border-white/5">
            <button
              onClick={handleRestart}
              className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded transition cursor-pointer"
              title="Reset Replay"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleStepBackward}
              disabled={currentStepIndex === 0}
              className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded disabled:opacity-20 transition cursor-pointer"
              title="Step Backward"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-3 bg-white text-black hover:bg-slate-200 rounded-full transition flex items-center justify-center shadow cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black" />}
            </button>
            <button
              onClick={handleStepForward}
              disabled={currentStepIndex === activeStepsSet.length - 1}
              className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded disabled:opacity-20 transition cursor-pointer"
              title="Step Forward"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Controls */}
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500 uppercase text-[9px] tracking-wider">Play Speed</span>
            <div className="flex bg-black p-0.5 rounded border border-white/5">
              {[1, 2, 4].map((multi) => (
                <button
                  key={multi}
                  onClick={() => setSpeedMultiplier(multi)}
                  className={`px-2.5 py-0.5 rounded transition font-bold ${
                    speedMultiplier === multi ? 'bg-[#60A5FA] text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  x{multi}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right visualization blocks: active targets and workers */}
        <div className="xl:col-span-2 space-y-6">
          {/* Targets states representing workspace rules */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">Targets State Tracking</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(currentStep.targetStates).map(([target, status]) => {
                let cardColor = 'border-white/5 text-zinc-500 bg-black/10';
                if (status === 'RUNNING') cardColor = 'border-[#FBBF24]/40 text-[#FBBF24] bg-[#FBBF24]/5 animate-pulse';
                else if (status === 'SUCCEEDED') cardColor = 'border-[#4ADE80]/40 text-[#4ADE80] bg-[#4ADE80]/5';
                else if (status === 'CACHED') cardColor = 'border-[#60A5FA]/40 text-[#60A5FA] bg-[#60A5FA]/5';
                else if (status === 'FAILED') cardColor = 'border-red-500/50 text-red-400 bg-red-950/10';

                return (
                  <div key={target} className={`border px-3 py-2.5 rounded font-mono text-center transition-all ${cardColor}`}>
                    <p className="text-[11px] font-bold truncate">{target.replace('//:', ':')}</p>
                    <p className="text-[8px] tracking-widest font-extrabold uppercase mt-1 text-zinc-500">{status}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Worker task allocations */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">Thread Dispatch allocations</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(currentStep.workerStates).map(([workerId, state]) => {
                let statusColor = 'text-green-400';
                if (state.status === 'DEAD') statusColor = 'text-red-500';
                else if (state.status === 'EXECUTING') statusColor = 'text-amber-400';
                else if (state.status === 'FETCHING_INPUTS') statusColor = 'text-blue-400';

                return (
                  <div key={workerId} className="bg-[#0D0E11] border border-white/5 p-3 rounded font-mono text-[11px] space-y-1.5">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="font-bold text-white truncate max-w-[120px]">{workerId}</span>
                      <span className={`text-[8px] font-bold uppercase ${statusColor}`}>{state.status}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Thread Task:</span>
                      <span className="text-zinc-300 truncate max-w-[100px]">{state.task}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Alloc CPU:</span>
                      <span className="text-zinc-300">{state.cpu}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
