import { promises as fs } from "fs";
import path from "path";
import {
  ExecutionOptions,
  ExecutionResult,
  Language,
  LanguageConfig,
} from "../types";
import { execSync } from "child_process";
import { metadataParser } from "./metadata-parser";
import LANGUAGE_CONFIGS from "../config/languages";
import { SUPPORTED_LANGS } from "../constants";

type FilePaths = {
  workdir: string;
  boxdir: string;
  files: {
    stdin: string;
    stdout: string;
    stderr: string;
    metadata: string;
    compile: string;
  };
};

class IsolateRunner {
  private readonly STDIN_FILE = "stdin.txt";
  private readonly STDOUT_FILE = "stdout.txt";
  private readonly STDERR_FILE = "stderr.txt";
  private readonly METADATA_FILE = "metadata.txt";
  private readonly COMPILE_OUTPUT_FILE = "compile_output.txt";

  private rootDir: FilePaths = {
    workdir: "",
    boxdir: "",
    files: {
      stdin: "",
      stdout: "",
      stderr: "",
      metadata: "",
      compile: "",
    },
  };

  private async initializeFile(filePath: string): Promise<void> {
    await fs.writeFile(filePath, "");
    await fs.chmod(filePath, 0o666);
  }

  private async initializeWorkdir(boxId: number): Promise<void> {
    // Initialize isolate box
    const workdir = execSync(`isolate -b ${boxId} --init`).toString().trim();
    const boxdir = path.join(workdir, "box");

    // Define file paths
    const files = {
      stdin: path.join(workdir, this.STDIN_FILE),
      stdout: path.join(workdir, this.STDOUT_FILE),
      stderr: path.join(workdir, this.STDERR_FILE),
      metadata: path.join(workdir, this.METADATA_FILE),
      compile: path.join(workdir, this.COMPILE_OUTPUT_FILE),
    };

    // Initialize all files
    await Promise.all(
      Object.values(files).map((file) => this.initializeFile(file)),
    );

    this.rootDir = { workdir, boxdir, files };
  }

  private async preprocessCode(lang: string, code: string): Promise<string> {
    if (lang === "java") {
      return code.replace(/public\s+class\s+(\w+)/g, (match, className) =>
        className !== "main" ? match.replace(className, "main") : match,
      );
    }
    return code;
  }

