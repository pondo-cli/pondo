export interface Task {
  id: string;
  name: string;
  done: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Config {
  configDir: string;
  tasksFile: string;
}