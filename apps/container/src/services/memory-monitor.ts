import type { WebSocket } from "ws";

/**
 * Starts a memory monitor that sends memory stats to the client every second.
 * Returns a timer that can be used to stop the monitor.
 */
export function startMemoryMonitor(ws: WebSocket, intervalMs = 1000): NodeJS.Timeout {
  return setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      const mem = process.memoryUsage();
      ws.send(
        JSON.stringify({
          type: "memory_stats",
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          rss: Math.round(mem.rss / 1024 / 1024),
          external: Math.round(mem.external / 1024 / 1024),
        }),
      );
    }
  }, intervalMs);
}

/**
 * Stops the memory monitor.
 */
export function stopMemoryMonitor(timer: NodeJS.Timeout): void {
  clearInterval(timer);
}
