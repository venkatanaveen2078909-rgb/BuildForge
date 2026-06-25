<div align="center">
  <img src="https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=3132&auto=format&fit=crop" width="100%" height="300" style="object-fit: cover; border-radius: 12px; margin-bottom: 20px;" alt="BuildForge Banner" />

  <h1>🚀 BuildForge</h1>
  <p><strong>A High-Performance Distributed Build Execution Engine & Telemetry Dashboard</strong></p>

  <p>
    <img src="https://img.shields.io/badge/C%2B%2B-23-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="C++23" />
    <img src="https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/PostgreSQL-16.x-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  </p>
</div>

---

## 🌟 Overview

**BuildForge** is a fully functional, web-based prototype of a distributed build system conceptually modeled after enterprise-grade tools like **Google's Blaze** and **Bazel**. 

It is designed to solve the complexities of orchestrating massive codebases by analyzing dependencies, establishing a **Directed Acyclic Graph (DAG)**, and distributing compile jobs efficiently across parallel workers—all while providing rich, real-time visual telemetry to the user.

## ✨ Key Features

- **🧠 Custom AST Parser:** Features a hand-written Lexer and Parser capable of reading raw `BUILD` file syntaxes to generate a structured Abstract Syntax Tree.
- **🕸️ DAG & Topological Sorting:** Automatically maps complex dependencies into a Directed Acyclic Graph. Uses **Kahn's Algorithm** to group independent targets into parallel batches and explicitly detect circular dependency deadlocks.
- **⚙️ Real OS Execution:** Replaces front-end simulation with a true Node.js backend executing native `child_process.spawn` commands (e.g., `g++`) to compile actual source files!
- **🗄️ PostgreSQL Persistence:** Maintains concurrent, ACID-compliant states of your entire build session across `build_sessions`, `build_targets`, and `workers` tables.
- **📊 Real-time Telemetry Dashboard:** A beautifully crafted React (Vite) interface that polls the Node.js backend to display sub-second target status, resource utilization, and live compilation logs.

---

## 🏗️ Architecture

```mermaid
graph TD;
    A[React Telemetry Dashboard] -->|POST /api/build| B(Node.js Express Backend);
    B --> C{Custom Lexer & Parser};
    C -->|Generates AST| D[DAG Resolution & Kahn's Sort];
    D --> E[PostgreSQL State DB];
    D --> F[Node.js Child Process Executor];
    F -->|Executes g++| G[Local Workspace Files];
    F -->|Updates Status| E;
    A -->|GET /api/build/:id| E;
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (Running locally on default port 5432)

### 1. Environment Setup
Create a `.env` file in the root directory and configure your PostgreSQL database:
```env
DATABASE_URL=postgresql://postgres:root@localhost:5432/buildforge
DEFAULT_DATABASE_URL=postgresql://postgres:root@localhost:5432/postgres
```

### 2. Installation
```bash
# Install dependencies
npm install

# Initialize PostgreSQL Schema
npx tsx src/db/init.ts
```

### 3. Run the System
```bash
# Starts the Vite frontend and Node.js backend concurrently
npm run dev
```

Navigate to `http://localhost:3000` to interact with the dashboard. Hit **RUN_BUILD** to trigger the execution engine and watch your build artifacts get compiled in real-time!

---

## 🎯 Ideal for Resume Portfolios
This project actively demonstrates a deep understanding of core Software Engineering principles highly valued at top tech companies (like Google, Meta, and Amazon):
- Graph Theory (DAGs, Cycle Detection)
- Compiler Theory (Lexical Analysis, AST)
- Distributed Systems & Concurrency
- Full-Stack Architecture (React + Node + SQL)

<div align="center">
  <i>Built with passion by Venkata Naveen</i>
</div>
