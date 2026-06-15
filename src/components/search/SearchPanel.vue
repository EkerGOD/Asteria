<template>
  <div class="search-panel" data-search-panel>
    <template v-if="!currentFolder">
      <div class="search-placeholder">Open a folder to get started</div>
    </template>
    <template v-else>
      <div class="search-input-area">
        <div class="search-row">
          <div class="input-wrapper">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              data-search-input
              class="search-input"
              type="text"
              placeholder="Search"
              @keydown.escape="onEscape"
            />
            <div class="input-actions">
              <span v-if="isSearching" class="search-spinner" title="Searching..." />
              <button
                data-toggle-case
                class="option-btn"
                :class="{ active: caseSensitive }"
                title="Match Case"
                @click="caseSensitive = !caseSensitive"
              >
                Aa
              </button>
              <button
                data-toggle-word
                class="option-btn"
                :class="{ active: wholeWord }"
                title="Match Whole Word"
                @click="wholeWord = !wholeWord"
              >
                <span class="codicon codicon-whole-word" />
              </button>
              <button
                data-toggle-regex
                class="option-btn"
                :class="{ active: useRegex }"
                title="Use Regular Expression"
                @click="useRegex = !useRegex"
              >
                .*
              </button>
            </div>
          </div>
          <button
            data-replace-toggle
            class="option-btn"
            :class="{ active: showReplace }"
            title="Toggle Replace"
            @click="showReplace = !showReplace"
          >
            <span class="codicon codicon-chevron-down" :class="{ rotated: showReplace }" />
          </button>
        </div>
        <div v-if="showReplace" class="replace-row">
          <input
            v-model="replaceQuery"
            data-replace-input
            class="replace-input"
            type="text"
            placeholder="Replace"
          />
          <button
            data-replace-all-btn
            class="option-btn"
            title="Replace All"
            @click="replaceAll"
          >
            <span class="codicon codicon-replace-all" />
          </button>
        </div>
      </div>
      <div class="search-results" v-if="searchResults">
        <div v-if="searchResults.matches.length === 0" class="no-results">
          No results found
        </div>
        <div
          v-for="fileMatch in searchResults.matches"
          :key="fileMatch.file"
          class="result-file"
        >
          <div data-result-file class="result-file-name" @click="toggleCollapse(fileMatch.file)">
            <span class="codicon" :class="collapsedFiles.has(fileMatch.file) ? 'codicon-chevron-right' : 'codicon-chevron-down'" />
            <span class="codicon codicon-file" />
            <span class="result-file-name-text">{{ fileNameOf(fileMatch.file) }}</span>
            <span class="result-file-path">{{ dirPathOf(fileMatch.file) }}</span>
            <span class="result-file-count">{{ fileMatch.lines.length }}</span>
          </div>
          <template v-if="!collapsedFiles.has(fileMatch.file)">
            <div
              v-for="(line, idx) in fileMatch.lines"
              :key="idx"
              class="result-line"
              @click="openResult(fileMatch.file, line.line_num)"
            >
              <span class="result-line-num">{{ line.line_num }}</span>
              <span class="result-line-content">{{ line.content }}</span>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { useFileManager } from "../../composables/useFileManager";
import { useEditorActions } from "../../composables/useEditorActions";

interface LineMatch {
  line_num: number;
  content: string;
  match_start: number;
  match_end: number;
  before?: { line_num: number; content: string }[];
  after?: { line_num: number; content: string }[];
}

interface FileMatch {
  file: string;
  lines: LineMatch[];
}

interface SearchResult {
  matches: FileMatch[];
  total_matches: number;
}

const BATCH_SIZE = 100;

const { currentFolder, selectFile } = useFileManager();
const { goToLine } = useEditorActions();

async function openResult(file: string, lineNum: number) {
  const fullPath = currentFolder.value
    ? currentFolder.value + "\\" + file
    : file;
  await selectFile(fullPath);
  nextTick(() => goToLine(lineNum));
}

const searchQuery = ref("");
const replaceQuery = ref("");
const showReplace = ref(false);
const caseSensitive = ref(false);
const wholeWord = ref(false);
const useRegex = ref(false);
const searchResults = ref<SearchResult | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const isSearching = ref(false);
const collapsedFiles = ref(new Set<string>());

function toggleCollapse(file: string) {
  if (collapsedFiles.value.has(file)) {
    collapsedFiles.value.delete(file);
  } else {
    collapsedFiles.value.add(file);
  }
  collapsedFiles.value = new Set(collapsedFiles.value);
}

function fileNameOf(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  const i = path.lastIndexOf(sep);
  return i >= 0 ? path.slice(i + 1) : path;
}

function dirPathOf(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  const i = path.lastIndexOf(sep);
  return i >= 0 ? path.slice(0, i) : "";
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let unlistenResult: UnlistenFn | null = null;
let unlistenDone: UnlistenFn | null = null;
let pendingMatches: FileMatch[] = [];
let rafId: number | null = null;

async function setupListeners() {
  await cleanupListeners();
  unlistenResult = await listen<FileMatch>("search-result", (event) => {
    pendingMatches.push(event.payload);
    scheduleFlush();
  });
  unlistenDone = await listen<{ total_matches: number }>("search-done", (_event) => {
    isSearching.value = false;
    flushPending();
  });
  listen("search-truncated", () => {
    /* truncated event is informational */
  });
}

function scheduleFlush() {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    flushPending();
  });
}

