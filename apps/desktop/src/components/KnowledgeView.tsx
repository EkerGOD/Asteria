import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
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
import { isAbortError, toErrorMessage, type LoadStatus } from "../lib/errors";
import { inputClassName } from "../lib/style";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { ErrorBox, SelectField, TextAreaField, TextField } from "./FormFields";
import { Icon } from "./Icon";

type KnowledgeViewMode = "cards" | "list";

type KnowledgeFormState = {
  title: string;
  content: string;
};

type KnowledgeFormErrors = Partial<Record<keyof KnowledgeFormState, string>>;

type KnowledgeContextState = {
  project_id: string;
  source_uri: string;
};

const TAG_COLOR_OPTIONS = [
  { label: "No color", value: "" },
  { label: "Pine", value: "#2f5d50" },
  { label: "Blue", value: "#2563eb" },
  { label: "Amber", value: "#b45309" },
  { label: "Rose", value: "#be123c" }
] as const;

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

function buildKnowledgePayload(
  form: KnowledgeFormState,
  context: KnowledgeContextState
): KnowledgeUnitCreateRequest | KnowledgeUnitUpdateRequest {
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

function excerpt(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 140) {
    return normalized;
  }

  return `${normalized.slice(0, 137)}...`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function tagBadgeStyle(tag: Tag): CSSProperties | undefined {
  if (!tag.color) {
    return undefined;
  }

  const style: CSSProperties = {
    borderColor: tag.color,
    color: tag.color
  };

  if (/^#[0-9a-fA-F]{6}$/.test(tag.color)) {
    style.backgroundColor = `${tag.color}1A`;
  }

  return style;
}

function modeButtonClassName(active: boolean): string {
  return [
    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs font-semibold transition",
    active ? "bg-pine text-white" : "text-stone-500 hover:text-stone-800"
  ].join(" ");
}

function knowledgeButtonClassName(mode: KnowledgeViewMode, selected: boolean): string {
  if (mode === "list") {
    return [
      "w-full px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-pine/20",
      selected ? "bg-pine/10" : "hover:bg-stone-50"
    ].join(" ");
  }

  return [
    "w-full rounded-lg border bg-white p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-pine/20",
    selected ? "border-pine shadow-sm" : "border-stone-200 hover:border-stone-300"
  ].join(" ");
}

export function KnowledgeView() {
  const [mode, setMode] = useState<KnowledgeViewMode>("cards");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [knowledgeUnits, setKnowledgeUnits] = useState<KnowledgeUnit[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [tagActionError, setTagActionError] = useState<string | null>(null);
  const [tagActionMessage, setTagActionMessage] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const selectedKnowledge = useMemo(
    () => knowledgeUnits.find((knowledge) => knowledge.id === selectedKnowledgeId) ?? null,
    [knowledgeUnits, selectedKnowledgeId]
  );

  const availableTags = useMemo(() => {
    const attachedTagIds = new Set(selectedKnowledge?.tags.map((tag) => tag.id) ?? []);
    return tags.filter((tag) => !attachedTagIds.has(tag.id));
  }, [selectedKnowledge, tags]);

  const hasActiveSearch = searchTerm.trim() !== "";
  const hasActiveFilter = hasActiveSearch || tagFilterSlug !== "";

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
              tag_slugs: tagFilterSlug ? [tagFilterSlug] : [],
              q: searchTerm.trim() || null
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
    [searchTerm, tagFilterSlug]
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
    setTagActionError(null);
    setTagActionMessage(null);
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
    setTagActionError(null);
    setTagActionMessage(null);
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
      setTagActionError("Tag name is required.");
      return;
    }

    setTagActionBusy(true);
    setTagActionError(null);
    setTagActionMessage(null);

    try {
      const tag = await createTag({
        name,
        color: newTagColor || null
      });
      setNewTagName("");
      setNewTagColor("");
      setTagActionMessage(`Tag created: ${tag.name}.`);
      await loadWorkspace(selectedKnowledgeId);
    } catch (error) {
      setTagActionError(toErrorMessage(error));
    } finally {
      setTagActionBusy(false);
    }
  }

  async function attachSelectedTag() {
    if (!selectedKnowledge || !tagToAttach) {
      return;
    }

    setTagActionBusy(true);
    setTagActionError(null);
    setTagActionMessage(null);

    try {
      const updatedKnowledge = await attachKnowledgeTag(selectedKnowledge.id, tagToAttach);
      setTagToAttach("");
      setTagActionMessage("Tag attached.");
      await loadWorkspace(updatedKnowledge.id);
    } catch (error) {
      setTagActionError(toErrorMessage(error));
    } finally {
      setTagActionBusy(false);
    }
  }

  async function detachTag(tagId: string) {
    if (!selectedKnowledge) {
      return;
    }

    setTagActionBusy(true);
    setTagActionError(null);
    setTagActionMessage(null);

    try {
      const updatedKnowledge = await detachKnowledgeTag(selectedKnowledge.id, tagId);
      setTagActionMessage("Tag detached.");
      await loadWorkspace(updatedKnowledge.id);
    } catch (error) {
      setTagActionError(toErrorMessage(error));
    } finally {
      setTagActionBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="shrink-0 space-y-2 border-b border-stone-200 p-3">
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-2 rounded-md border border-stone-300 bg-white p-0.5">
            <button
              type="button"
              className={modeButtonClassName(mode === "cards")}
              onClick={() => setMode("cards")}
              aria-pressed={mode === "cards"}
            >
              <Icon name="knowledge" size={12} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={modeButtonClassName(mode === "list")}
              onClick={() => setMode("list")}
              aria-pressed={mode === "list"}
            >
              <Icon name="outline" size={12} />
              <span>List</span>
            </button>
          </div>

          <button
            type="button"
            className="flex shrink-0 items-center gap-1 rounded-md bg-pine px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-pine/90"
            onClick={startNewKnowledge}
          >
            <Icon name="add" size={12} />
            <span>New</span>
          </button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div>
            <label htmlFor="knowledge-panel-search" className="sr-only">
              Search knowledge
            </label>
            <input
              id="knowledge-panel-search"
              type="search"
              className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs outline-none transition placeholder:text-stone-400 focus:border-pine focus:ring-2 focus:ring-pine/20"
              value={searchTerm}
              placeholder="Search knowledge"
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
            title="Refresh knowledge"
            aria-label="Refresh knowledge"
            onClick={() => void loadWorkspace(selectedKnowledgeId)}
            disabled={loadStatus === "loading"}
          >
            <Icon name="refresh" size={14} />
          </button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <label htmlFor="knowledge-panel-tag-filter" className="sr-only">
            Filter by tag
          </label>
          <select
            id="knowledge-panel-tag-filter"
            className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
            value={tagFilterSlug}
            onChange={(event) => setTagFilterSlug(event.target.value)}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.slug}>
                {tag.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              setSearchTerm("");
              setTagFilterSlug("");
            }}
            disabled={!hasActiveFilter}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <section className="mb-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase text-stone-500">Knowledge Units</h3>
            <span className="shrink-0 text-xs text-stone-400">
              {loadStatus === "loading" ? "Loading" : `${knowledgeUnits.length} visible`}
            </span>
          </div>

          {loadStatus === "error" && loadError ? (
            <div>
              <ErrorBox message={loadError} />
              <button
                type="button"
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-pine hover:text-pine"
                onClick={() => void loadWorkspace(selectedKnowledgeId)}
              >
                Retry
              </button>
            </div>
          ) : null}

          {loadStatus === "loading" && knowledgeUnits.length === 0 ? (
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500">
              Loading knowledge units...
            </div>
          ) : null}

          {loadStatus === "success" && knowledgeUnits.length === 0 ? (
            hasActiveFilter ? (
              <EmptyState
                title="No knowledge units match this view."
                detail="Clear search or tag filters to see more knowledge."
              />
            ) : (
              <EmptyState
                title="No knowledge units yet."
                detail="Create the first unit to start building semantic memory."
                action={{ label: "New Knowledge", onClick: startNewKnowledge }}
              />
            )
          ) : null}

          {knowledgeUnits.length > 0 ? (
            <div className={mode === "list" ? "overflow-hidden rounded-lg border border-stone-200 bg-white" : "space-y-2"}>
              {knowledgeUnits.map((knowledge) => (
                <button
                  key={knowledge.id}
                  type="button"
                  className={knowledgeButtonClassName(mode, knowledge.id === selectedKnowledgeId)}
                  onClick={() => selectKnowledge(knowledge)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800">{knowledge.title}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {projectName(projects, knowledge.project_id)} - {formatDate(knowledge.updated_at)}
                      </p>
                    </div>
                    {knowledge.id === selectedKnowledgeId ? (
                      <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-semibold text-pine">Selected</span>
                    ) : null}
                  </div>

                  {mode === "cards" ? (
                    <>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-600">{excerpt(knowledge.content)}</p>
                      <TagList tags={knowledge.tags} />
                    </>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mb-3 rounded-lg border border-stone-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase text-stone-500">
              {selectedKnowledge ? "Edit Knowledge" : "New Knowledge"}
            </h3>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
              {selectedKnowledge ? "Editing" : "Creating"}
            </span>
          </div>

          <form className="space-y-3" onSubmit={saveKnowledge}>
            <TextField
              id="knowledge-panel-title"
              label="Title"
              value={form.title}
              error={formErrors.title}
              required
              onChange={(value) => updateFormField("title", value)}
            />

            <TextAreaField
              id="knowledge-panel-content"
              label="Content"
              value={form.content}
              error={formErrors.content}
              required
              onChange={(value) => updateFormField("content", value)}
            />

            <SelectField
              id="knowledge-panel-project"
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
              id="knowledge-panel-source-uri"
              label="Source URI"
              value={context.source_uri}
              placeholder="Optional"
              onChange={(value) => updateContextField("source_uri", value)}
            />

            {actionError ? <ErrorBox message={actionError} /> : null}
            {actionMessage ? (
              <div className="rounded-lg border border-pine/20 bg-pine/10 px-3 py-2 text-sm text-pine">
                {actionMessage}
              </div>
            ) : null}
            {embeddingSummary ? <EmbeddingSummary summary={embeddingSummary} /> : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="flex items-center gap-1 rounded-md bg-pine px-3 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
              >
                <Icon name="check" size={13} />
                <span>{saving ? "Saving..." : selectedKnowledge ? "Save" : "Create"}</span>
              </button>

              {selectedKnowledge ? (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void refreshSelectedEmbeddings()}
                    disabled={refreshingEmbeddings}
                  >
                    <Icon name="refresh" size={13} />
                    <span>{refreshingEmbeddings ? "Refreshing..." : "Embeddings"}</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => setShowArchiveConfirm(true)}
                    disabled={archiving}
                  >
                    <Icon name="archive" size={13} />
                    <span>{archiving ? "Archiving..." : "Archive"}</span>
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase text-stone-500">Tags</h3>

          {tagActionError ? <ErrorBox message={tagActionError} /> : null}
          {tagActionMessage ? (
            <div className="mb-4 rounded-lg border border-pine/20 bg-pine/10 px-3 py-2 text-sm text-pine">
              {tagActionMessage}
            </div>
          ) : null}

          <form className="mb-4 space-y-3" onSubmit={createNewTag}>
            <div>
              <label htmlFor="knowledge-panel-new-tag" className="text-sm font-medium text-stone-700">
                New tag
              </label>
              <input
                id="knowledge-panel-new-tag"
                type="text"
                className={inputClassName()}
                value={newTagName}
                required
                onChange={(event) => setNewTagName(event.target.value)}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-stone-700">Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TAG_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className={[
                      "flex h-7 min-w-7 items-center justify-center rounded-md border text-xs transition focus:outline-none focus:ring-2 focus:ring-pine/20",
                      newTagColor === option.value ? "border-pine bg-pine/10" : "border-stone-300 bg-white hover:border-pine"
                    ].join(" ")}
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={newTagColor === option.value}
                    onClick={() => setNewTagColor(option.value)}
                  >
                    {option.value ? (
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: option.value }} />
                    ) : (
                      <span className="text-stone-400">-</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
              disabled={tagActionBusy}
            >
              <Icon name="add" size={13} />
              <span>{tagActionBusy ? "Working..." : "Create Tag"}</span>
            </button>
          </form>

          {selectedKnowledge ? (
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-sm font-medium text-stone-700">Attached</p>
                {selectedKnowledge.tags.length === 0 ? (
                  <p className="text-sm text-stone-500">No tags attached.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedKnowledge.tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className="rounded-full border border-pine/20 bg-pine/10 px-2 py-1 text-xs font-semibold text-pine transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        style={tagBadgeStyle(tag)}
                        title={`Detach ${tag.name}`}
                        onClick={() => void detachTag(tag.id)}
                        disabled={tagActionBusy}
                      >
                        {tag.name} x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="knowledge-panel-attach-tag" className="text-sm font-medium text-stone-700">
                  Attach tag
                </label>
                <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <select
                    id="knowledge-panel-attach-tag"
                    className="w-full rounded-md border border-stone-300 bg-white px-2 py-2 text-sm text-stone-700 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                    value={tagToAttach}
                    onChange={(event) => setTagToAttach(event.target.value)}
                    disabled={availableTags.length === 0}
                  >
                    <option value="">{availableTags.length === 0 ? "No tags available" : "Select tag"}</option>
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void attachSelectedTag()}
                    disabled={!tagToAttach || tagActionBusy}
                  >
                    Attach
                  </button>
                </div>
                {availableTags.length === 0 ? (
                  <p className="mt-1 text-xs text-stone-500">Create or detach a tag before attaching another.</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-500">Save or select a knowledge unit to attach tags.</p>
          )}
        </section>
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

function TagList({ tags }: { tags: Tag[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.length === 0 ? (
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">No tags</span>
      ) : (
        tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border border-pine/20 bg-pine/10 px-2 py-0.5 text-xs font-medium text-pine"
            style={tagBadgeStyle(tag)}
          >
            {tag.name}
          </span>
        ))
      )}
    </div>
  );
}

function EmbeddingSummary({ summary }: { summary: KnowledgeEmbeddingRefreshResponse }) {
  return (
    <dl className="grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
      <MetricRow label="Model" value={summary.embedding_model} />
      <MetricRow label="Dimension" value={String(summary.embedding_dimension)} />
      <MetricRow label="Provider" value={summary.provider_id} />
      <MetricRow label="Chunks" value={String(summary.chunk_count)} />
      <MetricRow label="Created" value={String(summary.created_count)} />
      <MetricRow label="Reused" value={String(summary.reused_count)} />
      <MetricRow label="Deleted" value={String(summary.deleted_count)} />
    </dl>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
      <dt className="font-medium text-stone-500">{label}</dt>
      <dd className="min-w-0 break-all text-stone-800">{value}</dd>
    </div>
  );
}
