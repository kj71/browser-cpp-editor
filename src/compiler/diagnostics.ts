export interface DiagnosticItem {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'note';
  message: string;
  raw: string;
}

const DIAGNOSTIC_REGEX = /^(?:.*\/)?([a-zA-Z0-9_.-]+):(\d+):(\d+):\s*(error|fatal error|warning|note):\s*(.+)$/;

export function parseDiagnostics(stderr: string): DiagnosticItem[] {
  const lines = stderr.split(/\r?\n/);
  const items: DiagnosticItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(DIAGNOSTIC_REGEX);
    if (match) {
      const [, file, lineStr, colStr, rawSeverity, rawMsg] = match;
      let severity: 'error' | 'warning' | 'note' = 'error';
      if (rawSeverity === 'warning') severity = 'warning';
      else if (rawSeverity === 'note') severity = 'note';
      else severity = 'error';

      let message = rawMsg.trim();

      // Enhance exceptions disabled diagnostics for clarity
      if (message.includes("exceptions disabled")) {
        message = `${message} — C++ exceptions (try/catch/throw) are not supported in the WebAssembly browser environment.`;
      }

      // Collect any subsequent context lines (caret line, snippet line)
      const rawLines = [line];
      let j = i + 1;
      while (j < lines.length && !lines[j].match(DIAGNOSTIC_REGEX) && (lines[j].startsWith(' ') || lines[j].includes('|') || lines[j].includes('^'))) {
        rawLines.push(lines[j]);
        j++;
      }

      items.push({
        file,
        line: parseInt(lineStr, 10),
        column: parseInt(colStr, 10),
        severity,
        message,
        raw: rawLines.join('\n')
      });
    }
  }

  return items;
}
