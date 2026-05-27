/** True when Webpack failed to load a module (stale .next cache or post-deploy chunk mismatch). */
export function isStaleWebpackChunkError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes("originalfactory.call") ||
    m.includes("reading 'call'") ||
    m.includes('reading "call"') ||
    m.includes("(reading 'call')")
  )
}
