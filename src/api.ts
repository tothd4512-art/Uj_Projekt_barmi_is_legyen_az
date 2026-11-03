import { invoke, isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { Artifact, Environment, Health, Job, Project, Target } from './types';

export const isDesktop = isTauri();

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  health: () => (isDesktop ? invoke<Health>('health') : req<Health>('/api/health')),
  environment: () => (isDesktop ? invoke<Environment>('environment') : req<Environment>('/api/environment')),
  projects: () => (isDesktop ? invoke<Project[]>('list_projects') : req<Project[]>('/api/projects')),
  createSample: () =>
    isDesktop
      ? invoke<Project>('create_sample_project')
      : req<Project>('/api/projects/sample', { method: 'POST' }),
  importZipDialog: async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Web projekt ZIP', extensions: ['zip'] }],
    });
    if (!selected) return null;
    return invoke<Project>('import_project_zip', { path: selected });
  },
  importZip: (file: File, name: string) => {
    const form = new FormData();
    form.append('zip', file);
    form.append('name', name);
    return req<Project>('/api/projects/import', { method: 'POST', body: form });
  },
  updateProject: (id: string, patch: Partial<Project>) =>
    isDesktop
      ? invoke<Project>('update_project', { id, patch })
      : req<Project>(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }),
  deleteProject: (id: string) =>
    isDesktop ? invoke<{ ok: boolean }>('delete_project', { id }) : req<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
  jobs: () => (isDesktop ? invoke<Job[]>('list_jobs') : req<Job[]>('/api/jobs')),
  job: (id: string) => (isDesktop ? invoke<Job>('get_job', { id }) : req<Job>(`/api/jobs/${id}`)),
  build: (projectId: string, target: Target) =>
    isDesktop
      ? invoke<Job>('start_build', { projectId, target })
      : req<Job>(`/api/projects/${projectId}/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target }),
        }),
  cancel: (jobId: string) =>
    isDesktop ? invoke<{ ok: boolean }>('cancel_build', { jobId }) : req<{ ok: boolean }>(`/api/jobs/${jobId}/cancel`, { method: 'POST' }),
  artifacts: () => (isDesktop ? invoke<Artifact[]>('list_artifacts') : req<Artifact[]>('/api/artifacts')),
  downloadArtifact: async (artifact: Artifact) => {
    if (isDesktop) {
      const extension = artifact.name.split('.').pop() || 'bin';
      const destination = await save({
        defaultPath: artifact.name,
        filters: [{ name: 'Elkészült fájl', extensions: [extension] }],
      });
      if (!destination) return false;
      await invoke('copy_artifact', { id: artifact.id, destination });
      return true;
    }
    const link = document.createElement('a');
    link.href = `/api/artifacts/${artifact.id}/download`;
    link.download = artifact.name;
    link.click();
    return true;
  },
};
