import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { registerCppCompletions } from '../editor/cppCompletions';
import { DiagnosticItem } from '../workspace/types';

// Configure Monaco Environment to use local bundled worker
(self as any).MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  }
};

let completionsRegistered = false;

interface EditorPaneProps {
  code: string;
  tabId: string;
  diagnostics: DiagnosticItem[];
  onChange: (value: string) => void;
  onRunShortcut: () => void;
  onStopShortcut: () => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  code,
  tabId,
  diagnostics,
  onChange,
  onRunShortcut,
  onStopShortcut
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Register C++ completions once
  useEffect(() => {
    if (!completionsRegistered) {
      registerCppCompletions(monaco);
      completionsRegistered = true;
    }

    monaco.editor.defineTheme('cpp-dark-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0e1117',
        'editor.lineHighlightBackground': '#161b22',
        'editorGutter.background': '#0e1117',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#e6edf3',
        'scrollbarSlider.background': '#30363d66',
        'scrollbarSlider.hoverBackground': '#484f5888',
        'scrollbarSlider.activeBackground': '#58a6ff66'
      }
    });
  }, []);

  // Initialize Monaco instance
  useEffect(() => {
    if (!containerRef.current) return;

    const editor = monaco.editor.create(containerRef.current, {
      theme: 'cpp-dark-theme',
      language: 'cpp',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      wordWrap: 'on',
      // Make the C++ completion provider run while the user types, as well as
      // on its explicit trigger characters such as ':' and '<'.
      quickSuggestions: { other: true, comments: false, strings: false },
      quickSuggestionsDelay: 25,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      lineNumbersMinChars: 3,
      padding: { top: 8, bottom: 8 },
      renderLineHighlight: 'all',
      suggest: {
        snippetsPreventQuickSuggestions: false,
        localityBonus: true,
        shareSuggestSelections: true,
        showWords: true
      }
    });

    editorRef.current = editor;

    // Shortcuts inside editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunShortcut();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
      onStopShortcut();
    });

    return () => {
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  // Each active tab owns one model. Reuse an existing model URI if one
  // survived a development remount, and dispose it when this pane is removed.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const uri = monaco.Uri.parse(`inmemory://model/${tabId}.cpp`);
    const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(code, 'cpp', uri);
    if (model.getValue() !== code) model.setValue(code);

    const contentSubscription = model.onDidChangeContent((event) => {
      onChange(model.getValue());
      if (!event.changes.some(change => /[<:.#]/.test(change.text))) return;

      // Wait until Monaco has updated the cursor after applying the edit.
      requestAnimationFrame(() => {
        const position = editor.getPosition();
        if (editor.getModel() !== model || !position || position.lineNumber < 1 || position.lineNumber > model.getLineCount()) return;
        const linePrefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
        const isCompletionContext =
          /#\s*include\s*<[^>]*$/.test(linePrefix) ||
          /std::[a-zA-Z0-9_]*$/.test(linePrefix) ||
          /(?:\.|->)[a-zA-Z0-9_]*$/.test(linePrefix);
        if (isCompletionContext) {
          editor.trigger('cpp-completion', 'editor.action.triggerSuggest', {});
        }
      });
    });
    editor.setModel(model);

    return () => {
      contentSubscription.dispose();
      model.dispose();
    };
  }, [tabId]);

  // Update diagnostic markers on active model
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const markers: monaco.editor.IMarkerData[] = diagnostics.map((d) => ({
      startLineNumber: d.line,
      startColumn: d.column || 1,
      endLineNumber: d.line,
      endColumn: d.column ? d.column + 1 : 100,
      message: d.message,
      severity:
        d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : d.severity === 'warning'
          ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Info
    }));

    monaco.editor.setModelMarkers(model, 'compiler', markers);
  }, [diagnostics, tabId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    />
  );
};
