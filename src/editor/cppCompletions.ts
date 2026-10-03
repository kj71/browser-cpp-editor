import type * as MonacoType from 'monaco-editor';
import { CXX_HEADERS, CXX_KEYWORDS, STD_MEMBERS, CONTAINER_METHODS } from './stlCatalog';

export function registerCppCompletions(monaco: typeof MonacoType): MonacoType.IDisposable {
  return monaco.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: [':', '<', '.', '#'],
    provideCompletionItems(model, position) {
      const lineUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });

      const word = model.getWordUntilPosition(position);
      const range: MonacoType.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions: MonacoType.languages.CompletionItem[] = [];

      // 1. Header suggestions after `#include <`
      const includeMatch = lineUntilPosition.match(/#\s*include\s*<([^>]*)$/);
      if (includeMatch) {
        for (const h of CXX_HEADERS) {
          suggestions.push({
            label: h.label,
            kind: monaco.languages.CompletionItemKind.File,
            detail: h.detail,
            insertText: h.label,
            range
          });
        }
        return { suggestions };
      }

      // 2. std:: members after `std::`
      const stdMatch = lineUntilPosition.match(/std::([a-zA-Z0-9_]*)$/);
      if (stdMatch) {
        for (const item of STD_MEMBERS) {
          suggestions.push({
            label: item.label,
            kind: item.insertText?.includes('(')
              ? monaco.languages.CompletionItemKind.Function
              : monaco.languages.CompletionItemKind.Class,
            detail: item.detail,
            insertText: item.insertText || item.label,
            insertTextRules: item.insertText?.includes('$')
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            range
          });
        }
        return { suggestions };
      }

      // 3. Container methods after `.` or `->`
      const memberMatch = lineUntilPosition.match(/(?:\.|\->)([a-zA-Z0-9_]*)$/);
      if (memberMatch) {
        for (const m of CONTAINER_METHODS) {
          suggestions.push({
            label: m.label,
            kind: monaco.languages.CompletionItemKind.Method,
            detail: m.detail,
            insertText: m.insertText || m.label,
            insertTextRules: m.insertText?.includes('$')
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            range
          });
        }
        return { suggestions };
      }

      // 4. Snippets
      const snippets: Array<{ label: string; detail: string; insertText: string }> = [
        {
          label: 'main',
          detail: 'int main() function template',
          insertText: 'int main() {\n\t${1}\n\treturn 0;\n}'
        },
        {
          label: 'for',
          detail: 'Standard for loop',
          insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t${3}\n}'
        },
        {
          label: 'fori',
          detail: 'Index-based loop with container size',
          insertText: 'for (size_t ${1:i} = 0; ${1:i} < ${2:container}.size(); ++${1:i}) {\n\t${3}\n}'
        },
        {
          label: 'while',
          detail: 'While loop',
          insertText: 'while (${1:condition}) {\n\t${2}\n}'
        },
        {
          label: 'if',
          detail: 'If statement',
          insertText: 'if (${1:condition}) {\n\t${2}\n}'
        },
        {
          label: 'class',
          detail: 'Class definition',
          insertText: 'class ${1:ClassName} {\npublic:\n\t${1:ClassName}();\n\t~${1:ClassName}();\n\nprivate:\n\t${2}\n};'
        },
        {
          label: 'struct',
          detail: 'Struct definition',
          insertText: 'struct ${1:StructName} {\n\t${2}\n};'
        },
        {
          label: 'cout',
          detail: 'std::cout print snippet',
          insertText: 'std::cout << ${1:output} << "\\n";'
        },
        {
          label: 'cin',
          detail: 'std::cin input snippet',
          insertText: 'std::cin >> ${1:input};'
        },
        {
          label: 'fastio',
          detail: 'Competitive programming Fast I/O snippet',
          insertText: 'std::ios_base::sync_with_stdio(false);\nstd::cin.tie(NULL);'
        },
        {
          label: '#include',
          detail: '#include directive',
          insertText: '#include <${1:iostream}>'
        }
      ];

      for (const s of snippets) {
        suggestions.push({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: s.detail,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        });
      }

      // 5. C++ Keywords
      for (const kw of CXX_KEYWORDS) {
        suggestions.push({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range
        });
      }

      // 6. std namespace suggestion
      suggestions.push({
        label: 'std',
        kind: monaco.languages.CompletionItemKind.Module,
        detail: 'Standard C++ Namespace',
        insertText: 'std::',
        range
      });

      return { suggestions };
    }
  });
}
