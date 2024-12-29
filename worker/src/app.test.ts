import { describe, it, expect } from "vitest";
import IsolateRunner from "./utils/isolate-runner";

const runner = new IsolateRunner();

describe("IsolateRunner Code Execution", () => {
  it("should execute Python code successfully", async () => {
    const result = await runner.runCode({
      code: 'print("Hello from Python!")',
      lang: "py",
    });
    expect(result.verdict).toBe("OK");
    expect(result.stdout).toContain("Hello from Python!");
  });

  it("should execute JavaScript code successfully", async () => {
    const result = await runner.runCode({
      code: 'console.log("Hello from Node.js!")',
      lang: "js",
    });
    console.log(result);
    expect(result.verdict).toBe("OK");
    expect(result.stdout).toContain("Hello from Node.js!");
  });

  it("should execute Java code successfully", async () => {
    const result = await runner.runCode({
      code: 'public class Main { public static void main(String[] args) { System.out.println("Hello from Java!"); }}',
      lang: "java",
      options: {
        // idk why this take so much memory
        memoryLimit: 10 * 1024 * 1024,
      },
    });
    console.log(result);
    expect(result.verdict).toBe("OK");
    expect(result.stdout).toContain("Hello from Java!");
  });

  it("should execute C++ code successfully", async () => {
    const result = await runner.runCode({
      code: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello World";\n    return 0;\n}',
      lang: "cpp",
    });
    expect(result.verdict).toBe("OK");
    expect(result.stdout).toContain("Hello World");
  });

  it("should handle invalid language", async () => {
    await expect(
      runner.runCode({
        code: 'print("Hello from Python!")',
        // @ts-ignore
        lang: "invalid_lang",
      }),
    ).rejects.toThrow("Invalid language");
  });

  it("should handle missing code", async () => {
    await expect(
      runner.runCode({
        code: "",
        lang: "py",
      }),
    ).rejects.toThrow("Code is required");
  });

  it("should handle syntax errors in Python", async () => {
    const result = await runner.runCode({
      code: 'print("Hello from Python!"', // Missing closing parenthesis
      lang: "py",
    });
    console.log(result);
    expect(result.verdict).toBe("RE");
    expect(result.stderr).toContain("SyntaxError");
  });

  it("should handle memory limit exceeded", async () => {
    const result = await runner.runCode({
      code: `try:\n    memory_hog = [0.0] * int(1e9 / 8)\n 
except MemoryError:\n    pass`,
      lang: "py",
      options: { memoryLimit: 1024 },
    });
    console.log(result);
    expect(result.verdict).toBe("SG");
    expect(result.stderr).toContain("Memory limit exceeded");
  });
  it("should handle long-running code", async () => {
    const result = await runner.runCode({
      code: "while True: pass", // Infinite loop
      lang: "py",
      options: { timeLimit: 1 }, // Set a time limit
    });
    expect(result.verdict).toBe("TO");
    expect(result.stderr).toContain("Time limit exceeded");
  });

  it("should handle memory limit exceeded", async () => {
    const result = await runner.runCode({
      code: "a = [1] * (10**8)", // Create a large list
      lang: "py",
      options: { memoryLimit: 1 }, // Set a low memory limit
    });
    expect(result.verdict).toBe("SG");
    expect(result.stderr).toContain("Memory limit exceeded");
  });
});
