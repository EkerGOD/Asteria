<template>
    <div ref="editorRef" class="editor-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { EditorView, highlightSpecialChars, drawSelection, dropCursor, keymap } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { cursorLineField, getCursorLines } from '../../editor/cursor-tracker';
import { wysiwygPlugin } from '../../editor/decorations';
import { editorTheme } from '../../editor/theme';
import { useTabs } from '../../composables/useTabs';
import { useFileManager } from '../../composables/useFileManager';
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

const { activeTab, activeContentVersion, updateContent, markClean } = useTabs();
const { saveFile } = useFileManager();

const editorRef = ref<HTMLElement | null>(null)
let view: EditorView | null = null

onMounted(() => {
    if (!editorRef.value) return

    const saveKeymap = Prec.highest(keymap.of([{
        key: 'Mod-s',
        run: () => {
            const tab = activeTab.value;
            if (!tab || !view) return false;
            const content = view.state.doc.toString();
            saveFile(tab.path, content).then(() => {
                markClean(tab.path);
            });
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
                    console.log('文档已变更')
                    const tab = activeTab.value;
                    if (tab && view) {
                        updateContent(tab.path, view.state.doc.toString());
                    }
                }
                if (update.selectionSet) {
                    const lines = getCursorLines(update.state)
                    console.log('光标行号:', [...lines].sort((a, b) => a - b))
                }
            })
        ]
    })

    view = new EditorView({
        state,
        parent: editorRef.value,
    })

    watch(activeContentVersion, () => {
        const tab = activeTab.value;
        const content = tab ? tab.content : sampleDoc;
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
    view?.destroy()
    view = null
})
</script>

<style scoped>
.editor-container {
  height: 100%;
}
</style>