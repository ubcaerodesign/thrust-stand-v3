"""
AeroThrust V3 - Local SQLite WAL Storage Service
"""

import sqlite3
import asyncio
import csv
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from app.core.config import DATABASE_PATH, EXPORTS_DIR, STORAGE_FLUSH_INTERVAL_SEC
from app.core.protocol import TelemetryData


class StorageService:
    def __init__(self):
        self.db_path = DATABASE_PATH
        self.active_run_id: Optional[str] = None
        self._batch_queue: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()
        self._flush_task: Optional[asyncio.Task] = None
        self._is_running = False

    def init_database(self):
        """Initializes tables and configures Write-Ahead Logging (WAL)."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            cursor = conn.cursor()

            # Session Metadata Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_runs (
                run_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                name TEXT,
                competition_class TEXT,
                motor_model TEXT,
                propeller_model TEXT,
                battery_config TEXT,
                notes TEXT
            );
            """)

            # High-Frequency Telemetry Samples Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                uptime_ms INTEGER,
                thrust_g INTEGER,
                torque_g INTEGER,
                ch3_g INTEGER,
                ch4_g INTEGER,
                voltage_v REAL,
                current_a REAL,
                power_w REAL,
                rpm INTEGER,
                flags INTEGER,
                FOREIGN KEY (run_id) REFERENCES test_runs (run_id)
            );
            """)
            conn.commit()

    async def start(self):
        self._is_running = True
        self.init_database()
        self._flush_task = asyncio.create_task(self._periodic_flush())

    async def stop(self):
        self._is_running = False
        if self._flush_task:
            self._flush_task.cancel()
        await self.flush()

    def start_session(self, metadata: Dict[str, Any]) -> str:
        """Starts a new test run record."""
        run_id = str(uuid.uuid4())[:8]
        created_at = datetime.utcnow().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
            INSERT INTO test_runs (run_id, created_at, name, competition_class, motor_model, propeller_model, battery_config, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run_id,
                created_at,
                metadata.get("name", f"Run_{run_id}"),
                metadata.get("competition_class", "MCR"),
                metadata.get("motor_model", "Unknown"),
                metadata.get("propeller_model", "Unknown"),
                metadata.get("battery_config", "4S"),
                metadata.get("notes", "")
            ))
            conn.commit()

        self.active_run_id = run_id
        return run_id

    async def stop_session(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Stops the current recording session, flushes all remaining samples to SQLite,
        and automatically exports the run to a CSV file.
        Returns (run_id, exported_csv_path).
        """
        if not self.active_run_id:
            return None, None

        last_id = self.active_run_id
        self.active_run_id = None

        # Flush any remaining samples in the batch queue immediately
        await self.flush()

        # Generate CSV export automatically
        csv_path = self.export_csv(last_id)
        return last_id, csv_path

    async def record_sample(self, sample: TelemetryData):
        """Buffers a sample if a recording session is actively running."""
        if not self.active_run_id:
            return

        async with self._lock:
            self._batch_queue.append({
                "run_id": self.active_run_id,
                "uptime_ms": sample.uptime_ms,
                "thrust_g": sample.thrust_g,
                "torque_g": sample.torque_g,
                "ch3_g": sample.ch3_g,
                "ch4_g": sample.ch4_g,
                "voltage_v": sample.voltage_v,
                "current_a": sample.current_a,
                "power_w": sample.power_w,
                "rpm": sample.rpm,
                "flags": sample.flags
            })

    async def flush(self):
        """Flushes the buffered batch of samples into SQLite inside a single transaction."""
        async with self._lock:
            if not self._batch_queue:
                return
            to_insert = self._batch_queue[:]
            self._batch_queue.clear()

        # Run disk write in thread pool to prevent event loop delay
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._write_batch_to_disk, to_insert)

    def _write_batch_to_disk(self, samples: List[Dict[str, Any]]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.executemany("""
            INSERT INTO telemetry_samples (
                run_id, uptime_ms, thrust_g, torque_g, ch3_g, ch4_g,
                voltage_v, current_a, power_w, rpm, flags
            ) VALUES (
                :run_id, :uptime_ms, :thrust_g, :torque_g, :ch3_g, :ch4_g,
                :voltage_v, :current_a, :power_w, :rpm, :flags
            )
            """, samples)
            conn.commit()

    async def _periodic_flush(self):
        while self._is_running:
            await asyncio.sleep(STORAGE_FLUSH_INTERVAL_SEC)
            try:
                await self.flush()
            except Exception as e:
                print(f"[ERROR] Database flush failed: {e}")

    def export_csv(self, run_id: str) -> Optional[str]:
        """Exports a test session's telemetry points directly to a CSV file."""
        output_file = EXPORTS_DIR / f"run_{run_id}.csv"

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM test_runs WHERE run_id = ?", (run_id,))
            run_meta = cursor.fetchone()
            if not run_meta:
                return None

            cursor.execute("""
            SELECT uptime_ms, thrust_g, torque_g, ch3_g, ch4_g, voltage_v, current_a, power_w, rpm, flags
            FROM telemetry_samples
            WHERE run_id = ?
            ORDER BY uptime_ms ASC
            """, (run_id,))
            rows = cursor.fetchall()

        with open(output_file, mode="w", newline="") as f:
            writer = csv.writer(f)
            # Write session metadata headers
            writer.writerow(["# Run ID", run_meta["run_id"]])
            writer.writerow(["# Created At", run_meta["created_at"]])
            writer.writerow(["# Name", run_meta["name"]])
            writer.writerow(["# Class", run_meta["competition_class"]])
            writer.writerow(["# Motor", run_meta["motor_model"]])
            writer.writerow(["# Propeller", run_meta["propeller_model"]])
            writer.writerow(["# Battery", run_meta["battery_config"]])
            writer.writerow(["# Sample Count", len(rows)])
            writer.writerow([])
            # Write column names
            writer.writerow([
                "Uptime_ms", "Thrust_g", "Torque_g", "CH3_g", "CH4_g",
                "Voltage_V", "Current_A", "Power_W", "RPM", "Flags"
            ])
            for r in rows:
                writer.writerow([
                    r["uptime_ms"], r["thrust_g"], r["torque_g"], r["ch3_g"], r["ch4_g"],
                    r["voltage_v"], r["current_a"], r["power_w"], r["rpm"], hex(r["flags"])
                ])

        print(f"[STORAGE] Exported {len(rows)} samples to {output_file}")
        return str(output_file)