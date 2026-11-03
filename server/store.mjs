import fs from 'node:fs/promises';
import path from 'node:path';

export class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'buildmuhely.json');
    this.state = { projects: [], jobs: [], artifacts: [] };
    this.saveQueue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'projects'), { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'builds'), { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'artifacts'), { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'uploads'), { recursive: true });
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.state = {
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
        artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
      };
    } catch {
      await this.save();
    }
  }

  save() {
    this.saveQueue = this.saveQueue.then(async () => {
      const tmp = this.file + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(this.state, null, 2), 'utf8');
      await fs.rename(tmp, this.file);
    }).catch(() => {});
    return this.saveQueue;
  }

  get projects() { return this.state.projects; }
  get jobs() { return this.state.jobs; }
  get artifacts() { return this.state.artifacts; }

  async addProject(project) {
    this.state.projects.push(project);
    await this.save();
    return project;
  }

  async updateProject(id, patch) {
    const p = this.state.projects.find(x => x.id === id);
    if (!p) return null;
    Object.assign(p, patch, { updatedAt: new Date().toISOString() });
    await this.save();
    return p;
  }

  async deleteProject(id) {
    this.state.projects = this.state.projects.filter(x => x.id !== id);
    await this.save();
  }

  async addJob(job) {
    this.state.jobs.unshift(job);
    await this.save();
    return job;
  }

  async updateJob(id, patch) {
    const j = this.state.jobs.find(x => x.id === id);
    if (!j) return null;
    Object.assign(j, patch);
    await this.save();
    return j;
  }

  async appendLog(id, line) {
    const j = this.state.jobs.find(x => x.id === id);
    if (!j) return;
    j.logs.push({ t: Date.now(), line });
    if (j.logs.length > 3000) j.logs.splice(0, j.logs.length - 3000);
    await this.save();
  }

  async addArtifact(artifact) {
    this.state.artifacts.push(artifact);
    await this.save();
    return artifact;
  }
}
