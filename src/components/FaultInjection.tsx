import React, { useState } from 'react';
import { AlertOctagon, RefreshCw, Layers, ShieldCheck, PlayCircle, Zap, ShieldAlert, Cpu } from 'lucide-react';

interface FaultInjectionProps {
  onKillAllWorkers: () => void;
  onRestoreAllWorkers: () => void;
}

export default function FaultInjection({
  onKillAllWorkers,
  onRestoreAllWorkers
}: FaultInjectionProps) {
  const [activeFault, setActiveFault] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [reassignCount, setReassignCount] = useState<number>(0);
  const [recoveryTimeSec, setRecoveryTimeSec] = useState<number>(0);
  const [recoveryLog, setRecoveryLog] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const triggerFault = (faultId: string) => {
    setIsSimulating(true);
    setActiveFault(faultId);
    setRecoveryLog([]);
    setRetryCount(0);
    setReassignCount(0);
    setRecoveryTimeSec(0);

    let progressLog: string[] = [];
    const log = (msg: string) => {
      progressLog = [...progressLog, `[${new Date().toLocaleTimeString()}] ${msg}`];
      setRecoveryLog(progressLog);
    };

    if (faultId === 'worker_crash') {
      log('CHAOS TRIGGERED: Hard killing worker-us-central1-a.');
      onKillAllWorkers(); // Simulates massive node outages inside the scheduler
      setReassignCount(1);
      setRetryCount(1);
      
      setTimeout(() => {
        log('HEALTH_CHECKER: Node heartbeat timed out. Port 3000 cluster socket closed.');
        setRecoveryTimeSec(1.5);
      }, 1000);

      setTimeout(() => {
        log('COORDINATOR: Popping crashed targets back into scheduling deque.');
        setReassignCount(2);
      }, 2500);

      setTimeout(() => {
        log('HEALTH_CHECKER: Spawning recovery compute. Auto-triggering gRPC handshake.');
        onRestoreAllWorkers();
        log('RECOVERY SUCCESSFUL: Node restored. Normal worker cycles resumed.');
        setRecoveryTimeSec(4.1);
        setIsSimulating(false);
      }, 4000);

    } else if (faultId === 'network_partition') {
      log('CHAOS TRIGGERED: Injecting packet loss between coordinator & EMEA subnet.');
      setRetryCount(3);
      
      setTimeout(() => {
        log('gRPC_CLIENT: Channel connection lost on europe-west3 node.');
        setRecoveryTimeSec(1.2);
      }, 800);

      setTimeout(() => {
        log('COORDINATOR: Initiating secondary routing hops over backup US gateways.');
        setReassignCount(3);
      }, 2000);

      setTimeout(() => {
        log('gRPC_STREAM: Network partition resolved. latency dropped below 2ms.');
        log('RECOVERY SUCCESSFUL: Secondary route paths validated.');
        setRecoveryTimeSec(3.8);
        setIsSimulating(false);
      }, 3800);

    } else if (faultId === 'high_latency') {
      log('CHAOS TRIGGERED: Injecting high scheduler network latency (+1500ms).');
      
      setTimeout(() => {
        log('COORDINATOR: Build step delay adjusted dynamically.');
        setRetryCount(1);
        setRecoveryTimeSec(1.1);
      }, 1000);

      setTimeout(() => {
        log('COORDINATOR: Scheduler throttled due to heavy gRPC backlog. Safe thread lock enabled.');
        log('RECOVERY COMPLETED: Normal build times recovered.');
        setRecoveryTimeSec(2.5);
        setIsSimulating(false);
      }, 3000);

    } else if (faultId === 'coordinator_failover') {
      log('CHAOS TRIGGERED: Simulated hardware freeze on primary coordinator master!');
      setReassignCount(4);
      
      setTimeout(() => {
        log('RAFT_ELECTION: Secondary backup master detected primary heartbeat failure.');
        setRetryCount(1);
      }, 1000);

      setTimeout(() => {
        log('RAFT_ELECTION: Promoting backup node "coord-us-east4" to MASTER.');
        log('MASTER_COORDINATOR: Synchronized active build trace index (bf-104e).');
        setRecoveryTimeSec(3.2);
      }, 2500);

      setTimeout(() => {
        log('RECOVERY COMPLETED: Swapping coordinator gateways complete. Failover took 4.2s.');
        setRecoveryTimeSec(4.2);
        setIsSimulating(false);
      }, 4200);

    } else if (faultId === 'disk_failure') {
      log('CHAOS TRIGGERED: Corrupt sectors reported on Cache Mount /mnt/bazel_cache.');
      
      setTimeout(() => {
        log('CACHE_STORE: Swapping to offline file store descriptor. Cache bypass enabled.');
        setRetryCount(1);
      }, 1200);

      setTimeout(() => {
        log('DISK_MANAGER: Re-mounting storage with backup cache symlinks.');
        setRecoveryTimeSec(2.8);
      }, 2600);

      setTimeout(() => {
        log('RECOVERY COMPLETED: Storage partition verified and mounted with ext4 journal repair.');
        setRecoveryTimeSec(3.9);
        setIsSimulating(false);
      }, 3900);
    }
  };

  const handleResetChaos = () => {
    setActiveFault(null);
    setRecoveryLog([]);
    setRetryCount(0);
    setReassignCount(0);
    setRecoveryTimeSec(0);
    setIsSimulating(false);
    onRestoreAllWorkers();
  };

  return (
    <div className="bg-[#0D0E11]/85 border border-white/10 rounded-lg p-5 flex flex-col gap-6" id="fault_injection_chaos">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Infrastructure Chaos Testing Panel</span>
        </div>
        <button
          onClick={handleResetChaos}
          className="px-2.5 py-1 text-[10px] font-mono font-bold bg-[#60A5FA]/10 hover:bg-[#60A5FA] border border-[#60A5FA]/20 text-[#60A5FA] hover:text-black rounded transition cursor-pointer"
        >
          RESET_CLUSTER_HEALTH
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Fault Selector Grid */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Select Failure Vector</h4>
          <div className="flex flex-col gap-3">
            {[
              { id: 'worker_crash', title: 'Worker Segfault Collapse', desc: 'Crash high-load worker and trigger DAG rescheduling' },
              { id: 'network_partition', title: 'Subnet Network Partition', desc: 'Simulate high packet drop and routing failback' },
              { id: 'high_latency', title: 'gRPC Backlog Latency', desc: 'Backpressure latency test for thread locks' },
              { id: 'coordinator_failover', title: 'Primary Coordinator Master Outage', desc: 'Triggers Raft consensus promoter backup master' },
              { id: 'disk_failure', title: 'Cache Mount Sector Failure', desc: 'Bypass cache and launch full ext4 repair' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => triggerFault(f.id)}
                disabled={isSimulating}
                className={`text-left p-3.5 rounded border transition-all cursor-pointer ${
                  activeFault === f.id
                    ? 'border-red-500 bg-red-950/15 text-white'
                    : 'border-white/5 bg-black/35 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                } disabled:opacity-40`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold">{f.title}</span>
                  {activeFault === f.id && <Zap className="w-3.5 h-3.5 text-red-400 animate-bounce" />}
                </div>
                <p className="font-mono text-[9px] text-[#88888E] leading-relaxed">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Realtime Recovery Tracking Meters */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Failover Recovery Telemetry</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#050506] border border-white/5 p-4 rounded-lg flex flex-col justify-center">
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#88888E]">RETRY LOOPS</span>
              <span className="text-2xl font-mono font-extrabold text-[#FBBF24] mt-1">{retryCount}</span>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Attempted target rebuilds</p>
            </div>

            <div className="bg-[#050506] border border-white/5 p-4 rounded-lg flex flex-col justify-center">
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#88888E]">REASSIGN OUTAGES</span>
              <span className="text-2xl font-mono font-extrabold text-[#60A5FA] mt-1">{reassignCount}</span>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Thread queue movements</p>
            </div>
          </div>

          <div className="bg-[#050506] border border-white/5 p-4 rounded-lg flex flex-col justify-center">
            <span className="text-[9px] uppercase font-mono tracking-widest text-[#88888E]">FAILOVER LATENCY TIMERS</span>
            <span className="text-2xl font-mono font-extrabold text-red-400 mt-1">
              {recoveryTimeSec > 0 ? `${recoveryTimeSec}s` : 'N/A'}
            </span>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">Clock elapsed before cluster state health verified green</p>
          </div>

          {/* Graphical failover health check widget */}
          <div className="bg-black/30 p-4 rounded border border-white/5 flex flex-col items-center justify-center py-6 text-center">
            {isSimulating ? (
              <>
                <RefreshCw className="w-7 h-7 text-status-amber animate-spin mb-2" />
                <p className="font-mono text-xs text-amber-400 font-bold">FAILOVER ACTIVE: VERIFYING SYMLINKS</p>
              </>
            ) : activeFault ? (
              <>
                <ShieldCheck className="w-7 h-7 text-[#4ADE80] mb-2" />
                <p className="font-mono text-xs text-[#4ADE80] font-bold">ACK REGISTERED GREEN</p>
              </>
            ) : (
              <>
                <Cpu className="w-7 h-7 text-zinc-500 mb-2" />
                <p className="font-mono text-xs text-zinc-500">HEALTHY CLUSTER COGNIZANCE</p>
              </>
            )}
          </div>
        </div>

        {/* Realtime Chaos Logging stream */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Chaos Recovery Terminal</h4>
          <div className="bg-[#050506] border border-white/10 rounded-lg p-3.5 font-mono text-[11px] h-[320px] overflow-y-auto leading-relaxed scrollbar-thin flex flex-col gap-2">
            {recoveryLog.length === 0 ? (
              <p className="text-zinc-600 italic select-none text-center p-8">Pending chaos triggers. Click any Failure Vector on Left Grid to simulate failure loops...</p>
            ) : (
              recoveryLog.map((line, idx) => {
                let textColor = 'text-zinc-300';
                if (line.includes('CHAOS') || line.includes('FAILED')) textColor = 'text-red-400 font-bold';
                else if (line.includes('RECOVERY') || line.includes('SUCCESSFUL')) textColor = 'text-[#4ADE80] font-bold';
                else if (line.includes('COORDINATOR')) textColor = 'text-[#60A5FA]';
                else if (line.includes('HEALTH_CHECKER')) textColor = 'text-[#FBBF24]';

                return (
                  <div key={idx} className={textColor}>
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
