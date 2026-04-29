import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  archiveProject,
  createProject,
  listProjects,
  updateProject
} from "../api/client";
import type { Project, ProjectCreateRequest, ProjectUpdateRequest } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox, TextAreaField, TextField } from "../components/FormFields";
import { Metric, Panel } from "../components/Panel";
import { isAbortError, toErrorMessage, type LoadStatus } from "../lib/errors";

type ProjectFormState = {
  name: string;
  description: string;
  color: string;
  sort_order: string;
};

type ProjectFormErrors = Partial<Record<keyof ProjectFormState, string>>;

function emptyForm(): ProjectFormState {
  return {
    name: "",
    description: "",
    color: "",
    sort_order: "0"
  };
}

function formFromProject(project: Project): ProjectFormState {
  return {
    name: project.name,
    description: project.description ?? "",
    color: project.color ?? "",
    sort_order: String(project.sort_order)
  };
}

function validateForm(form: ProjectFormState): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  const sortOrder = Number(form.sort_order);

  if (!form.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    errors.sort_order = "Sort order must be a non-negative integer.";
  }

  return errors;
}

function buildPayload(form: ProjectFormState): ProjectCreateRequest | ProjectUpdateRequest {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    color: form.color.trim() || null,
    sort_order: Number(form.sort_order)
  };
}

function chooseSelectedProjectId(projects: Project[], preferredProjectId?: string | null): string | null {
  if (preferredProjectId && projects.some((project) => project.id === preferredProjectId)) {
    return preferredProjectId;
  }

  return projects[0]?.id ?? null;
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormState>(() => emptyForm());
  const [formErrors, setFormErrors] = useState<ProjectFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const loadProjectList = useCallback(async (preferredProjectId?: string | null, signal?: AbortSignal) => {
    setLoadStatus("loading");
    setLoadError(null);

    try {
      const loadedProjects = await listProjects({ signal });
      const nextSelectedProjectId = chooseSelectedProjectId(loadedProjects, preferredProjectId);
      const nextSelectedProject =
        loadedProjects.find((project) => project.id === nextSelectedProjectId) ?? null;

      setProjects(loadedProjects);
      setSelectedProjectId(nextSelectedProjectId);
      setForm(nextSelectedProject ? formFromProject(nextSelectedProject) : emptyForm());
      setFormErrors({});
      setLoadStatus("success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setLoadStatus("error");
      setLoadError(toErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadProjectList(null, controller.signal);

    return () => controller.abort();
  }, [loadProjectList]);

  function selectProject(project: Project) {
    setSelectedProjectId(project.id);
    setForm(formFromProject(project));
    setFormErrors({});
    setActionError(null);
    setActionMessage(null);
  }

  function startNewProject() {
    setSelectedProjectId(null);
    setForm(emptyForm());
    setFormErrors({});
    setActionError(null);
    setActionMessage(null);
  }

  function updateFormField<K extends keyof ProjectFormState>(field: K, value: ProjectFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
    setFormErrors((current) => ({
      ...current,
      [field]: undefined
    }));
    setActionMessage(null);
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);

    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);
      const savedProject = selectedProject
        ? await updateProject(selectedProject.id, payload)
        : await createProject(payload as ProjectCreateRequest);

      setActionMessage(selectedProject ? "Project updated." : "Project created.");
      await loadProjectList(savedProject.id);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelectedProject() {
    if (!selectedProject) {
      return;
    }

    setArchiving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await archiveProject(selectedProject.id);
      setActionMessage("Project archived.");
      await loadProjectList(null);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <Panel title="Projects">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void loadProjectList(selectedProjectId)}
              disabled={loadStatus === "loading"}
            >
              {loadStatus === "loading" ? "Loading..." : "Refresh"}
            </button>
            <button
              type="button"
              className="rounded-lg bg-pine px-3 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
              onClick={startNewProject}
            >
              New
            </button>
          </div>

          {loadStatus === "error" && loadError ? <ErrorBox message={loadError} /> : null}

          {loadStatus === "success" && projects.length === 0 ? (
            <EmptyState title="No active projects yet." detail="Create a project to organize conversations and knowledge." />
          ) : null}

          <div className="space-y-3">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={[
                  "w-full rounded-lg border bg-white p-3 text-left transition",
                  project.id === selectedProjectId ? "border-pine shadow-sm" : "border-stone-200"
                ].join(" ")}
                onClick={() => selectProject(project)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{project.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-stone-600">
                      {project.description || "No description"}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                    {project.sort_order}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={selectedProject ? "Edit Project" : "New Project"}>
          <form className="space-y-4" onSubmit={saveProject}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
              <TextField
                id="project-name"
                label="Name"
                value={form.name}
                error={formErrors.name}
                required
                onChange={(value) => updateFormField("name", value)}
              />
              <TextField
                id="project-sort-order"
                label="Sort order"
                value={form.sort_order}
                error={formErrors.sort_order}
                inputMode="numeric"
                required
                onChange={(value) => updateFormField("sort_order", value)}
              />
            </div>

            <TextAreaField
              id="project-description"
              label="Description"
              value={form.description}
              onChange={(value) => updateFormField("description", value)}
            />

            <TextField
              id="project-color"
              label="Color"
              value={form.color}
              placeholder="Optional token or hex"
              onChange={(value) => updateFormField("color", value)}
            />

            {actionError ? <ErrorBox message={actionError} /> : null}
            {actionMessage ? (
              <div className="rounded-lg border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
                {actionMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : selectedProject ? "Save Project" : "Create Project"}
              </button>

              {selectedProject ? (
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={archiving}
                >
                  {archiving ? "Archiving..." : "Archive Project"}
                </button>
              ) : null}
            </div>
          </form>
        </Panel>
      </div>

      <Panel title="Overview">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Active projects" value={String(projects.length)} />
          <Metric label="Selected project" value={selectedProject?.name ?? "None"} />
          <Metric label="Status" value={loadStatus === "loading" ? "Loading" : "Ready"} />
        </div>
      </Panel>

      <ConfirmDialog
        open={showArchiveConfirm}
        title="Archive Project"
        message={`Archive "${selectedProject?.name ?? "this project"}"? It will be hidden from active lists but not permanently deleted.`}
        confirmLabel="Archive Project"
        onConfirm={() => {
          setShowArchiveConfirm(false);
          void archiveSelectedProject();
        }}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </div>
  );
}
