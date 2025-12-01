import React, { useEffect, useRef } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditor, IDisposable } from 'monaco-editor'
import { TokenDTO } from '../types'

type Props = {
  code: string
  setCode: (c: string) => void
  tokens?: TokenDTO[]
  onRun?: () => void
}

export default function EditorPane({ code, setCode, tokens = [], onRun }: Props) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    // Define a custom dark theme and apply it
    try {
      monaco.editor.defineTheme('synta-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#071022',
          'editor.foreground': '#E6EEF8',
          'editorLineNumber.foreground': '#4b5563',
          'editorCursor.foreground': '#7c3aed',
        },
      })
      monaco.editor.setTheme('synta-dark')
    } catch (e) {
      // ignore theme errors
    }

    // Ctrl/Cmd+Enter to run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun?.()
    })
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    // Convert tokens to Monaco inline decorations
    const newDecorations: MonacoEditor.IModelDeltaDecoration[] = tokens
      .filter(t => {
        if (!t.lexeme || t.line <= 0) return false
        const tt = (t.type || '').toUpperCase()
        // Ignore standalone NEWLINE tokens (we only care about newlines inside strings)
        if (tt === 'NEWLINE') return false
        if (t.lexeme === '\\n' || t.lexeme === '\n') return false
        return true
      })
      .map(t => {
        const startLine = t.line
        const startCol = Math.max(1, t.column)
        const endCol = startCol + Math.max(1, t.lexeme.length)
        const className = mapTokenTypeToClass(t.type)
        return {
          // store as simple numeric range first; will convert to monaco.Range when monaco is available
          range: { startLineNumber: startLine, startColumn: startCol, endLineNumber: startLine, endColumn: endCol } as any,
          options: { inlineClassName: className }
        }
      })

    // Apply decorations
    try {
      const monaco = monacoRef.current || (window as any).monaco
      if (monaco) {
        // use monaco.Range from the instance
        // @ts-ignore
        newDecorations.forEach(d => { d.range = new monaco.Range(d.range.startLineNumber, d.range.startColumn, d.range.endLineNumber, d.range.endColumn) })
      }
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
    } catch (e) {
      // ignore if monaco not ready
    }
  }, [tokens])

  useEffect(() => {
    return () => {}
  }, [])

  return (
    <div className="editorContainer" style={{ height: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        value={code}
        onChange={(value) => setCode(value ?? '')}
        options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "Inter, ui-sans-serif" }}
        onMount={handleMount}
      />
    </div>
  )
}

function mapTokenTypeToClass(type: string) {
  const keywords = new Set([
    'IF','ELIF','ELSE','WHILE','MATCH','RETURN','AWAIT','BREAK','CONTINUE','BIND','CONST','CRAFT','USE','AS','FROM','FN','STRUCT',
    'TRY','CATCH','RAISE','TYPE','CAST','ANY','NONE','TRAIT','INT_TYPE','FLOAT_TYPE','CHAR_TYPE','BOOL_TYPE','STR_TYPE','ASYNC'
  ])
  const t = type.toUpperCase()
  if (keywords.has(t) || t === 'AT_AGENT' || t === 'AT_TASK') return 'tok-keyword'
  if (t === 'STRING') return 'tok-string'
  if (t === 'INTEGER' || t === 'FLOAT') return 'tok-number'
  if (t === 'COMMENT_LINE' || t === 'COMMENT_MULTI') return 'tok-comment'
  if (t === 'ILLEGAL') return 'tok-illegal'
  if (t === 'PLUS' || t === 'MINUS' || t === 'ARROW' || t.endsWith('_ASSIGN') || t === 'EQ' || t === 'NEQ') return 'tok-operator'
  return 'tok-identifier'
}
