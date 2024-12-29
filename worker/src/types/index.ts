import { UUID } from "crypto";
export type Language = "py" | "js" | "java" | "cpp";

export interface LanguageConfig {
  extension: string;
  fileName: string;
  compileCommand?: string;
  runCommand: string;
  opts?: string;
}

export interface ExecutionOptions {
  timeLimit?: number;
  subProcessLimit?: number;
  memoryLimit?: number;
}

export interface ExecutionResult {
  verdict: "OK" | "CE" | "RE" | "SG" | "TO" | "XX";
  time: number;
  memory: number;
  lineNumber?: number | null;

  stdout?: string;
  stderr?: string;

  errorType?: string;
  exitCode?: number;
  exitSignal?: number;
}

type JobStatus = "queued" | "running" | "completed" | "failed";

export type Job = {
  id: UUID;
  status: JobStatus;
  details: {
    lang: Language;
    code: string;
    createdAt: string;
    memoryLimit?: number;
    subProcessLimit?: number;
    stdin?: string;
    timeLimit?: number;
  };
  result: ExecutionResult;
};
