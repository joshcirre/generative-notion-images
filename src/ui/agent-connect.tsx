import { useEffect, useMemo, useRef, useState } from 'react'

const API_ORIGIN = 'https://generative-notion-images-api-production-rz9lym.laravel.cloud'
const MCP_URL = `${API_ORIGIN}/mcp/notion-images`
const REST_URL = `${API_ORIGIN}/api/renders`

type ConnectView = 'mcp' | 'rest' | 'agent'

export function AgentConnectDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<ConnectView>('mcp')

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])

  const snippet = useMemo(() => {
    if (view === 'rest') {
      return `curl --request POST ${REST_URL} \\
  --header "Authorization: Bearer \$NOTION_IMAGES_API_TOKEN" \\
  --header "Content-Type: application/json" \\
  --output notion-cover.png \\
  --data '{
    "text": "PLATFORM",
    "layout": "header",
    "background": "both",
    "palette_preset": "ocean",
    "seed": 42
  }'`
    }

    if (view === 'agent') {
      return `Connect to the Notion Images remote MCP server.

Server URL: ${MCP_URL}
Transport: Streamable HTTP
Authentication: Authorization: Bearer <AGENT_API_TOKEN>
Tool: generate-notion-image

Use the tool to generate reproducible isometric Notion covers and icons. Start with a letters layout and a sparse background pattern. Return the generated PNG or SVG to me.`
    }

    return `Remote MCP server
${MCP_URL}

Authorization header
Bearer <AGENT_API_TOKEN>

Available tool
generate-notion-image`
  }, [view])

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="agent-dialog m-auto w-[min(720px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden border-0 bg-transparent p-0 text-ink"
      aria-labelledby="agent-dialog-title"
    >
      <div className="relative overflow-hidden rounded-xl border border-sand-7 bg-chassis shadow-[0_24px_80px_rgba(20,18,15,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-black/5" />
        <div className="relative flex max-h-[calc(100dvh-24px)] flex-col">
          <header className="flex items-start gap-4 border-b border-dashed border-sand-7 px-4 py-3 sm:px-5 sm:py-4">
            <div className="mt-0.5 grid size-10 shrink-0 place-items-center border border-primary bg-primary font-pixel text-[13px] text-white shadow-[3px_3px_0_#c42602]">
              IO
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 font-device text-[9px] tracking-[0.18em] text-muted uppercase">
                <span className="size-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Remote renderer online
              </div>
              <h2 id="agent-dialog-title" className="font-pixel text-sm tracking-[0.1em] text-ink uppercase sm:text-base">
                Connect an agent
              </h2>
              <p className="mt-1 max-w-xl font-device text-[10px] leading-relaxed text-muted sm:text-[11px]">
                Generate the same isometric artwork programmatically through Laravel MCP or the REST API.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close connection instructions"
              className="grid size-8 shrink-0 place-items-center border border-sand-7 bg-white font-device text-sm text-muted transition-colors hover:border-primary hover:text-primary"
            >
              ×
            </button>
          </header>

          <div className="overflow-y-auto overscroll-contain p-4 sm:p-5">
            <div className="mb-4 grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 border border-sand-7 bg-white px-3 py-2 font-device text-[8px] tracking-wide text-muted uppercase sm:text-[9px]">
              <span className="text-ink">Agent</span><span className="h-px bg-sand-6" />
              <span className="text-primary">Laravel MCP</span><span className="h-px bg-sand-6" />
              <span className="text-ink">PNG / SVG</span>
            </div>

            <div className="grid grid-cols-3 gap-px border border-sand-7 bg-sand-6" role="tablist" aria-label="Connection method">
              {([
                ['mcp', 'MCP'],
                ['rest', 'REST API'],
                ['agent', 'Agent prompt'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={view === value}
                  onClick={() => setView(value)}
                  className={`px-2 py-2 font-device text-[10px] tracking-wide uppercase transition-colors ${
                    view === value ? 'bg-primary text-white' : 'bg-white text-muted hover:bg-sand-3'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <section className="mt-3 border border-sand-7 bg-[#171612] text-sand-3">
              <div className="flex items-center justify-between border-b border-white/15 px-3 py-2">
                <span className="font-pixel text-[9px] tracking-[0.16em] text-sand-8 uppercase">
                  {view === 'mcp' ? 'Connection manifest' : view === 'rest' ? 'Terminal request' : 'Paste into your agent'}
                </span>
                <CopySnippet value={snippet} />
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 font-device text-[10px] leading-relaxed text-sand-3 sm:p-4 sm:text-[11px]">
                {snippet}
              </pre>
            </section>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border-l-2 border-primary bg-white px-3 py-2">
                <h3 className="font-pixel text-[9px] tracking-wide text-ink uppercase">Keep the token private</h3>
                <p className="mt-1 font-device text-[10px] leading-relaxed text-muted">
                  Copy <code>AGENT_API_TOKEN</code> from the Laravel API environment into your agent&rsquo;s secret store. It is intentionally never embedded here.
                </p>
              </div>
              <div className="border-l-2 border-ink bg-white px-3 py-2">
                <h3 className="font-pixel text-[9px] tracking-wide text-ink uppercase">One tool, full renderer</h3>
                <p className="mt-1 font-device text-[10px] leading-relaxed text-muted">
                  <code>generate-notion-image</code> returns image content directly, so a database and storage bucket are not required.
                </p>
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-sand-7 px-4 py-3 font-device text-[9px] text-muted sm:px-5">
            <span>API STATUS / AUTHENTICATED</span>
            <a
              href="https://github.com/joshcirre/generative-notion-images/blob/main/api/README.md"
              target="_blank"
              rel="noreferrer"
              className="text-ink hover:text-primary"
            >
              FULL API DOCUMENTATION ↗
            </a>
          </footer>
        </div>
      </div>
    </dialog>
  )
}

function CopySnippet({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className="border border-white/25 px-2 py-1 font-device text-[9px] tracking-wide text-white uppercase transition-colors hover:border-primary hover:bg-primary"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1400)
        })
      }}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  )
}
