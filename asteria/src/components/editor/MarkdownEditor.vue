<template>
    <div ref="editorRef" class="editor-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { EditorView, highlightSpecialChars, drawSelection, dropCursor, keymap } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { cursorLineField } from '../../editor/cursor-tracker';
import { wysiwygPlugin, forceRebuildEffect, setCurrentFilePath } from '../../editor/decorations';
import { editorTheme } from '../../editor/theme';
import { useTabs } from '../../composables/useTabs';
import { useFileManager } from '../../composables/useFileManager';
import { useEditorActions } from '../../composables/useEditorActions';
import '../../styles/variables.css';
import '../../styles/editor.css';

const sampleDoc = [
  '# Welcome to Asteria',
  '',
  'A **WYSIWYG** Markdown editor built with Tauri + Vue + CodeMirror 6.',
  '',
  '## Features',
  '',
  '- **Bold** and *italic* and ~~strikethrough~~',
  '- `inline code`',
  '- [Links](https://example.com)',
  '- ![Image](https://example.com/img.png)',
  '',
  '## Code Block',
  '',
  '```ts',
  'function greet(name: string): string {',
  '  return `Hello, ${name}!`',
  '}',
  '```',
  '',
  '## Blockquote',
  '',
  '> The best way to predict the future is to invent it.',
  '',
  '## Table',
  '',
  '| Name  | Type   |',
  '| ----- | ------ |',
  '| id    | number |',
  '| title | string |',
  '',
  '## Task List',
  '',
  '- [x] Install dependencies',
  '- [ ] Implement parser',
  '- [ ] Build WYSIWYG engine',
  '',
  '---',
  '',
  'End of sample.',
].join('\n')

const { activeTab, activeContentVersion, updateContent, markClean, setSaveStatus, setCursorPos } = useTabs();
const { saveFile, refreshTree } = useFileManager();
const { registerEditor } = useEditorActions();

const editorRef = ref<HTMLElement | null>(null)
let view: EditorView | null = null

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
const AUTO_SAVE_DELAY = 1000
const SAVED_RESET_DELAY = 2000

async function doSave(path: string, content: string) {
  setSaveStatus(path, "saving")
  try {
    await saveFile(path, content)
    markClean(path)
    setSaveStatus(path, "saved")
    setTimeout(() => {
      const tab = activeTab.value
      if (tab && tab.path === path && !tab.isDirty) {
        setSaveStatus(path, "idle")
      }
    }, SAVED_RESET_DELAY)
  } catch {
    setSaveStatus(path, "error")
  }
}

function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    const tab = activeTab.value
    if (tab && tab.isDirty && view) {
      doSave(tab.path, view.state.doc.toString())
    }
  }, AUTO_SAVE_DELAY)
}

function saveImmediately() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  const tab = activeTab.value
  if (tab && tab.isDirty && view) {
    doSave(tab.path, view.state.doc.toString())
  }
}

