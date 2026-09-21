import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  Clipboard,
  Clock3,
  FileCode2,
  Keyboard,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Timer,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
// The workspace package's checked-in declaration cache predates the compile endpoint.
// The runtime export is generated and available from the package source.
// @ts-expect-error CompileCpp is present in the generated runtime module.
import { useCompileCpp } from '@workspace/api-client-react';

type CompileCppResult = {
  status: 'success' | 'compile_error' | 'runtime_error' | 'timeout';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
};

type EditorTab = 'source' | 'stdin';
type OutputTab = 'stdout' | 'stderr' | 'diagnostics';

const STARTERS = {
  hello: {
    label: 'Hello, world',
    detail: 'The first compile',
    source: `#include <iostream>

int main() {
  std::cout << "Hello, compiler!" << std::endl;
  return 0;
}`,
    stdin: '',
  },
  sum: {
    label: 'Sum a list',
    detail: 'Read input, produce output',
    source: `#include <iostream>

int main() {
  int count;
  std::cin >> count;

  int total = 0;
  for (int i = 0; i < count; ++i) {
    int value;
    std::cin >> value;
    total += value;
  }

  std::cout << total << std::endl;
}`,
    stdin: '5\n4 8 15 16 23',
  },
  palindrome: {
    label: 'Palindrome check',
    detail: 'A small interview pattern',
    source: `#include <iostream>
#include <string>

int main() {
  std::string word;
  std::cin >> word;

  bool isPalindrome = true;
  for (int left = 0, right = word.size() - 1; left < right; ++left, --right) {
    if (word[left] != word[right]) {
      isPalindrome = false;
      break;
    }
  }

  std::cout << (isPalindrome ? "yes" : "no") << std::endl;
}`,
    stdin: 'racecar',
  },
} as const;

const DEFAULT_SOURCE = STARTERS.hello.source;

