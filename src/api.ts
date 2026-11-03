import type { Artifact, Environment, Health, Job, Project, Target } from './types';

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  health: () => req<Health>('/api/health'),
  environment: () => req<Environment>('/api/environment'),
  projects: () => req<Project[]>('/api/projects'),
  createSample: () => req<Project>('/api/projects/sample', { method: 'POST' }),
  importZip: (file: File, name: string) => {
    const form = new FormData();
    form.append('zip', file);
    form.append('name', name);
    return req<Project>('/api/projects/import', { method: 'POST', body: form });
  },
  updateProject: (id: string, patch: Partial<Project>) =>
    req<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  deleteProject: (id: string) => req<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
  jobs: () => req<Job[]>('/api/jobs'),
  job: (id: string) => req<Job>(`/api/jobs/${id}`),
  build: (projectId: string, target: Target) =>
    req<Job>(`/api/projects/${projectId}/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    }),
  cancel: (jobId: string) => req<{ ok: boolean }>(`/api/jobs/${jobId}/cancel`, { method: 'POST' }),
  artifacts: () => req<Artifact[]>('/api/artifacts'),
};
