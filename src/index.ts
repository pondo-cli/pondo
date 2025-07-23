import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';
import { Task, Config } from './types';

export class PonDo {
  private config: Config;

  constructor() {
    this.config = {
      configDir: path.join(os.homedir(), '.pondo'),
      tasksFile: path.join(os.homedir(), '.pondo', 'tasks.json')
    };
  }

  run(): void {
    const program = new Command();
    const packageJson = require('../package.json');

    program
      .name('pondo')
      .description('🦆 DuckDB-powered task management CLI for developers')
      .version(packageJson.version, '-v, --version', 'Show version number');

    program
      .command('init')
      .description('Initialize pondo in ~/.pondo')
      .action(() => {
        this.init();
      });

    program
      .command('add <task>')
      .description('Add a new task')
      .action((task: string) => {
        this.add(task);
      });

    program
      .command('list')
      .alias('ls')
      .description('List all tasks')
      .action(() => {
        this.list();
      });

    program
      .command('done <id>')
      .description('Mark task as done')
      .action((id: string) => {
        this.done(id);
      });

    program.parse();
  }

  private init(): void {
    try {
      const configExists = fs.existsSync(this.config.configDir);
      const tasksExists = fs.existsSync(this.config.tasksFile);
      
      if (configExists && tasksExists) {
        console.log(`⚠️  pondo is already initialized in ${this.config.configDir}`);
        return;
      }
      
      if (!configExists) {
        fs.mkdirSync(this.config.configDir, { recursive: true });
      }
      
      if (!tasksExists) {
        fs.writeFileSync(this.config.tasksFile, JSON.stringify([], null, 2));
      }
      
      console.log(`✅ Initialized pondo in ${this.config.configDir}`);
    } catch (error) {
      console.error(`❌ Failed to initialize: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  private add(taskName: string): void {
    if (!taskName.trim()) {
      console.error('❌ Task name is required');
      return;
    }

    try {
      const tasks = this.loadTasks();
      const newTask: Task = {
        id: this.generateId(),
        name: taskName.trim(),
        done: false,
        createdAt: new Date().toISOString()
      };
      
      tasks.push(newTask);
      this.saveTasks(tasks);
      
      console.log(`✅ Added task: ${newTask.name} (ID: ${newTask.id})`);
    } catch (error) {
      console.error(`❌ Failed to add task: ${(error as Error).message}`);
    }
  }

  private list(): void {
    try {
      const tasks = this.loadTasks();
      
      if (tasks.length === 0) {
        console.log('📝 No tasks found. Use "pondo add <task>" to create one.');
        return;
      }

      console.log('\n📋 Tasks:');
      tasks.forEach(task => {
        const status = task.done ? '✅' : '⏳';
        console.log(`  ${status} [${task.id}] ${task.name}`);
      });
      console.log();
    } catch (error) {
      console.error(`❌ Failed to list tasks: ${(error as Error).message}`);
    }
  }

  private done(taskId: string): void {
    if (!taskId) {
      console.error('❌ Task ID is required');
      return;
    }

    try {
      const tasks = this.loadTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        console.error(`❌ Task with ID "${taskId}" not found`);
        return;
      }
      
      task.done = true;
      task.completedAt = new Date().toISOString();
      
      this.saveTasks(tasks);
      console.log(`✅ Marked task as done: ${task.name}`);
    } catch (error) {
      console.error(`❌ Failed to mark task as done: ${(error as Error).message}`);
    }
  }

  private loadTasks(): Task[] {
    if (!fs.existsSync(this.config.tasksFile)) {
      throw new Error('Tasks file not found. Run "pondo init" first.');
    }
    
    const data = fs.readFileSync(this.config.tasksFile, 'utf8');
    return JSON.parse(data) as Task[];
  }

  private saveTasks(tasks: Task[]): void {
    fs.writeFileSync(this.config.tasksFile, JSON.stringify(tasks, null, 2));
  }

  private generateId(): string {
    return 'T' + Math.random().toString(36).substr(2, 3).toUpperCase();
  }
}