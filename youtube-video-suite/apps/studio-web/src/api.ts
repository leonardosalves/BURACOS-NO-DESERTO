const API_BASE = "/v1";

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function fetchProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

export async function createProject(data: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function generateProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}/generate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start generation");
  return res.json();
}

export async function fetchScenes(projectId: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/scenes`);
  if (!res.ok) throw new Error("Failed to fetch scenes");
  return res.json();
}

export async function renderScene(sceneId: string) {
  const res = await fetch(`${API_BASE}/scenes/${sceneId}/render`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to queue render");
  return res.json();
}

export async function approveScene(sceneId: string, gate: string) {
  const res = await fetch(`${API_BASE}/scenes/${sceneId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gate }),
  });
  if (!res.ok) throw new Error("Failed to approve scene");
  return res.json();
}

export async function updateScene(
  sceneId: string,
  data: Record<string, unknown>
) {
  const res = await fetch(`${API_BASE}/scenes/${sceneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update scene");
  return res.json();
}

export async function fetchEngineHealth() {
  const res = await fetch(`${API_BASE}/engines/health`);
  if (!res.ok) throw new Error("Failed to fetch health");
  return res.json();
}
