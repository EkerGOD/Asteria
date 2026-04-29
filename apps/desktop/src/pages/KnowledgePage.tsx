import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  archiveKnowledgeUnit,
  attachKnowledgeTag,
  createKnowledgeUnit,
  createTag,
  detachKnowledgeTag,
  listKnowledgeUnits,
  listProjects,
  listTags,
  refreshKnowledgeEmbeddings,
  updateKnowledgeUnit
} from "../api/client";
import type {
  KnowledgeEmbeddingRefreshResponse,
  KnowledgeUnit,
  KnowledgeUnitCreateRequest,
  KnowledgeUnitUpdateRequest,
  Project,
  Tag
} from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox, SelectField, TextAreaField, TextField } from "../components/FormFields";
import { inputClassName } from "../lib/style";
import { Metric, Panel } from "../components/Panel";
import { isAbortError, toErrorMessage, type LoadStatus } from "../lib/errors";

type KnowledgeFormState = {
  title: string;
  content: string;
};

type KnowledgeFormErrors = Partial<Record<keyof KnowledgeFormState, string>>;

type KnowledgeContextState = {
  project_id: string;
  source_uri: string;
};

function emptyForm(): KnowledgeFormState {
  return {
    title: "",
    content: ""
  };
}

function emptyContext(): KnowledgeContextState {
  return {
    project_id: "",
    source_uri: ""
  };
}

function formFromKnowledge(knowledge: KnowledgeUnit): KnowledgeFormState {
  return {
    title: knowledge.title,
    content: knowledge.content
  };
}

function contextFromKnowledge(knowledge: KnowledgeUnit): KnowledgeContextState {
  return {
    project_id: knowledge.project_id ?? "",
    source_uri: knowledge.source_uri ?? ""
  };
}

function validateKnowledgeForm(form: KnowledgeFormState): KnowledgeFormErrors {
  const errors: KnowledgeFormErrors = {};

  if (!form.title.trim()) {
    errors.title = "Title is required.";
  }

  if (!form.content.trim()) {
    errors.content = "Content is required.";
  }

  return errors;
}

function buildKnowledgePayload(form: KnowledgeFormState, context: KnowledgeContextState): KnowledgeUnitCreateRequest | KnowledgeUnitUpdateRequest {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    project_id: context.project_id || null,
    source_uri: context.source_uri.trim() || null
  };
}

function chooseSelectedKnowledgeId(
  knowledgeUnits: KnowledgeUnit[],
  preferredKnowledgeId?: string | null
): string | null {
  if (preferredKnowledgeId === null) {
    return null;
  }

  if (preferredKnowledgeId !== undefined && knowledgeUnits.some((knowledge) => knowledge.id === preferredKnowledgeId)) {
    return preferredKnowledgeId;
  }

  return knowledgeUnits[0]?.id ?? null;
}

function projectName(projects: Project[], projectId: string | null): string {
  if (!projectId) {
    return "No project";
  }

  return projects.find((project) => project.id === projectId)?.name ?? "Unknown project";
}

