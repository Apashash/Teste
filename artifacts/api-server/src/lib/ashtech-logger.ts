import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../../logs");
const LOG_FILE = path.join(LOG_DIR, "ashtech-errors.log");
const MAX_LINES = 500;

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export interface AshtechLogEntry {
  timestamp: string;
  endpoint: string;
  httpStatus: number;
  contentType: string | null;
  isJson: boolean;
  responseBody: string;
  requestBody?: unknown;
  note: string;
}

export function logAshtechError(entry: AshtechLogEntry): void {
  const line = JSON.stringify(entry) + "\n";
  try {
    fs.appendFileSync(LOG_FILE, line, "utf8");
    rotateLogs();
  } catch {
    // ne pas crasher si le log échoue
  }
}

function rotateLogs(): void {
  try {
    const content = fs.readFileSync(LOG_FILE, "utf8");
    const lines = content.split("\n").filter(Boolean);
    if (lines.length > MAX_LINES) {
      fs.writeFileSync(LOG_FILE, lines.slice(-MAX_LINES).join("\n") + "\n", "utf8");
    }
  } catch {
    // ignore
  }
}

export function readRecentLogs(limit = 50): AshtechLogEntry[] {
  try {
    const content = fs.readFileSync(LOG_FILE, "utf8");
    const lines = content.split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((l) => JSON.parse(l) as AshtechLogEntry);
  } catch {
    return [];
  }
}

export function getLogFilePath(): string {
  return LOG_FILE;
}
