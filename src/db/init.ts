import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/buildforge';

export const createTables = async () => {
  const defaultDbUrl = process.env.DEFAULT_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  
  const setupClient = new Client({ connectionString: defaultDbUrl });
  try {
    await setupClient.connect();
    const res = await setupClient.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = 'buildforge'`);
    if (res.rowCount === 0) {
      console.log('Creating database buildforge...');
      await setupClient.query(`CREATE DATABASE buildforge`);
    } else {
      console.log('Database buildforge already exists.');
    }
  } catch (err) {
    console.error('Error ensuring database exists. It might already exist or postgres is not running.', err);
  } finally {
    await setupClient.end();
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    await client.query(`
      CREATE TABLE IF NOT EXISTS build_sessions (
        id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(20) NOT NULL,
        trace_id VARCHAR(50) NOT NULL,
        total_targets INTEGER NOT NULL DEFAULT 0,
        completed_targets INTEGER NOT NULL DEFAULT 0,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS build_targets (
        name VARCHAR(100) NOT NULL,
        session_id VARCHAR(50) NOT NULL REFERENCES build_sessions(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        worker_id VARCHAR(50),
        duration_ms INTEGER,
        cache_key VARCHAR(100),
        PRIMARY KEY (name, session_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(20) NOT NULL,
        capacity INTEGER NOT NULL,
        active_task_id VARCHAR(100),
        last_heartbeat TIMESTAMP NOT NULL,
        cpu_usage INTEGER NOT NULL,
        memory_usage INTEGER NOT NULL,
        tags TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS target_logs (
        id SERIAL PRIMARY KEY,
        target_name VARCHAR(100) NOT NULL,
        session_id VARCHAR(50) NOT NULL,
        log TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (target_name, session_id) REFERENCES build_targets(name, session_id) ON DELETE CASCADE
      );
    `);

    // Insert dummy workers if they don't exist
    const workersRes = await client.query('SELECT COUNT(*) FROM workers');
    if (parseInt(workersRes.rows[0].count) === 0) {
      console.log('Inserting default workers...');
      await client.query(`
        INSERT INTO workers (id, status, capacity, last_heartbeat, cpu_usage, memory_usage, tags) VALUES
        ('worker-us-central1-a', 'IDLE', 4, NOW(), 2, 120, 'cpu-opt,has-compiler-v23'),
        ('worker-us-east4-b', 'IDLE', 4, NOW(), 1, 94, 'gpu-opt,has-compiler-v23'),
        ('worker-europe-west3-c', 'IDLE', 8, NOW(), 3, 154, 'high-mem,has-compiler-v23')
      `);
    }

    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables', err);
  } finally {
    await client.end();
  }
};

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createTables();
}
