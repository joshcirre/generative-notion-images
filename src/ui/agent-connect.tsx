import { useEffect, useRef, useState } from 'react'

const MCP_URL = 'https://notion-images-api.laravel.cloud/mcp/notion-images'
const CODEX_COMMAND = `codex mcp add notion-images --url ${MCP_URL}`
const CLAUDE_COMMAND = `claude mcp add --transport http --scope user notion-images ${MCP_URL}`
const AGENT_PROMPT = `Connect the public Notion Images MCP server at ${MCP_URL} using Streamable HTTP with no authentication. Name it “notion-images”. Then use generate-notion-image to create isometric Notion covers or icons from my prompts, images, audio, or block letters.`

type ConnectView = 'chatgpt' | 'claude' | 'cli'

const connectionViews: Array<{ value: ConnectView; label: string }> = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'cli', label: 'Coding CLI' },
]

export function AgentConnectDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<ConnectView>('chatgpt')

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])

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
              <h2 id="agent-dialog-title" className="font-pixel text-sm tracking-[0.1em] text-ink uppercase sm:text-base">
                Connect Notion Images
              </h2>
              <p className="mt-1 max-w-xl font-device text-[10px] leading-relaxed text-muted sm:text-[11px]">
                Add the generator to the agent you already use, then ask it for an image.
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
            <div className="grid grid-cols-3 gap-px border border-sand-7 bg-sand-6" role="tablist" aria-label="Connection method">
              {connectionViews.map(({ value, label }) => (
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

            {view === 'chatgpt' && <ChatGptInstructions />}
            {view === 'claude' && <ClaudeInstructions />}
            {view === 'cli' && <CliInstructions />}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-sand-7 px-4 py-3 font-device text-[9px] text-muted sm:px-5">
            <span>ONE PUBLIC TOOL · PNG + SVG</span>
            <a
              href="https://github.com/joshcirre/generative-notion-images/blob/main/api/README.md"
              target="_blank"
              rel="noreferrer"
              className="text-ink hover:text-primary"
            >
              FULL DOCUMENTATION ↗
            </a>
          </footer>
        </div>
      </div>
    </dialog>
  )
}

function ChatGptInstructions() {
  return (
    <section className="mt-3 border border-sand-7 bg-white">
      <InstructionHeader step="01" title="Create a custom app" />
      <ol className="space-y-3 p-4 font-device text-[10px] leading-relaxed text-muted sm:text-[11px]">
        <li><StepNumber>1</StepNumber>In ChatGPT settings, open <strong className="text-ink">Apps → Create</strong>. Enable Developer mode first if prompted.</li>
        <li><StepNumber>2</StepNumber>Enter these connection details:</li>
      </ol>
      <div className="mx-4 mb-4 grid border border-sand-7 sm:grid-cols-[120px_1fr]">
        <Field label="Name" value="Notion Images" />
        <Field label="Description" value="Generate isometric Notion covers and icons" />
        <Field label="Server URL" value={MCP_URL} copy />
        <Field label="Authentication" value="No Auth" />
      </div>
      <p className="border-t border-dashed border-sand-7 px-4 py-3 font-device text-[10px] leading-relaxed text-muted sm:text-[11px]">
        <StepNumber>3</StepNumber>Accept the custom MCP warning, scan the tools, and select <strong className="text-ink">Create</strong>.
      </p>
    </section>
  )
}

function ClaudeInstructions() {
  return (
    <section className="mt-3 border border-sand-7 bg-white">
      <InstructionHeader step="01" title="Add a custom connector" />
      <ol className="space-y-3 p-4 font-device text-[10px] leading-relaxed text-muted sm:text-[11px]">
        <li><StepNumber>1</StepNumber>In Claude, open <strong className="text-ink">Customize → Connectors</strong>.</li>
        <li><StepNumber>2</StepNumber>Select <strong className="text-ink">+ → Add custom connector</strong>, name it <strong className="text-ink">Notion Images</strong>, and paste this URL:</li>
      </ol>
      <CodeSnippet label="Remote MCP URL" value={MCP_URL} />
      <p className="border-t border-dashed border-sand-7 px-4 py-3 font-device text-[10px] leading-relaxed text-muted sm:text-[11px]">
        <StepNumber>3</StepNumber>Select <strong className="text-ink">Add</strong>. No OAuth or API key is required.
      </p>
      <div className="border-t border-sand-7 bg-sand-2 px-4 py-3">
        <p className="mb-2 font-pixel text-[8px] tracking-[0.14em] text-muted uppercase">Claude Code instead?</p>
        <CodeSnippet label="Terminal" value={CLAUDE_COMMAND} inset={false} />
      </div>
    </section>
  )
}

function CliInstructions() {
  return (
    <section className="mt-3 border border-sand-7 bg-white">
      <InstructionHeader step="01" title="Connect from your terminal" />
      <div className="space-y-4 p-4">
        <div>
          <p className="mb-2 font-pixel text-[8px] tracking-[0.14em] text-muted uppercase">Codex CLI</p>
          <CodeSnippet label="Terminal" value={CODEX_COMMAND} inset={false} />
        </div>
        <div>
          <p className="mb-2 font-pixel text-[8px] tracking-[0.14em] text-muted uppercase">Any coding agent</p>
          <CodeSnippet label="Paste this prompt" value={AGENT_PROMPT} inset={false} />
        </div>
      </div>
      <p className="border-t border-dashed border-sand-7 px-4 py-3 font-device text-[10px] leading-relaxed text-muted sm:text-[11px]">
        Then ask: <strong className="text-ink">“Create a blue isometric Notion cover that says PLATFORM.”</strong>
      </p>
    </section>
  )
}

function InstructionHeader({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-sand-7 bg-sand-2 px-4 py-3">
      <span className="font-pixel text-[9px] text-primary">{step}</span>
      <h3 className="font-pixel text-[9px] tracking-[0.14em] text-ink uppercase">{title}</h3>
    </div>
  )
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return <span className="mr-2 inline-grid size-5 place-items-center border border-sand-7 bg-sand-2 font-pixel text-[8px] text-primary">{children}</span>
}

function Field({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  return (
    <>
      <div className="border-b border-sand-7 bg-sand-2 px-3 py-2 font-pixel text-[8px] tracking-wide text-muted uppercase sm:border-r">{label}</div>
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-sand-7 px-3 py-2 font-device text-[10px] text-ink">
        <span className="min-w-0 break-all">{value}</span>
        {copy && <CopySnippet value={value} dark={false} />}
      </div>
    </>
  )
}

function CodeSnippet({ label, value, inset = true }: { label: string; value: string; inset?: boolean }) {
  return (
    <div className={`${inset ? 'mx-4 mb-4' : ''} border border-[#34312a] bg-[#171612] text-sand-3`}>
      <div className="flex items-center justify-between border-b border-white/15 px-3 py-2">
        <span className="font-pixel text-[8px] tracking-[0.14em] text-sand-8 uppercase">{label}</span>
        <CopySnippet value={value} />
      </div>
      <pre className="overflow-auto whitespace-pre-wrap break-words p-3 font-device text-[10px] leading-relaxed text-sand-3 sm:text-[11px]">{value}</pre>
    </div>
  )
}

function CopySnippet({ value, dark = true }: { value: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className={`shrink-0 border px-2 py-1 font-device text-[9px] tracking-wide uppercase transition-colors ${
        dark
          ? 'border-white/25 text-white hover:border-primary hover:bg-primary'
          : 'border-sand-7 text-muted hover:border-primary hover:bg-primary hover:text-white'
      }`}
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
