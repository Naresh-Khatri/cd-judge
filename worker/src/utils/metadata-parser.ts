interface SandboxMetadata {
  /**
   * Total memory use by the whole control group (in kilobytes)
   * Only present when control groups are enabled
   */
  "cg-mem"?: number;

  /**
   * Indicates if the program was killed by the out-of-memory killer
   * Reported only on Linux 4.13 and later
   */
  "cg-oom-killed"?: boolean;

  /**
   * Number of context switches forced by the kernel
   */
  "csw-forced"?: number;

  /**
   * Number of voluntary context switches
   */
  "csw-voluntary"?: number;

  /**
   * Exit code when the program exits normally
   */
  exitcode?: number;

  /**
   * Fatal signal that caused the program to exit
   */
  exitsig?: number;

  /**
   * Indicates if the program was terminated by the sandbox
   */
  killed?: boolean;

  /**
   * Maximum resident set size of the process (in kilobytes)
   */
  "max-rss"?: number;

  /**
   * Human-readable status message
   */
  message?: string;

  /**
   * Two-letter status code
   * RE - run-time error
   * SG - died on a signal
   * TO - timed out
   * XX - internal sandbox error
   */
  status?: "RE" | "SG" | "TO" | "XX";

  /**
   * Run time of the program in fractional seconds
   */
  time?: number;

  /**
   * Wall clock time of the program in fractional seconds
   */
  "time-wall"?: number;
}

export const metadataParser = (metadataContent: string): SandboxMetadata => {
  const metadata: SandboxMetadata = {};

  // Split the content into lines and process each
  const lines = metadataContent.trim().split("\n");

  for (const line of lines) {
    // Split the line into key and value
    const [rawKey, rawValue] = line.split(":", 2);

    if (!rawKey || rawValue === undefined) {
      throw new Error(`Invalid metadata line: ${line}`);
    }

    const key = rawKey.trim() as keyof SandboxMetadata;
    const value = rawValue.trim();

    // Type conversions and parsing
    switch (key) {
      case "cg-mem":
      case "csw-forced":
      case "csw-voluntary":
      case "exitcode":
      case "exitsig":
      case "max-rss":
      case "time":
      case "time-wall":
        metadata[key] = Number(value);
        break;

      case "cg-oom-killed":
      case "killed":
        metadata[key] = true;
        break;

      case "status":
        if (["RE", "SG", "TO", "XX"].includes(value)) {
          metadata[key] = value as SandboxMetadata["status"];
        } else {
          throw new Error(`Invalid status code: ${value}`);
        }
        break;

      case "message":
        metadata[key] = value;
        break;

      default:
        console.warn(`Unrecognized metadata key: ${key}`);
    }
  }

  return metadata;
};
