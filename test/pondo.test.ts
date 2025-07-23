import * as fs from 'fs';
import * as path from 'os';
import { PonDo } from '../src/index';
import { Task } from '../src/types';

// Mock fs module
jest.mock('fs');
jest.mock('os');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = path as jest.Mocked<typeof path>;

describe('PonDo', () => {
  let pondo: PonDo;
  const mockHomeDir = '/mock/home';
  const mockConfigDir = '/mock/home/.pondo';
  const mockTasksFile = '/mock/home/.pondo/tasks.json';

  beforeEach(() => {
    jest.clearAllMocks();
    mockOs.homedir.mockReturnValue(mockHomeDir);
    pondo = new PonDo();
    
    // Mock console methods to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('init', () => {
    it('should create config directory and tasks file if they do not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation();
      mockFs.writeFileSync.mockImplementation();

      pondo['init']();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(mockConfigDir, { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(mockTasksFile, JSON.stringify([], null, 2));
      expect(console.log).toHaveBeenCalledWith(`✅ Initialized pondo in ${mockConfigDir}`);
    });

    it('should not recreate if already initialized', () => {
      mockFs.existsSync.mockReturnValue(true);

      pondo['init']();

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(`⚠️  pondo is already initialized in ${mockConfigDir}`);
    });

    it('should handle initialization errors', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      pondo['init']();

      expect(console.error).toHaveBeenCalledWith('❌ Failed to initialize: Permission denied');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('add', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([]));
      mockFs.writeFileSync.mockImplementation();
    });

    it('should add a new task', () => {
      const taskName = 'Test task';
      
      pondo['add'](taskName);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writeCall = mockFs.writeFileSync.mock.calls[0];
      const savedTasks = JSON.parse(writeCall[1] as string) as Task[];
      
      expect(savedTasks).toHaveLength(1);
      expect(savedTasks[0].name).toBe(taskName);
      expect(savedTasks[0].done).toBe(false);
      expect(savedTasks[0].id).toMatch(/^T[A-Z0-9]{3}$/);
      expect(savedTasks[0].createdAt).toBeDefined();
    });

    it('should not add empty task name', () => {
      pondo['add']('   ');

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('❌ Task name is required');
    });

    it('should handle file read errors', () => {
      mockFs.existsSync.mockReturnValue(false);

      pondo['add']('Test task');

      expect(console.error).toHaveBeenCalledWith('❌ Failed to add task: Tasks file not found. Run "pondo init" first.');
    });
  });

  describe('list', () => {
    it('should display tasks', () => {
      const mockTasks: Task[] = [
        { id: 'T001', name: 'Task 1', done: false, createdAt: '2025-07-24T00:00:00Z' },
        { id: 'T002', name: 'Task 2', done: true, createdAt: '2025-07-24T01:00:00Z', completedAt: '2025-07-24T02:00:00Z' }
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockTasks));

      pondo['list']();

      expect(console.log).toHaveBeenCalledWith('\n📋 Tasks:');
      expect(console.log).toHaveBeenCalledWith('  ⏳ [T001] Task 1');
      expect(console.log).toHaveBeenCalledWith('  ✅ [T002] Task 2');
    });

    it('should handle empty task list', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([]));

      pondo['list']();

      expect(console.log).toHaveBeenCalledWith('📝 No tasks found. Use "pondo add <task>" to create one.');
    });
  });

  describe('done', () => {
    const mockTasks: Task[] = [
      { id: 'T001', name: 'Task 1', done: false, createdAt: '2025-07-24T00:00:00Z' }
    ];

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockTasks));
      mockFs.writeFileSync.mockImplementation();
    });

    it('should mark task as done', () => {
      pondo['done']('T001');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writeCall = mockFs.writeFileSync.mock.calls[0];
      const savedTasks = JSON.parse(writeCall[1] as string) as Task[];
      
      expect(savedTasks[0].done).toBe(true);
      expect(savedTasks[0].completedAt).toBeDefined();
      expect(console.log).toHaveBeenCalledWith('✅ Marked task as done: Task 1');
    });

    it('should handle non-existent task ID', () => {
      pondo['done']('T999');

      expect(console.error).toHaveBeenCalledWith('❌ Task with ID "T999" not found');
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle empty task ID', () => {
      pondo['done']('');

      expect(console.error).toHaveBeenCalledWith('❌ Task ID is required');
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = pondo['generateId']();
      const id2 = pondo['generateId']();

      expect(id1).toMatch(/^T[A-Z0-9]{3}$/);
      expect(id2).toMatch(/^T[A-Z0-9]{3}$/);
      expect(id1).not.toBe(id2);
    });
  });
});