function formatDuration(durationMs: number) {
  return durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(2)} s`;
}

function StatusMark({ status }: { status: CompileCppResult['status'] }) {
  if (status === 'success') return <CircleCheck className="h-4 w-4" />;
  if (status === 'timeout') return <Timer className="h-4 w-4" />;
  if (status === 'runtime_error') return <XCircle className="h-4 w-4" />;
  return <TriangleAlert className="h-4 w-4" />;
}

function resultLabel(status: CompileCppResult['status']) {
  if (status === 'success') return 'Run completed';
  if (status === 'compile_error') return 'Compilation failed';
  if (status === 'runtime_error') return 'Runtime error';
  return 'Execution timed out';
}

export default function Home() {
  const [source, setSource] = useState<string>(DEFAULT_SOURCE);
  const [stdin, setStdin] = useState('');
  const [editorTab, setEditorTab] = useState<EditorTab>('source');
  const [outputTab, setOutputTab] = useState<OutputTab>('stdout');
  const [result, setResult] = useState<CompileCppResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<keyof typeof STARTERS>('hello');
  const [copied, setCopied] = useState(false);
  const compile = useCompileCpp();

  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(1, source.split('\n').length) }, (_, index) => index + 1),
    [source],
  );

  const visibleOutput = result
    ? outputTab === 'stdout'
      ? result.stdout
      : outputTab === 'stderr'
        ? result.stderr
        : result.stderr
    : '';

  const loadExample = (example: keyof typeof STARTERS) => {
    setSelectedExample(example);
    setSource(STARTERS[example].source);
    setStdin(STARTERS[example].stdin);
    setEditorTab('source');
    setResult(null);
    setRequestError(null);
  };

  const resetWorkspace = () => {
    setSource(DEFAULT_SOURCE);
    setStdin('');
    setSelectedExample('hello');
    setEditorTab('source');
    setOutputTab('stdout');
    setResult(null);
    setRequestError(null);
  };

  const runCode = () => {
    if (!source.trim() || compile.isPending) return;
    setRequestError(null);
    setResult(null);
    setOutputTab('stdout');
    compile.mutate(
      { data: { source, stdin: stdin || undefined } },
      {
        onSuccess: (nextResult: CompileCppResult) => {
          setResult(nextResult);
          setOutputTab(nextResult.status === 'success' ? 'stdout' : 'diagnostics');
        },
        onError: (error: unknown) => {
          setRequestError(error instanceof Error ? error.message : 'The compiler could not be reached.');
        },
      },
    );
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = editorTab === 'source' ? source : stdin;
      const nextValue = `${value.substring(0, start)}  ${value.substring(end)}`;
      if (editorTab === 'source') setSource(nextValue);
      else setStdin(nextValue);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runCode();
    }
  };

  const copyOutput = async () => {
    if (!visibleOutput) return;
    await navigator.clipboard?.writeText(visibleOutput);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="app-shell">
      <div className="content-layer">
        <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
          <div className="mx-auto flex min-h-[68px] max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[3px_3px_0_hsl(221_38%_10%)]">
                <Terminal className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[17px] font-extrabold tracking-[-0.04em]">compile/desk</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--primary))]">C++17</span>
                </div>
                <p className="hidden text-[11px] text-[hsl(var(--secondary-foreground)/.62)] sm:block">A quiet place to make the compiler talk.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--secondary-foreground)/.7)]">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_0_3px_hsl(var(--accent)/.18)]" />
              <span className="hidden sm:inline">sandbox ready</span>
              <span className="sm:hidden">ready</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="reveal max-w-2xl">
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
                <span className="h-px w-7 bg-[hsl(var(--accent))]" />
                browser compiler
              </div>
              <h1 className="text-[clamp(2rem,4vw,3.45rem)] font-extrabold leading-[.98] tracking-[-0.065em] text-[hsl(var(--foreground))]">
                Write it. Run it.
                <span className="block text-[hsl(var(--muted-foreground))]">Trust the feedback.</span>
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-6 text-[hsl(var(--muted-foreground))]">
                A focused C++ desk for first programs, sharp interview practice, and everything in between. No setup. Just an honest compiler.
              </p>
            </div>
            <div className="reveal reveal-delay-1 flex shrink-0 items-center gap-2">
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] sm:inline">Unsaved workspace</span>
              <button
                type="button"
                onClick={resetWorkspace}
                data-testid="button-reset-workspace"
                className="group inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-[12px] font-bold text-[hsl(var(--foreground))] transition-transform hover:-translate-y-0.5 hover:border-[hsl(var(--foreground)/.3)] active:translate-y-0"
              >
                <RotateCcw className="h-3.5 w-3.5 transition-transform group-hover:-rotate-45" />
                Reset workspace
              </button>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
            <section className="reveal reveal-delay-1 min-w-0 overflow-hidden rounded-2xl border border-[hsl(221_32%_24%)] bg-[hsl(221_35%_14%)] shadow-[0_16px_45px_hsl(221_38%_16%/.12)]" aria-label="C++ code editor">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(221_26%_24%)] px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(5_72%_53%)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(48_96%_53%)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
                  <span className="ml-2 font-mono text-[10px] text-[hsl(44_42%_94%/.5)]">main.cpp</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[hsl(44_42%_94%/.5)]">
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span>GNU++17</span>
                  <span className="text-[hsl(44_42%_94%/.25)]">/</span>
                  <span>{source.length.toLocaleString()} chars</span>
                </div>
              </div>
              <div className="flex border-b border-[hsl(221_26%_24%)] px-3 sm:px-4">
                {(['source', 'stdin'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEditorTab(tab)}
                    data-testid={`button-editor-tab-${tab}`}
                    className={`relative mr-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${editorTab === tab ? 'text-[hsl(var(--primary))]' : 'text-[hsl(44_42%_94%/.48)] hover:text-[hsl(44_42%_94%/.8)]'}`}
                  >
                    {tab === 'source' ? 'source' : 'stdin'}
                    {tab === 'stdin' && <span className="ml-1.5 text-[hsl(44_42%_94%/.32)]">optional</span>}
                    {editorTab === tab && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[hsl(var(--primary))]" />}
                  </button>
                ))}
              </div>
              <div className="flex min-h-[390px] bg-[hsl(221_35%_14%)] sm:min-h-[470px]">
                <div className="editor-gutter w-11 shrink-0 select-none overflow-hidden border-r border-[hsl(221_26%_24%/.7)] px-3 py-5 text-right font-mono text-[12px] leading-[1.7] text-[hsl(44_42%_94%/.24)] sm:w-14 sm:px-4 sm:text-[13px]">
                  {lineNumbers.map((line) => <div key={line}>{line}</div>)}
                </div>
                <textarea
                  value={editorTab === 'source' ? source : stdin}
                  onChange={(event) => editorTab === 'source' ? setSource(event.target.value) : setStdin(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  spellCheck={false}
                  data-testid={`textarea-${editorTab}`}
                  aria-label={editorTab === 'source' ? 'C++17 source code' : 'Standard input'}
                  placeholder={editorTab === 'source' ? 'Start writing C++17…' : 'Optional input passed to your program…'}
                  className="editor-textarea min-h-[390px] min-w-0 flex-1 resize-none border-0 bg-transparent px-4 py-5 font-mono text-[12px] leading-[1.7] text-[hsl(44_42%_94%)] outline-none placeholder:text-[hsl(44_42%_94%/.25)] focus:ring-0 sm:min-h-[470px] sm:px-5 sm:text-[13px]"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(221_26%_24%)] px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2 font-mono text-[10px] text-[hsl(44_42%_94%/.42)]">
                  <Keyboard className="h-3.5 w-3.5" />
                  <span>⌘ / Ctrl + Enter to run</span>
                </div>
                <button
                  type="button"
                  onClick={runCode}
                  disabled={compile.isPending || !source.trim()}
                  data-testid="button-run-code"
                  className="group inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-extrabold text-[hsl(var(--primary-foreground))] shadow-[3px_3px_0_hsl(44_42%_94%/.12)] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_hsl(44_42%_94%/.12)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {compile.isPending ? <span className="loading-spin h-3.5 w-3.5 rounded-full border-2 border-[hsl(var(--primary-foreground)/.35)] border-t-[hsl(var(--primary-foreground))]" /> : <Play className="h-3.5 w-3.5 fill-current transition-transform group-hover:translate-x-0.5" />}
                  {compile.isPending ? 'Compiling…' : 'Run code'}
                </button>
              </div>
            </section>

            <aside className="reveal reveal-delay-2 flex flex-col gap-5">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_12px_30px_hsl(221_38%_16%/.06)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--accent))]">Start somewhere</p>
                    <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.04em]">Starter examples</h2>
                  </div>
                  <BookOpen className="h-5 w-5 text-[hsl(var(--muted-foreground)/.55)]" />
                </div>
                <div className="space-y-2">
                  {(Object.keys(STARTERS) as Array<keyof typeof STARTERS>).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => loadExample(key)}
                      data-testid={`button-load-example-${key}`}
                      className={`group flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5 ${selectedExample === key ? 'border-[hsl(var(--accent)/.55)] bg-[hsl(var(--accent)/.09)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--background)/.42)] hover:border-[hsl(var(--accent)/.4)]'}`}
                    >
                      <span>
                        <span className="block text-[12px] font-bold">{STARTERS[key].label}</span>
                        <span className="mt-0.5 block text-[11px] text-[hsl(var(--muted-foreground))]">{STARTERS[key].detail}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 -rotate-90 transition-transform ${selectedExample === key ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground)/.45)] group-hover:translate-x-0.5'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <h2 className="text-[13px] font-extrabold">The contract</h2>
                </div>
                <div className="space-y-3 text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">
                  <p><span className="font-mono text-[hsl(var(--foreground))]">source</span> is compiled as C++17 in an isolated workspace.</p>
                  <p><span className="font-mono text-[hsl(var(--foreground))]">stdin</span> is optional input, sent exactly as written.</p>
                  <p>Every run returns output, diagnostics, exit code, and duration.</p>
                </div>
              </div>
            </aside>
          </div>

          <section className="reveal reveal-delay-3 mt-5 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_12px_30px_hsl(221_38%_16%/.05)]" aria-label="Compiler output">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-extrabold tracking-[-0.02em]">Run output</h2>
                  <p className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">feedback appears here</p>
                </div>
              </div>
              {result && (
                <div className="flex items-center gap-3">
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium ${result.status === 'success' ? 'bg-[hsl(var(--accent)/.12)] text-[hsl(181_64%_32%)]' : 'bg-[hsl(var(--destructive)/.11)] text-[hsl(var(--destructive))]'}`} data-testid="status-compile-result">
                    <StatusMark status={result.status} />
                    {resultLabel(result.status)}
                  </div>
                  <span className="hidden items-center gap-1 font-mono text-[10px] text-[hsl(var(--muted-foreground))] sm:inline-flex" data-testid="text-duration">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDuration(result.durationMs)}
                  </span>
                </div>
              )}
            </div>
            {result ? (
              <>
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 sm:px-5">
                  <div className="flex gap-5">
                    {(['stdout', 'stderr', 'diagnostics'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setOutputTab(tab)}
                        data-testid={`button-output-tab-${tab}`}
                        className={`relative py-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${outputTab === tab ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground)/.65)] hover:text-[hsl(var(--foreground))]'}`}
                      >
                        {tab}
                        {tab === 'stderr' && result.stderr && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--destructive))]" />}
                        {outputTab === tab && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[hsl(var(--accent))]" />}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={copyOutput}
                    disabled={!visibleOutput}
                    data-testid="button-copy-output"
                    className="inline-flex items-center gap-1.5 py-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> : <Clipboard className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className={`min-h-[142px] whitespace-pre-wrap break-words px-4 py-5 font-mono text-[12px] leading-6 sm:px-5 ${outputTab === 'stderr' || outputTab === 'diagnostics' ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`} data-testid={`output-${outputTab}`}>
                  {outputTab === 'diagnostics' && result.status === 'success' ? (
                    <div className="flex items-start gap-3 text-[hsl(var(--muted-foreground))]">
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                      <span>Compiled cleanly and exited with code {result.exitCode ?? 0}.</span>
                    </div>
                  ) : visibleOutput ? visibleOutput : <span className="text-[hsl(var(--muted-foreground)/.6)]">No output on this stream.</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--background)/.42)] px-4 py-3 font-mono text-[10px] text-[hsl(var(--muted-foreground))] sm:px-5">
                  <span data-testid="text-exit-code">exit code: <b className="text-[hsl(var(--foreground))]">{result.exitCode === null ? '—' : result.exitCode}</b></span>
                  <span>duration: <b className="text-[hsl(var(--foreground))]">{formatDuration(result.durationMs)}</b></span>
                  <span className="ml-auto">status: <b className="text-[hsl(var(--foreground))]">{result.status}</b></span>
                </div>
              </>
            ) : requestError ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center px-5 py-10 text-center" data-testid="status-request-error">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <h3 className="text-[14px] font-extrabold">The compiler is unavailable</h3>
                <p className="mt-1 max-w-sm text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">{requestError}</p>
                <button type="button" onClick={runCode} data-testid="button-retry-run" className="mt-4 rounded-lg bg-[hsl(var(--secondary))] px-3 py-2 text-[11px] font-bold text-[hsl(var(--secondary-foreground))] transition-transform hover:-translate-y-0.5">Try again</button>
              </div>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center px-5 py-10 text-center" data-testid="status-output-empty">
                <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
                  <Terminal className="h-5 w-5" />
                  <span className="status-pulse absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
                </div>
                <h3 className="text-[14px] font-extrabold">Nothing has run yet</h3>
                <p className="mt-1 max-w-xs text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">Make a change, then run your code to see exactly what the compiler thinks.</p>
              </div>
            )}
          </section>
        </main>
        <footer className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 pb-7 font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>compile/desk · feedback without the detour</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /> isolated execution</span>
        </footer>
      </div>
    </div>
  );
}