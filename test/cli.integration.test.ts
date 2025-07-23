import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Integration Tests', () => {
  const tempDir = path.join(os.tmpdir(), 'pondo-test');
  const tasksFile = path.join(tempDir, 'tasks.json');
  
  beforeEach(() => {
    // Set up test environment
    process.env.HOME = tempDir;
    
    // Clean up previous test files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const runCLI = (args: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve) => {
      const child = spawn('node', ['dist/cli.js', ...args], {
        env: { ...process.env, HOME: tempDir },
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, code: code || 0 });
      });
    });
  };

  describe('init command', () => {
    it('should initialize pondo configuration', async () => {
      const result = await runCLI(['init']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Initialized pondo in');
      expect(fs.existsSync(path.join(tempDir, '.pondo'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.pondo', 'tasks.json'))).toBe(true);
    });

    it('should not reinitialize if already exists', async () => {
      await runCLI(['init']);
      const result = await runCLI(['init']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('already initialized');
    });
  });

  describe('add command', () => {
    beforeEach(async () => {
      await runCLI(['init']);
    });

    it('should add a new task', async () => {
      const result = await runCLI(['add', 'Test task']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Added task: Test task');
      expect(result.stdout).toMatch(/ID: T[A-Z0-9]{3}/);
      
      // Verify task was saved
      const tasks = JSON.parse(fs.readFileSync(path.join(tempDir, '.pondo', 'tasks.json'), 'utf8'));
      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe('Test task');
    });
  });

  describe('list command', () => {
    beforeEach(async () => {
      await runCLI(['init']);
      await runCLI(['add', 'Task 1']);
      await runCLI(['add', 'Task 2']);
    });

    it('should list all tasks', async () => {
      const result = await runCLI(['list']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('📋 Tasks:');
      expect(result.stdout).toContain('Task 1');
      expect(result.stdout).toContain('Task 2');
      expect(result.stdout).toContain('⏳'); // pending tasks
    });

    it('should work with alias ls', async () => {
      const result = await runCLI(['ls']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('📋 Tasks:');
    });
  });

  describe('done command', () => {
    let taskId: string;

    beforeEach(async () => {
      await runCLI(['init']);
      const addResult = await runCLI(['add', 'Complete me']);
      const match = addResult.stdout.match(/ID: (T[A-Z0-9]{3})/);
      taskId = match ? match[1] : '';
    });

    it('should mark task as done', async () => {
      const result = await runCLI(['done', taskId]);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Marked task as done: Complete me');
      
      // Verify task status changed
      const tasks = JSON.parse(fs.readFileSync(path.join(tempDir, '.pondo', 'tasks.json'), 'utf8'));
      const task = tasks.find((t: any) => t.id === taskId);
      expect(task.done).toBe(true);
      expect(task.completedAt).toBeDefined();
    });
  });

  describe('help and version', () => {
    it('should show help', async () => {
      const result = await runCLI(['--help']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('DuckDB-powered task management CLI');
      expect(result.stdout).toContain('Commands:');
    });

    it('should show version', async () => {
      const result = await runCLI(['--version']);
      
      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe('0.0.2');
    });
  });
});