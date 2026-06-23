export interface SourceLocation {
  path: string;
  line: number;
  col: number;
}

export type TokenType =
  | 'Ident'
  | 'String'
  | 'LPar'
  | 'RPar'
  | 'LBracket'
  | 'RBracket'
  | 'Equal'
  | 'Comma'
  | 'Eof'
  | 'Unknown';

export interface Token {
  type: TokenType;
  lexeme: string;
  location: SourceLocation;
}

export interface Diagnostic {
  severity: 'Info' | 'Warning' | 'Error';
  message: string;
  location: SourceLocation;
  hint: string;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
  location: SourceLocation;
}

export interface LabelExpr {
  type: 'LabelExpr';
  value: string; // e.g. "//app:main"
  location: SourceLocation;
}

export interface ListExpr {
  type: 'ListExpr';
  elements: (StringLiteral | LabelExpr)[];
  location: SourceLocation;
}

export type Expr = StringLiteral | LabelExpr | ListExpr;

export interface RuleCall {
  ruleType: string;
  name: string;
  args: Record<string, Expr>;
  location: SourceLocation;
}

// Simulation Targets
export interface BuildTarget {
  name: string; // e.g., "//app:main"
  ruleType: string; // "cc_binary" | "cc_library" | "cc_test"
  srcs: string[];
  deps: string[];
  timeoutSeconds: number;
}

// Worker Simulation States
export interface WorkerState {
  id: string;
  status: 'IDLE' | 'FETCHING_INPUTS' | 'EXECUTING' | 'UPLOADING_ARTIFACTS' | 'DEAD';
  capacity: number;
  activeTaskId?: string;
  lastHeartbeat: string; // ISO String
  cpuUsage: number;
  memoryUsage: number;
  localQueue: string[]; // Target names in local deque
  tags: string[];
}

// Build Simulation Session
export interface BuildSession {
  buildId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  traceId: string;
  totalTargets: number;
  completedTargets: number;
  targets: Record<string, {
    name: string;
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CACHED';
    workerId?: string;
    durationMs?: number;
    logs: string[];
    cacheKey?: string;
  }>;
  startTime: string;
  endTime?: string;
}

// Live Metrics
export interface SystemMetrics {
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatio: number;
  bytesSaved: number;
  timeSavedMs: number;
  queueDepth: number;
}