function flushPending() {
  if (pendingMatches.length === 0) return;
  const batch = pendingMatches.splice(0, BATCH_SIZE);
  if (!searchResults.value) {
    searchResults.value = { matches: [], total_matches: 0 };
  }
  searchResults.value.matches.push(...batch);
  searchResults.value.total_matches += batch
    .reduce((sum, m) => sum + m.lines.length, 0);
  if (pendingMatches.length > 0) {
    scheduleFlush();
  }
}

async function cleanupListeners() {
  if (unlistenResult) { unlistenResult(); unlistenResult = null; }
  if (unlistenDone) { unlistenDone(); unlistenDone = null; }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  pendingMatches = [];
}

watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch();
  }, 300);
});

async function performSearch() {
  if (!searchQuery.value || !currentFolder.value) {
    searchResults.value = null;
    return;
  }

  try { await invoke("cancel_search"); } catch { /* ignore */ }
  await cleanupListeners();
  searchResults.value = null;
  isSearching.value = true;
  collapsedFiles.value = new Set();

  await setupListeners();
  try {
    await invoke("search_in_dir_cmd", {
      dir: currentFolder.value,
      query: searchQuery.value,
      useRegex: useRegex.value,
      caseSensitive: caseSensitive.value,
      wholeWord: wholeWord.value,
    });
  } catch (e) {
    console.error("Search failed:", e);
    isSearching.value = false;
    searchResults.value = null;
    await cleanupListeners();
  }
}

async function replaceAll() {
  if (!searchResults.value || !replaceQuery.value) return;
  const confirmed = await ask(
    `Replace all ${searchResults.value.total_matches} occurrences with "${replaceQuery.value}"?`,
    { title: "Replace All", kind: "warning" }
  );
  if (!confirmed) return;

  for (const fileMatch of searchResults.value.matches) {
    const fullPath = currentFolder.value + "\\" + fileMatch.file;
    try {
      await invoke("replace_in_file_cmd", {
        filePath: fullPath,
        query: searchQuery.value,
        replacement: replaceQuery.value,
        useRegex: useRegex.value,
        caseSensitive: caseSensitive.value,
        wholeWord: wholeWord.value,
      });
    } catch (e) {
      console.error("Replace failed:", e);
    }
  }
  await performSearch();
}

function onEscape() {
  searchQuery.value = "";
}

function focusInput() {
  nextTick(() => {
    searchInputRef.value?.focus();
  });
}

onUnmounted(() => {
  cleanupListeners();
});

defineExpose({ focusInput });
</script>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary, #fafafa);
  border-right: 1px solid var(--border-primary, #e0e0e0);
}

.search-placeholder {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted, #888);
}

.search-input-area {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-row {
  display: flex;
  gap: 4px;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.input-actions {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 1px;
}

.replace-row {
  display: flex;
  gap: 4px;
}

.search-input {
  flex: 1;
  font-size: 13px;
  font-family: inherit;
  padding: 4px 86px 4px 8px;
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 4px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #1a1a1a);
  outline: none;
  width: 100%;
}

.replace-input {
  flex: 1;
  font-size: 13px;
  font-family: inherit;
  padding: 4px 8px;
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 4px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #1a1a1a);
  outline: none;
}

.search-input:focus,
.replace-input:focus {
  border-color: var(--link-color, #0066cc);
}

.option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted, #888);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  padding: 0;
}

.option-btn:hover {
  background: var(--bg-hover, #e8e8e8);
}

.option-btn.active {
  background: var(--bg-selected, #d0e0ff);
  color: var(--link-color, #0066cc);
}

.rotated {
  transform: rotate(180deg);
}

.search-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--text-muted, #888);
  border-top-color: var(--link-color, #0066cc);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
  margin-right: 2px;
  align-self: center;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.no-results {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted, #888);
}

.result-file {
  margin-bottom: 4px;
}

.result-file-name {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  cursor: pointer;
  user-select: none;
}

.result-file-name:hover {
  background: var(--bg-hover, #e8e8e8);
}

.result-file-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted, #888);
  margin-left: 4px;
}

.result-file-name-text {
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-file-count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted, #888);
  background: var(--bg-hover, #e8e8e8);
  border-radius: 8px;
  padding: 0 6px;
  line-height: 18px;
}

.result-line {
  display: flex;
  gap: 8px;
  padding: 2px 8px 2px 24px;
  font-size: 13px;
  font-family: monospace;
  cursor: pointer;
}

.result-line:hover {
  background: var(--bg-hover, #e8e8e8);
}

.result-line-num {
  flex-shrink: 0;
  width: 36px;
  text-align: right;
  color: var(--text-muted, #888);
}

.result-line-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
