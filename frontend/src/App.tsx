import React, { useState } from 'react'
import EditorPane from './components/EditorPane'
import OutputTable from './components/OutputTable'
import { analyzeCode } from './api'
import { TokenDTO } from './types'

function App() {
  const [code, setCode] = useState<string>('// type code here\n')
  const [tokens, setTokens] = useState<TokenDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setErr(null)
    try {
      const tok = await analyzeCode(code)
      setTokens(tok)
    } catch (e: any) {
      setErr(e.message || 'Analysis error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-grid">
      <div className="pane left">
        <div className="toolbar">
          <div className="flex">
            <button onClick={run} disabled={loading}>{loading ? 'Running...' : 'Run'}</button>
          </div>
          <div className="grow" />
          {err && <div className="err">{err}</div>}
        </div>
        <div className="editor">
          <EditorPane code={code} setCode={setCode} tokens={tokens} onRun={run} />
        </div>
      </div>
      <div className="pane right">
        <div className="outputContainer">
          <OutputTable tokens={tokens} />
        </div>
      </div>
    </div>
  )
}

export default App