onMounted(() => {
    if (!editorRef.value) return

    const saveKeymap = Prec.highest(keymap.of([{
        key: 'Mod-s',
        run: () => {
            const tab = activeTab.value;
            if (!tab || !view) return false;
            doSave(tab.path, view.state.doc.toString());
            return true;
        },
        preventDefault: true,
    }]));

    const state = EditorState.create({
        doc: activeTab.value?.content || sampleDoc,
        extensions: [
            highlightSpecialChars(),
            drawSelection(),
            dropCursor(),
            history(),
            indentOnInput(),
            EditorState.allowMultipleSelections.of(true),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            keymap.of([...defaultKeymap, ...historyKeymap]),
            saveKeymap,
            editorTheme,
            cursorLineField,
            wysiwygPlugin,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const tab = activeTab.value;
                    if (tab && view) {
                        updateContent(tab.path, view.state.doc.toString());
                        scheduleAutoSave();
                    }
                }
                if (update.selectionSet) {
                    const pos = update.state.selection.main.head
                    const line = update.state.doc.lineAt(pos)
                    setCursorPos(line.number, pos - line.from + 1)
                }
            })
        ]
    })

    view = new EditorView({
        state,
        parent: editorRef.value,
    })

    registerEditor(view);

    setCurrentFilePath(activeTab.value?.path ?? null)

    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif']

    function isImageFile(file: File): boolean {
        if (file.type.startsWith('image/')) return true
        const ext = file.name.split('.').pop()?.toLowerCase()
        return imageExtensions.includes(ext || '')
    }

    function getImageExt(type: string, name: string): string {
        const mimeMap: Record<string, string> = {
            'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
            'image/webp': 'webp', 'image/bmp': 'bmp', 'image/svg+xml': 'svg',
            'image/x-icon': 'ico', 'image/tiff': 'tiff',
        }
        if (mimeMap[type]) return mimeMap[type]
        return name.split('.').pop()?.toLowerCase() || 'png'
    }

    async function insertImage(data: Uint8Array, ext: string, insertPos: number) {
        const tab = activeTab.value
        let dir = tab ? tab.path.replace(/[/\\][^/\\]*$/, '') : null
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
        const filename = `img-${timestamp}.${ext}`

        let filePath: string
        let syntax: string

        if (dir) {
            filePath = `${dir}/${filename}`
            try {
                await invoke('write_binary_file', { path: filePath, data: Array.from(data) })
            } catch (err) {
                console.error('[asteria] write failed:', err)
                return
            }
            refreshTree()
            syntax = `![${filename}](./${filename})`
        } else {
            const saved = await save({
                title: 'Save Image',
                defaultPath: filename,
                filters: [{ name: 'Images', extensions: imageExtensions }],
            })
            if (!saved) return
            filePath = saved
            await invoke('write_binary_file', { path: filePath, data: Array.from(data) })
            refreshTree()
            syntax = `![${filename}](${filePath.replace(/\\/g, '/')})`
        }

        if (!view) return
        view.focus()
        view.dispatch({
            changes: { from: insertPos, to: insertPos, insert: syntax },
        })
    }

    view.dom.addEventListener('paste', (e: ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return
        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (!item.type.startsWith('image/')) continue
            const blob = item.getAsFile()
            if (!blob) continue
            e.preventDefault()
            e.stopPropagation()
            const ext = getImageExt(item.type, '')
            blob.arrayBuffer().then((buf) => {
                const data = new Uint8Array(buf)
                if (!view) return
                const pos = view.state.selection.main.from
                insertImage(data, ext, pos)
            })
            return
        }
    }, { capture: true })

    view.dom.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }, { capture: true })

    view.dom.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const files = e.dataTransfer?.files
        if (!files) return
        const coords = { x: e.clientX, y: e.clientY }
        let pos = view ? view.posAtCoords(coords) : null
        if (pos === null && view) pos = view.state.selection.main.from
        if (pos === null) return
        Array.from(files).forEach((file) => {
            if (!isImageFile(file)) return
            const ext = getImageExt(file.type, file.name)
            file.arrayBuffer().then((buf) => {
                insertImage(new Uint8Array(buf), ext, pos!)
            })
        })
    }, { capture: true })

    view.dispatch({ effects: forceRebuildEffect.of(null) })

    view.dom.addEventListener('blur', saveImmediately)

    watch(activeContentVersion, () => {
        const tab = activeTab.value;
        const content = tab ? tab.content : sampleDoc;
        setCurrentFilePath(tab?.path ?? null)
        if (view && content !== view.state.doc.toString()) {
            view.dispatch({
                changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: content,
                },
            });
        }
    });
})

onUnmounted(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    view?.dom.removeEventListener('blur', saveImmediately)
    view?.destroy()
    view = null
})
</script>

<style scoped>
.editor-container {
  height: 100%;
}
</style>