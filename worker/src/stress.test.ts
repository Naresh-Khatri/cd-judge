import { describe, it, expect } from 'vitest';
import IsolateRunner from './utils/isolate-runner';

const runner = new IsolateRunner();

describe('Resource Limits Stress Tests', () => {
  // Reference to IsolateRunner implementation
  // startLine: 116
  // endLine: 279

  it('should handle multiple concurrent executions', async () => {
    const concurrentTests = 10;
    const code = 'print("Hello, World!")';
    
    const promises = Array(concurrentTests).fill(null).map(() =>
      runner.runCode({
        code,
        lang: 'py'
      })
    );
    
    const results = await Promise.all(promises);
    results.forEach(result => {
      expect(result.verdict).toBe('OK');
    });
  });

  it('should handle CPU-intensive code', async () => {
    const code = `
    def fibonacci(n):
        if n <= 1:
            return n
        return fibonacci(n-1) + fibonacci(n-2)
    
    print(fibonacci(35))
    `;
    
    const result = await runner.runCode({
      code,
      lang: 'py',
      options: {
        timeLimit: 2,
        memoryLimit: 128 * 1024
      }
    });
    
    expect(result.verdict).toBe('TO');
  });

  it('should handle memory-intensive code', async () => {
    const code = `
    data = [0] * (1024 * 1024 * 100)  # Attempt to allocate ~800MB
    print(len(data))
    `;
    
    const result = await runner.runCode({
      code,
      lang: 'py',
      options: {
        timeLimit: 1,
        memoryLimit: 64 * 1024
      }
    });
    
    expect(result.verdict).toBe('SG');
  });

  it('should handle fork bombs', async () => {
    const code = `
    import os
    while True:
        os.fork()
    `;
    
    const result = await runner.runCode({
      code,
      lang: 'py',
      options: {
        timeLimit: 1,
        memoryLimit: 64 * 1024,
        subProcessLimit: 5
      }
    });
    
    expect(['SG', 'RE']).toContain(result.verdict);
  });

  it('should handle infinite loops', async () => {
    const code = 'while True: pass';
    
    const result = await runner.runCode({
      code,
      lang: 'py',
      options: {
        timeLimit: 1
      }
    });
    
    expect(result.verdict).toBe('TO');
  });
});