  private parseErrorLineNumber = (
    stderr: string,
    lang: Language,
  ): number | null => {
    let regex: RegExp;

    switch (lang) {
      case "java":
        // Java stack trace looks like: "at ClassName.methodName(ClassName.java:lineNumber)"
        regex = /([^:]+):(\d+)(?::\d+)?(?:\)|:)/;
        break;
      case "js":
        // JavaScript error format: "at Object.<anonymous> (file.js:lineNumber:column)"
        regex = /at .+\((.*\.js):(\d+):\d+\)/;
        break;
      case "py":
        // Python error format: "File 'file.py', line lineNumber"
        regex = /File "([^"]+)", line (\d+)/;
        break;
      case "cpp":
        // C++ error format: "in function 'function' at file.cpp:lineNumber"
        regex = /([^:]+):(\d+):\d+:/;
        break;
      default:
        return null;
    }

    const match = stderr.match(regex);
    if (match) {
      return parseInt(match[2], 10); // The line number is captured in the second group
    }

    return null; // Return null if no line number is found
  };

  async runCode({
    lang,
    code,
    stdin = "",
    options = {},
  }: {
    lang: Language;
    code: string;
    stdin?: string;
    options?: ExecutionOptions;
  }): Promise<ExecutionResult> {
    const boxId = Math.floor(Math.random() * 1000);
    let workdir: string = "";
    if (!SUPPORTED_LANGS.includes(lang)) {
      throw new Error(`Invalid language: ${lang}`);
    }
    if (code.trim().length === 0) {
      throw new Error(`Code is required`);
    }
    try {
      await this.initializeWorkdir(boxId);

      // Write source code
      const langConfig = LANGUAGE_CONFIGS[lang];
      const sourceFile = path.join(this.rootDir.boxdir, langConfig.fileName);
      await fs.writeFile(sourceFile, await this.preprocessCode(lang, code));

      // Write stdin
      await fs.writeFile(this.rootDir.files.stdin, stdin, "utf8");
      console.warn(`
----------------------------------------
INIT NEW SANDBOX AT ${boxId} ${this.rootDir.files.stdin} ${stdin}
----------------------------------------`);
      // await new Promise((resolve) => setTimeout(resolve, 20000));
      // Compile if needed
      if (langConfig.compileCommand) {
        const compileCmd = `isolate -s -b ${boxId} -M ${this.rootDir.files.metadata} \
          -t 30 -w 60 -k 64000 \
          -p30 \
          -f 1000 \
          -E PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
        ${langConfig.opts} \
          --run \
        -- ${langConfig.compileCommand} 2> ${this.rootDir.files.compile}`;

        try {
          execSync(compileCmd);
          const compileOutput = await fs.readFile(
            this.rootDir.files.compile,
            "utf8",
          );
          if (compileOutput.length > 0) {
            return {
              verdict: "CE",
              time: 0,
              memory: 0,
              stdout: "",
              stderr: compileOutput,
              lineNumber: this.parseErrorLineNumber(compileOutput, lang),
            };
          }
        } catch (error) {
          const compileOutput = await fs.readFile(
            this.rootDir.files.compile,
            "utf8",
          );
          return {
            verdict: "CE",
            time: 0,
            memory: 0,
            stdout: "",
            stderr: compileOutput,
            lineNumber: this.parseErrorLineNumber(compileOutput, lang),
          };
        }
      }

      // Run the code
      const runCmd = `isolate -b ${boxId}  -M ${this.rootDir.files.metadata} -s \
        -t ${options.timeLimit || 1} \
        -p${options.subProcessLimit || 20} \
        -w ${(options.timeLimit || 1) + 1} \
        -m ${options.memoryLimit || 12 * 1024} \
        ${langConfig.opts} \
        --run \
        -- ${langConfig.runCommand} < ${this.rootDir.files.stdin} > ${this.rootDir.files.stdout} 2> ${this.rootDir.files.stderr}`;
      console.log("cmd: ", runCmd);
      execSync(runCmd);

      // Read results
      const metadataContent = execSync(
        `cat ${this.rootDir.files.metadata}`,
      ).toString();

      const metadata = metadataParser(metadataContent);

      const stdout = await fs.readFile(this.rootDir.files.stdout, "utf8");
      const stderr = await fs.readFile(
        this.rootDir.files.stderr ?? metadata.message,
        "utf8",
      );

      return {
        verdict: metadata.exitcode === 0 ? "OK" : metadata.status || "RE",
        time: (metadata.time || 0) * 1000,
        memory: metadata["max-rss"] || 0,
        exitCode: metadata.exitcode,
        exitSignal: metadata.exitsig,
        errorType: metadata.status,
        stdout: stdout,
        stderr: stderr,
      };
    } catch (error) {
      console.log("--------------------------------");
      // @ts-ignore
      console.log(error);
      console.log("------------------------------");

      const metadataContent = execSync(
        `cat ${this.rootDir.files.metadata}`,
      ).toString();

      const metadata = metadataParser(metadataContent);
      console.log("metadata: ", metadata);

      let stdout = await fs.readFile(this.rootDir.files.stdout, "utf8");
      let stderr = await fs.readFile(this.rootDir.files.stderr, "utf8");

      if (metadata.status === "RE") {
        stderr = stderr || metadata.message || "Runtime Error";
      } else if (metadata.status === "TO") {
        stderr = metadata.message || "Time limit exceeded";
      } else if (metadata.status === "SG") {
        stderr = "Memory limit exceeded";
      } else if (metadata.status === "XX") {
        stderr = metadata.message || "Internal Error Error";
      }

      return {
        verdict: metadata.exitcode === 0 ? "OK" : metadata.status || "RE",
        // time: 0,
        // memory: 0,
        // exitCode: 0,
        // exitSignal: 0,
        time: (metadata.time || 0) * 1000,
        memory: metadata["max-rss"] || 0,
        exitCode: metadata.exitcode || 0,
        exitSignal: metadata.exitsig || 0,
        errorType: "Runtime Error",
        stdout: stdout,
        stderr: stderr || "",
        lineNumber: this.parseErrorLineNumber(stderr, lang),
      };
    } finally {
      // Cleanup
      if (workdir) {
        try {
          execSync(`isolate -b ${boxId} --cleanup`);
        } catch (error) {
          console.error("Cleanup failed:", error);
        }
      }
    }
  }
}

export default IsolateRunner;
