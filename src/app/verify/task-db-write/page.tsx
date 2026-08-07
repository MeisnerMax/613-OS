"use client";

import { useState } from "react";

export default function TaskDatabaseWriteVerificationPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function runProbe() {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch("/api/verify/task-db-write", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      const body = await response.json();
      setResult(body);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "UNKNOWN" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: "0 24px", fontFamily: "system-ui, sans-serif" }}>
      <h1>613 OS · Task Write Verification</h1>
      <p>
        This test creates one temporary task, exercises create, edit, update and audit writes,
        then removes all test data again. Existing 75 migrated tasks are not modified.
      </p>
      <button
        type="button"
        onClick={runProbe}
        disabled={running}
        style={{ padding: "10px 16px", cursor: running ? "wait" : "pointer" }}
      >
        {running ? "Running…" : "Run controlled write test"}
      </button>
      {result !== null && (
        <pre style={{ marginTop: 24, padding: 16, overflowX: "auto", background: "#f4f4f4", borderRadius: 8 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
