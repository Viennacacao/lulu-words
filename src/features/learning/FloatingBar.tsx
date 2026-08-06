import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
}: FloatingBarProps) {
  const [position, setPosition] = useState<Position>(() => ({
    x: Math.max(20, window.innerWidth / 2 - 310),
    y: (window.innerHeight <= 760 ? 120 : 160) + 12,
  }));
  const dragOffset = useRef<Position | null>(null);

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

  return (
    <aside
      className="floating-bar"
      style={{ left: position.x, top: position.y }}
      aria-label="学习操作栏"
    >
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
      {state.phase === "editingMnemonic" ? (
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
        </>
      )}
    </aside>
  );
}
