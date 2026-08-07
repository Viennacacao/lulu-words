import {
  getCurrentMnemonic,
  getCurrentWord,
  type LearningSessionAction,
  type LearningSessionState,
} from "./session";
import type { NovelReaderLine } from "../reader/novelReader";

interface LearningBlockProps {
  state: LearningSessionState;
  dispatch: React.Dispatch<LearningSessionAction>;
  novelLines?: NovelReaderLine[];
  camouflageLines: string[];
  readerHidden?: boolean;
}

function ConcealedRow() {
  return <span aria-hidden="true">&nbsp;</span>;
}

function CamouflageBlock({ lines, label }: { lines: string[]; label: string }) {
  return (
    <section className="learning-block learning-block--hidden" aria-label={label}>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index}>{lines[index] || <ConcealedRow />}</div>
      ))}
    </section>
  );
}

export function splitBilingualExample(example: string) {
  const explicitLines = example.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (explicitLines.length > 1) {
    return { example: explicitLines[0], translation: explicitLines.slice(1).join(" ") };
  }
  const value = explicitLines[0] ?? "";
  const chineseStart = value.search(/[\u3400-\u9fff]/);
  if (chineseStart > 3) {
    return { example: value.slice(0, chineseStart).trim(), translation: value.slice(chineseStart).trim() };
  }
  return { example: value, translation: "" };
}

export function LearningBlock({ state, dispatch, novelLines, camouflageLines, readerHidden = false }: LearningBlockProps) {
  if (novelLines && readerHidden) {
    return <CamouflageBlock lines={camouflageLines} label="小说阅读区已隐藏" />;
  }

  if (novelLines) {
    return (
      <section className="learning-block learning-block--reader" aria-label="小说阅读区">
        {Array.from({ length: 6 }, (_, index) => (
          <div className={`learning-row novel-reader-row${novelLines[index]?.firstInParagraph ? " is-paragraph-start" : ""}${novelLines[index]?.heading ? " is-heading" : ""}`} key={index}>
            {novelLines[index]?.text || <ConcealedRow />}
          </div>
        ))}
      </section>
    );
  }

  const word = getCurrentWord(state);
  const answerVisible = state.phase !== "recall";
  const bilingualExample = splitBilingualExample(word.example);

  if (state.hidden) {
    return <CamouflageBlock lines={camouflageLines} label="学习区已隐藏" />;
  }

  return (
    <section className="learning-block" aria-label="单词学习区">
      <div className="learning-row learning-word-row">
        <strong>{word.word}</strong>
        <span className="phonetic">{word.phonetic}</span>
        <span className="row-hint">P 发音</span>
      </div>
      <div className="learning-row">
        {answerVisible ? (word.meaning.trim() || "暂无释义") : <ConcealedRow />}
      </div>
      <div className="learning-row mnemonic-row">
        {state.phase === "editingMnemonic" ? (
          <input
            autoFocus
            className="mnemonic-input"
            aria-label="编辑助记"
            value={state.mnemonicDraft}
            onChange={(event) =>
              dispatch({ type: "CHANGE_MNEMONIC", value: event.target.value })
            }
          />
        ) : answerVisible ? (
          <>助记：{getCurrentMnemonic(state).trim() || "暂无助记"}</>
        ) : (
          <ConcealedRow />
        )}
      </div>
      <div className="learning-row">
        {answerVisible ? `短语：${word.phrases.trim() || "暂无短语"}` : <ConcealedRow />}
      </div>
      <div className="learning-row">
        {answerVisible ? `例句：${bilingualExample.example || "暂无例句"}` : <ConcealedRow />}
      </div>
      <div className="learning-row">
        {answerVisible ? `译文：${bilingualExample.translation || "暂无译文"}` : <ConcealedRow />}
      </div>
    </section>
  );
}
