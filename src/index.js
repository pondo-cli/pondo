const fs = require('fs');
const path = require('path');
const os = require('os');
const { Command } = require('commander');

class PonDo {
  constructor() {
    this.configDir = path.join(os.homedir(), '.pondo');
    this.tasksFile = path.join(this.configDir, 'tasks.json');
  }

  run() {
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
      .action((task) => {
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
      .action((id) => {
        this.done(id);
      });

    program.parse();
  }

  init() {
    try {
      const configExists = fs.existsSync(this.configDir);
      const tasksExists = fs.existsSync(this.tasksFile);
      
      if (configExists && tasksExists) {
        console.log(`⚠️  pondo is already initialized in ${this.configDir}`);
        return;
      }
      
      if (!configExists) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      
      if (!tasksExists) {
        fs.writeFileSync(this.tasksFile, JSON.stringify([], null, 2));
      }
      
      console.log(`✅ Initialized pondo in ${this.configDir}`);
    } catch (error) {
      console.error(`❌ Failed to initialize: ${error.message}`);
      process.exit(1);
    }
  }

  add(taskName) {
    if (!taskName.trim()) {
      console.error('❌ Task name is required');
      return;
    }

    try {
      const tasks = this.loadTasks();
      const newTask = {
        id: this.generateId(),
        name: taskName.trim(),
        done: false,
        createdAt: new Date().toISOString()
      };
      
      tasks.push(newTask);
      this.saveTasks(tasks);
      
      console.log(`✅ Added task: ${newTask.name} (ID: ${newTask.id})`);
    } catch (error) {
      console.error(`❌ Failed to add task: ${error.message}`);
    }
  }

  list() {
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
      console.error(`❌ Failed to list tasks: ${error.message}`);
    }
  }

  done(taskId) {
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
      console.error(`❌ Failed to mark task as done: ${error.message}`);
    }
  }



  loadTasks() {
    if (!fs.existsSync(this.tasksFile)) {
      throw new Error('Tasks file not found. Run "pondo init" first.');
    }
    
    const data = fs.readFileSync(this.tasksFile, 'utf8');
    return JSON.parse(data);
  }

  saveTasks(tasks) {
    fs.writeFileSync(this.tasksFile, JSON.stringify(tasks, null, 2));
  }

  generateId() {
    return 'T' + Math.random().toString(36).substr(2, 3).toUpperCase();
  }
}

module.exports = { PonDo };