import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import type {
  LearningSessionAction,
  LearningSessionState,
  Rating,
} from "./session";

interface FloatingBarProps {
  state: LearningSessionState;
  dispatch: React.Dispatch<LearningSessionAction>;
  onSpeak: () => void;
  showKeyboardHints?: boolean;
  aiConfigured: boolean;
  onAskAi: (prompt: string) => Promise<string>;
  onOpenReader?: () => void;
  reader?: {
    page: number;
    totalPages: number;
    canPrevious: boolean;
    canNext: boolean;
    hidden: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onJump: (page: number) => void;
    onToggleHidden: () => void;
    onSwitchToWords: () => void;
  };
}

interface Position {
  x: number;
  y: number;
}

export function FloatingBar({
  state,
  dispatch,
  onSpeak,
  showKeyboardHints = true,
  aiConfigured,
  onAskAi,
  onOpenReader,
  reader,
}: FloatingBarProps) {
  const [position, setPosition] = useState<Position>(() => ({
    x: Math.max(20, window.innerWidth / 2 - 310),
    y: (window.innerHeight <= 760 ? 120 : 160) + 12,
  }));
  const dragOffset = useRef<Position | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiError, setAiError] = useState("");
  const [askingAi, setAskingAi] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [readerPageInput, setReaderPageInput] = useState("1");

  useEffect(() => {
    if (reader) setReaderPageInput(String(reader.page));
  }, [reader?.page]);

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragOffset.current) return;
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - 80, event.clientX - dragOffset.current.x)),
      y: Math.max(8, Math.min(window.innerHeight - 56, event.clientY - dragOffset.current.y)),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragOffset.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const grade = (rating: Rating) => dispatch({ type: "GRADE", rating });
  const canGrade = state.phase === "revealed" && !state.hidden;
  const label = (text: string, shortcut: string) =>
    showKeyboardHints ? `${text} ${shortcut}` : text;

  const submitAi = async (event: FormEvent) => {
    event.preventDefault();
    if (!aiPrompt.trim() || askingAi) return;
    setShowAiPanel(true); setAskingAi(true); setAiError("");
    try { setAiAnswer(await onAskAi(aiPrompt)); }
    catch (cause) {
      setAiAnswer("");
      setAiError(cause instanceof Error ? cause.message : "AI 请求失败，请稍后重试");
    } finally { setAskingAi(false); }
  };

  const jumpToReaderPage = () => {
    if (!reader) return;
    if (!readerPageInput.trim()) {
      setReaderPageInput(String(reader.page));
      return;
    }
    const page = Number(readerPageInput);
    if (Number.isFinite(page)) {
      const normalized = Math.min(reader.totalPages, Math.max(1, Math.round(page)));
      setReaderPageInput(String(normalized));
      reader.onJump(normalized);
    }
  };

  return (
    <aside
      className="floating-bar"
      style={{ left: position.x, top: position.y }}
      aria-label="学习操作栏"
    >
      {showAiPanel && (
        <section className="ai-popover" aria-live="polite">
          <header><b>AI 助手</b><button type="button" aria-label="关闭 AI 回答" onClick={() => setShowAiPanel(false)}>×</button></header>
          <div className={aiError ? "ai-response is-error" : "ai-response"}>
            {askingAi ? "正在思考…" : aiError || aiAnswer || "输入问题后，回答会显示在这里。"}
          </div>
        </section>
      )}
      <button
        className="drag-handle"
        aria-label="拖动操作栏"
        title="拖动操作栏"
        onPointerDown={beginDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
      >
        ⋮⋮
      </button>
      {reader ? (
        <>
          <button onClick={reader.onToggleHidden}>{reader.hidden ? label("恢复", "H") : label("隐藏", "H")}</button>
          <button onClick={reader.onSwitchToWords}>背词</button>
          <button onClick={reader.onPrevious} disabled={!reader.canPrevious}>{label("上一页", "←")}</button>
          <span className="reader-page-jump">
            <input aria-label="小说页码" inputMode="numeric" value={readerPageInput}
              onChange={(event) => setReaderPageInput(event.target.value.replace(/\D/g, ""))}
              onBlur={jumpToReaderPage}
              onKeyDown={(event) => { if (event.key === "Enter") jumpToReaderPage(); }} />
            <span>/ {reader.totalPages}</span>
          </span>
          <button className="primary-action" onClick={reader.onNext} disabled={!reader.canNext}>{label("下一页", "→")}</button>
        </>
      ) : state.phase === "editingMnemonic" ? (
        <>
          <button onClick={() => dispatch({ type: "CANCEL_MNEMONIC_EDIT" })}>{label("取消", "Esc")}</button>
          <button className="primary-action" onClick={() => dispatch({ type: "SAVE_MNEMONIC" })}>
            {label("保存", "⌘↵")}
          </button>
        </>
      ) : (
        <>
          <button onClick={onSpeak} disabled={state.hidden}>{label("发音", "P")}</button>
          <button onClick={() => dispatch({ type: "TOGGLE_ANSWER" })} disabled={state.hidden}>
            {state.phase === "recall" ? label("答案", "Space") : label("隐藏", "Space")}
          </button>
          <button onClick={() => grade("again")} disabled={!canGrade}>{label("忘记", "1")}</button>
          <button onClick={() => grade("hard")} disabled={!canGrade}>{label("模糊", "2")}</button>
          <button onClick={() => grade("good")} disabled={!canGrade}>{label("认识", "3")}</button>
          <button
            onClick={() => dispatch({ type: "START_MNEMONIC_EDIT" })}
            disabled={!canGrade}
          >
            {label("助记", "E")}
          </button>
          <button onClick={() => dispatch({ type: "TOGGLE_HIDDEN" })}>
            {state.hidden ? label("恢复", "H") : label("隐藏", "H")}
          </button>
          {onOpenReader && <button onClick={onOpenReader}>小说</button>}
        </>
      )}
      <form className="floating-ai-form" onSubmit={submitAi}>
        <input value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)}
          onFocus={() => aiAnswer && setShowAiPanel(true)}
          placeholder={aiConfigured ? "问 AI…" : "先在“我的”配置 AI"} aria-label="向 AI 提问" />
        <button type="submit" disabled={!aiPrompt.trim() || askingAi}>发送</button>
      </form>
    </aside>
  );
}
