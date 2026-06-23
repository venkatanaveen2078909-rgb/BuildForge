# Architecture Decision Records (ADRs)

This document tracks the core architectural decisions made during the design and implementation of **BuildForge**, modeled on the engineering standard of Google's distributed infrastructure teams.

---

## ADR 1: Handwritten Recursive Descent Parser over Parser Generators (ANTLR, Lex/Yacc)

### Context & Problem Statement
To build a developer-facing tool, diagnostics are as important as correct parsing. When a target's attribute is malformed or missing a closing bracket, tools like ANTLR or Yacc produce generic syntax errors like "unexpected token near ';'" which hurts builder experience. We need structured diagnostic messages with file, line, column coordinates, and precise remediation hints.

### Decision Rationale
We chose to implement a **handwritten recursive descent parser**.
- **Excellent Error Recovery**: We can easily synchronize the cursor to the nearest rule call identifier upon hitting syntax errors, logging subsequent syntax faults instead of halting execution immediately.
- **Accurate Error Siting**: SourceLocation coordinates are mapped closely and stored inside every single parsed token, offering high-fidelity pointers back to the exact code row and column.
- **Zero Dependencies**: Keeps the core parser target free of external generator compilation bottlenecks.

### Consequences
- **Positive**: Exceptional error feedback and recovery. Full control over the grammar parsing flow, mapping AST definitions to beautiful C++23 `std::variant` expressions cleanly.
- **Negative**: High initial investment in raw lexing and parsing code rows. Modifying grammar structure requires structural modification of parsing functions.

---

## ADR 2: Work-Stealing Scheduling over Simple Thread Pools

### Context & Problem Statement
In a dependency-heavy build pipeline, children nodes are continuously resolving, dumping batches of runnable tasks into the pool. Standard thread pools store these in a single global task queue, triggering heavy lock contention between threads on high-CPU core count environments. 

### Decision Rationale
We implemented a **work-stealing thread pool** scheduled per thread.
- **Lock Contention Abatement**: Each thread operates its own lock-guarded double-ended queue (`WorkStealingDeque`). Threads push and pop items from the tail of their own local queue without any lock conflict with other threads.
- **Efficient Load Balancing**: When a thread exhausts its queue, it becomes a "thief" and steals a target from the head of another thread's deque, preventing thread starving.
- **Recursive Task Spawning**: Spawning dependencies is highly localized, boosting CPU cache locality because threads build related dependents sequentially.

### Consequences
- **Positive**: Exceptional throughput at high parallelism (multi-socket architectures) with reduced scheduling latency.
- **Negative**: Slightly higher complexity in thread-blocking mechanisms to avoid busy-waiting under empty load.

---

## ADR 3: Content-Addressed Storage (CAS) with SHA-256

### Context & Problem Statement
Incremental builds are traditionally timestamp-based (which breaks when workers run on different machines, during git checkouts, or when clocks drift). We need a bulletproof, cryptographically secure way to represent artifact versions and match build cache tags across distributed worker nodes.

### Decision Rationale
We implemented a fully content-addressed cache database keyed strictly by the SHA-256 hash of:
1. Inputs (source files content)
2. Recursively resolved transitives (dependency cache hashes)
3. Build command flags, versions, and build-target labels

Artifacts are saved physical-side inside standard nested folders partitioned by hash prefixes: `<store_root>/<hash[0:2]>/<hash[2:4]>/<hash>`.

### Consequences
- **Positive**: Absolute correctness. Machine clocks, file editing times, or network locations never affect cash correctness. Builds are entirely deterministic and hermetic.
- **Negative**: Cache key hashing adds some millisecond overheads to build pipelines, requiring optimization with fast filesystem operations or caching in memory.

---

## ADR 4: Distributed gRPC over Raw Socket TCP

### Context & Problem Statement
The coordinator ↔ worker cluster communication is complex. It needs robust streaming, bidirectional metadata, rapid connection retry loops with backoffs, and tight network protocols to preserve reliability on fragile nodes.

### Decision Rationale
We selected **gRPC + Protobuf** as the remote system layer.
- **Strict Network Contracts**: Interface files format (proto) force explicit APIs, generating ultra-performant C++ serialization targets automatically.
- **Log Streaming Capabilities**: Bidirectional streams allow real-time Log Streaming via `StreamBuildLog` as tasks execute, preventing memory bottlenecks.
- **Deadlines and Metadata**: Simplifies traceback with trace context and span IDs passed via standard gRPC metadata headers.

### Consequences
- **Positive**: Standardized high-performance protocol. Supported widely across different tools.
- **Negative**: Large build toolchain requirements for CMake and vcpkg.