export function KnowledgePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [knowledgeUnits, setKnowledgeUnits] = useState<KnowledgeUnit[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectFilterId, setProjectFilterId] = useState("");
  const [tagFilterSlug, setTagFilterSlug] = useState("");
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null);
  const [form, setForm] = useState<KnowledgeFormState>(() => emptyForm());
  const [context, setContext] = useState<KnowledgeContextState>(() => emptyContext());
  const [formErrors, setFormErrors] = useState<KnowledgeFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [refreshingEmbeddings, setRefreshingEmbeddings] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [embeddingSummary, setEmbeddingSummary] = useState<KnowledgeEmbeddingRefreshResponse | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("");
  const [tagToAttach, setTagToAttach] = useState("");
  const [tagActionBusy, setTagActionBusy] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const selectedKnowledge = useMemo(
    () => knowledgeUnits.find((knowledge) => knowledge.id === selectedKnowledgeId) ?? null,
    [knowledgeUnits, selectedKnowledgeId]
  );

  const hasActiveFilter = projectFilterId !== "" || tagFilterSlug !== "";

  const availableTags = useMemo(() => {
    const attachedTagIds = new Set(selectedKnowledge?.tags.map((tag) => tag.id) ?? []);
    return tags.filter((tag) => !attachedTagIds.has(tag.id));
  }, [selectedKnowledge, tags]);

  const loadWorkspace = useCallback(
    async (preferredKnowledgeId?: string | null, signal?: AbortSignal) => {
      setLoadStatus("loading");
      setLoadError(null);

      try {
        const [loadedProjects, loadedTags, loadedKnowledge] = await Promise.all([
          listProjects({ signal }),
          listTags({ signal }),
          listKnowledgeUnits(
            {
              project_id: projectFilterId || null,
              tag_slugs: tagFilterSlug ? [tagFilterSlug] : []
            },
            { signal }
          )
        ]);
        const nextSelectedKnowledgeId = chooseSelectedKnowledgeId(loadedKnowledge, preferredKnowledgeId);
        const nextSelectedKnowledge =
          loadedKnowledge.find((knowledge) => knowledge.id === nextSelectedKnowledgeId) ?? null;

        setProjects(loadedProjects);
        setTags(loadedTags);
        setKnowledgeUnits(loadedKnowledge);
        setSelectedKnowledgeId(nextSelectedKnowledgeId);
        setForm(nextSelectedKnowledge ? formFromKnowledge(nextSelectedKnowledge) : emptyForm());
        setContext(nextSelectedKnowledge ? contextFromKnowledge(nextSelectedKnowledge) : emptyContext());
        setTagToAttach("");
        setFormErrors({});
        setLoadStatus("success");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        setLoadStatus("error");
        setLoadError(toErrorMessage(error));
      }
    },
    [projectFilterId, tagFilterSlug]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadWorkspace(undefined, controller.signal);

    return () => controller.abort();
  }, [loadWorkspace]);

  function selectKnowledge(knowledge: KnowledgeUnit) {
    setSelectedKnowledgeId(knowledge.id);
    setForm(formFromKnowledge(knowledge));
    setContext(contextFromKnowledge(knowledge));
    setTagToAttach("");
    setFormErrors({});
    setActionError(null);
    setActionMessage(null);
    setEmbeddingSummary(null);
  }

  function startNewKnowledge() {
    setSelectedKnowledgeId(null);
    setForm(emptyForm());
    setContext(emptyContext());
    setTagToAttach("");
    setFormErrors({});
    setActionError(null);
    setActionMessage(null);
    setEmbeddingSummary(null);
  }

  function updateFormField<K extends keyof KnowledgeFormState>(field: K, value: KnowledgeFormState[K]) {
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

  function updateContextField<K extends keyof KnowledgeContextState>(field: K, value: KnowledgeContextState[K]) {
    setContext((current) => ({
      ...current,
      [field]: value
    }));
    setActionMessage(null);
  }

  async function saveKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    setEmbeddingSummary(null);

    const errors = validateKnowledgeForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = buildKnowledgePayload(form, context);
      const savedKnowledge = selectedKnowledge
        ? await updateKnowledgeUnit(selectedKnowledge.id, payload)
        : await createKnowledgeUnit(payload as KnowledgeUnitCreateRequest);

      setActionMessage(selectedKnowledge ? "Knowledge updated." : "Knowledge created.");
      await loadWorkspace(savedKnowledge.id);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelectedKnowledge() {
    if (!selectedKnowledge) {
      return;
    }

    setArchiving(true);
    setActionError(null);
    setActionMessage(null);
    setEmbeddingSummary(null);

    try {
      await archiveKnowledgeUnit(selectedKnowledge.id);
      setActionMessage("Knowledge archived.");
      await loadWorkspace(null);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setArchiving(false);
    }
  }

  async function refreshSelectedEmbeddings() {
    if (!selectedKnowledge) {
      return;
    }

    setRefreshingEmbeddings(true);
    setActionError(null);
    setActionMessage(null);
    setEmbeddingSummary(null);

    try {
      const summary = await refreshKnowledgeEmbeddings(selectedKnowledge.id);
      setEmbeddingSummary(summary);
      setActionMessage("Embeddings refreshed.");
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setRefreshingEmbeddings(false);
    }
  }

  async function createNewTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name) {
      setActionError("Tag name is required.");
      return;
    }

    setTagActionBusy(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const tag = await createTag({
        name,
        color: newTagColor.trim() || null
      });
      setNewTagName("");
      setNewTagColor("");
      setActionMessage(`Tag created: ${tag.name}.`);
      await loadWorkspace(selectedKnowledgeId);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setTagActionBusy(false);
    }
  }

  async function attachSelectedTag() {
    if (!selectedKnowledge || !tagToAttach) {
      return;
    }

    setTagActionBusy(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const updatedKnowledge = await attachKnowledgeTag(selectedKnowledge.id, tagToAttach);
      setTagToAttach("");
      setActionMessage("Tag attached.");
      await loadWorkspace(updatedKnowledge.id);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setTagActionBusy(false);
    }
  }

  async function detachTag(tagId: string) {
    if (!selectedKnowledge) {
      return;
    }

    setTagActionBusy(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const updatedKnowledge = await detachKnowledgeTag(selectedKnowledge.id, tagId);
      setActionMessage("Tag detached.");
      await loadWorkspace(updatedKnowledge.id);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setTagActionBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel title="Filters">
          <div className="space-y-3">
            <SelectField
              id="knowledge-project-filter"
              label="Project"
              value={projectFilterId}
              onChange={setProjectFilterId}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              id="knowledge-tag-filter"
              label="Tag"
              value={tagFilterSlug}
              onChange={setTagFilterSlug}
            >
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.slug}>
                  {tag.name}
                </option>
              ))}
            </SelectField>

            <button
              type="button"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void loadWorkspace(selectedKnowledgeId)}
              disabled={loadStatus === "loading"}
            >
              {loadStatus === "loading" ? "Loading..." : "Refresh"}
            </button>
          </div>
        </Panel>

        <Panel title="Knowledge Units">
          {loadStatus === "error" && loadError ? <ErrorBox message={loadError} /> : null}

          {loadStatus === "success" && knowledgeUnits.length === 0 ? (
            hasActiveFilter ? (
              <EmptyState
                title="No knowledge units match these filters."
                detail="Try clearing project or tag filters to see more results."
              />
            ) : (
              <EmptyState
                title="No knowledge units yet."
                detail="Create your first knowledge unit to start building your knowledge base."
              />
            )
          ) : null}

          <div className="space-y-3">
            {knowledgeUnits.map((knowledge) => (
              <button
                key={knowledge.id}
                type="button"
                className={[
                  "w-full rounded-lg border bg-white p-3 text-left transition",
                  knowledge.id === selectedKnowledgeId ? "border-pine shadow-sm" : "border-stone-200"
                ].join(" ")}
                onClick={() => selectKnowledge(knowledge)}
              >
                <p className="truncate text-sm font-semibold">{knowledge.title}</p>
                <p className="mt-1 text-xs text-stone-600">{projectName(projects, knowledge.project_id)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {knowledge.tags.length === 0 ? (
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">No tags</span>
                  ) : (
                    knowledge.tags.map((tag) => (
                      <span key={tag.id} className="rounded-full bg-pine/10 px-2 py-1 text-xs text-pine">
                        {tag.name}
                      </span>
                    ))
                  )}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title={selectedKnowledge ? "Edit Knowledge" : "New Knowledge"}>
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="rounded-lg bg-pine px-3 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
              onClick={startNewKnowledge}
            >
              New
            </button>
          </div>

          <form className="space-y-4" onSubmit={saveKnowledge}>
            <TextField
              id="knowledge-title"
              label="Title"
              value={form.title}
              error={formErrors.title}
              required
              onChange={(value) => updateFormField("title", value)}
            />

            <TextAreaField
              id="knowledge-content"
              label="Content"
              value={form.content}
              error={formErrors.content}
              required
              onChange={(value) => updateFormField("content", value)}
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
                {saving ? "Saving..." : selectedKnowledge ? "Save Knowledge" : "Create Knowledge"}
              </button>

              {selectedKnowledge ? (
                <>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void refreshSelectedEmbeddings()}
                    disabled={refreshingEmbeddings}
                  >
                    {refreshingEmbeddings ? "Refreshing..." : "Refresh Embeddings"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => setShowArchiveConfirm(true)}
                    disabled={archiving}
                  >
                    {archiving ? "Archiving..." : "Archive Knowledge"}
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </Panel>

        <Panel title="Context">
          {selectedKnowledge ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  id="knowledge-context-project"
                  label="Project"
                  value={context.project_id}
                  onChange={(value) => updateContextField("project_id", value)}
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  id="knowledge-context-source-uri"
                  label="Source URI"
                  value={context.source_uri}
                  placeholder="Optional"
                  onChange={(value) => updateContextField("source_uri", value)}
                />
              </div>

              {embeddingSummary ? <EmbeddingSummary summary={embeddingSummary} /> : null}
            </div>
          ) : (
            <p className="text-sm text-stone-600">Save the knowledge unit to set context metadata.</p>
          )}
        </Panel>

        <Panel title="Tags">
          <form className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto]" onSubmit={createNewTag}>
            <div>
              <label htmlFor="new-tag-name" className="text-sm font-medium text-stone-700">
                New tag
              </label>
              <input
                id="new-tag-name"
                type="text"
                className={inputClassName()}
                value={newTagName}
                required
                onChange={(event) => setNewTagName(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="new-tag-color" className="text-sm font-medium text-stone-700">
                Color
              </label>
              <input
                id="new-tag-color"
                type="text"
                className={inputClassName()}
                value={newTagColor}
                onChange={(event) => setNewTagColor(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                disabled={tagActionBusy}
              >
                Create
              </button>
            </div>
          </form>

          {selectedKnowledge ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedKnowledge.tags.length === 0 ? (
                  <span className="text-sm text-stone-600">No tags attached.</span>
                ) : (
                  selectedKnowledge.tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className="rounded-full border border-pine/20 bg-pine/10 px-3 py-1 text-xs font-semibold text-pine transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void detachTag(tag.id)}
                      disabled={tagActionBusy}
                    >
                      {tag.name} x
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  className={inputClassName()}
                  value={tagToAttach}
                  onChange={(event) => setTagToAttach(event.target.value)}
                  disabled={availableTags.length === 0}
                >
                  <option value="">Select tag to attach</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void attachSelectedTag()}
                  disabled={!tagToAttach || tagActionBusy}
                >
                  Attach Tag
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-600">Select a knowledge unit to manage tags.</p>
          )}
        </Panel>

        <Panel title="Overview">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Visible knowledge" value={String(knowledgeUnits.length)} />
            <Metric label="Projects" value={String(projects.length)} />
            <Metric label="Tags" value={String(tags.length)} />
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        title="Archive Knowledge"
        message={`Archive "${selectedKnowledge?.title ?? "this knowledge unit"}"? It will be hidden from active lists but not permanently deleted.`}
        confirmLabel="Archive Knowledge"
        onConfirm={() => {
          setShowArchiveConfirm(false);
          void archiveSelectedKnowledge();
        }}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </div>
  );
}

function EmbeddingSummary({ summary }: { summary: KnowledgeEmbeddingRefreshResponse }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 grid gap-3 text-sm md:grid-cols-3">
        <Metric label="Model" value={summary.embedding_model} />
        <Metric label="Dimension" value={String(summary.embedding_dimension)} />
        <Metric label="Provider" value={summary.provider_id} />
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-4">
        <Metric label="Chunks" value={String(summary.chunk_count)} />
        <Metric label="Created" value={String(summary.created_count)} />
        <Metric label="Reused" value={String(summary.reused_count)} />
        <Metric label="Deleted" value={String(summary.deleted_count)} />
      </div>
    </div>
  );
}
