export type Target = 'windows' | 'android';

export interface Project {
  id: string;
  name: string;
  appId: string;
  version: string;
  description: string;
  sourcePath: string;
  iconPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LogLine {
  t: number;
  line: string;
}

export type JobStatus = 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  projectId: string;
  projectName: string;
  target: Target;
  status: JobStatus;
  logs: LogLine[];
  createdAt: string;
  finishedAt: string | null;
  artifactId: string | null;
  error: string | null;
}

export interface Artifact {
  id: string;
  jobId: string;
  projectId: string;
  name: string;
  path: string;
  size: number;
  target: Target;
  createdAt: string;
}

export interface Environment {
  node: string;
  npm: boolean;
  java: boolean;
  javac: boolean;
  javaVersion: string | null;
  gradle: boolean;
  adb: boolean;
  androidHome: string | null;
  androidSdk: boolean;
  platform: string;
  canBuildWindows: boolean;
  canBuildAndroid: boolean;
}

export interface Health {
  ok: boolean;
  app: string;
  demoMode: boolean;
}
