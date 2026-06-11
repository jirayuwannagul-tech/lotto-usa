// Cutoff is 7:00 AM Los Angeles time
// LA = America/Los_Angeles (handles PST/PDT automatically)

export function getNextCutoff(drawCutoffAt: Date): Date {
  return new Date(drawCutoffAt)
}

export function isCutoffPassed(cutoffAt: Date): boolean {
  return new Date() > new Date(cutoffAt)
}

export function formatCutoffLocal(cutoffAt: Date): string {
  return new Date(cutoffAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  })
}
