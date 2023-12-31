/**
 * Collection of the various types of lines encountered in a TAP stream
 */
export const lineTypes = {
  testPoint: /^(not )?ok(?: ([0-9]+))?(?:(?: -)?( .*?))?(\{?)\n$/,
  pragma: /^pragma ([+-])([a-zA-Z0-9_-]+)\n$/,
  bailout: /^bail out!(.*)\n$/i,
  version: /^TAP version ([0-9]+)\n$/i,
  childVersion: /^(    )+TAP version ([0-9]+)\n$/i,
  plan: /^([0-9]+)\.\.([0-9]+)(?:\s+(?:#\s*(.*)))?\n$/,
  subtest: /^# Subtest(?:: (.*))?\n$/,
  subtestIndent: /^    # Subtest(?:: (.*))?\n$/,
  comment: /^\s*#.*\n$/,
} as const

/**
 * The type of a line, and its constituent parsed pieces
 */
export type ParsedLine = [string, RegExpMatchArray]

/**
 * Determine the type of line, and parse it into a {@link ParsedLine}
 */
export const lineType = (line: string): ParsedLine | null => {
  for (const [t, pattern] of Object.entries(lineTypes)) {
    const match = line.match(pattern)
    if (match) return [t, match]
  }
  return null
}
