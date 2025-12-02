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

  // Define a custom dark/reversed theme
  try {
    monaco.editor.defineTheme('synta-dark', {
      base: 'vs-dark', // use dark base
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'f0c0c5', fontStyle: 'bold' },      // light pink
        { token: 'identifier', foreground: 'e6a0a5' },                      // softer pink
        { token: 'string', foreground: '34d399' },                          // green
        { token: 'number', foreground: 'f0c0f5', fontStyle: 'bold' },       // lighter purple/pink
        { token: 'comment', foreground: 'd7c2c2', fontStyle: 'italic' },    // muted
        { token: 'operator', foreground: 'fbbf24', fontStyle: 'bold' },     // yellowish
      ],
      colors: {
        'editor.background': '#2d1f23',             // dark background
        'editor.foreground': '#faf7f5',             // light text
        'editorLineNumber.foreground': '#d7c2c2',   // muted line numbers
        'editorLineNumber.activeForeground': '#f0c0c5', // active line number
        'editorCursor.foreground': '#f0c0c5',
        'editor.selectionBackground': '#4d2b32',    // darker selection
        'editor.inactiveSelectionBackground': '#33292b',
        'editor.lineHighlightBackground': '#33292b',
        'editor.lineHighlightBorder': '#4a3a3d',
        'editorWhitespace.foreground': '#4a3a3d',
        'editorIndentGuide.background': '#33292b',
        'editorIndentGuide.activeBackground': '#4a3a3d',
        'editorBracketMatch.background': '#4d2b32',
        'editorBracketMatch.border': '#f0c0c5',
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
        options={{ 
          minimap: { enabled: false }, 
          fontSize: 14, 
          fontFamily: "Inter, ui-monospace, monospace",
          lineHeight: 24,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
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