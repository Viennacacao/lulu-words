import {
  getCurrentMnemonic,
  getCurrentWord,
  type LearningSessionAction,
  type LearningSessionState,
} from "./session";

interface LearningBlockProps {
  state: LearningSessionState;
  dispatch: React.Dispatch<LearningSessionAction>;
  novelLines?: string[];
}

function ConcealedRow() {
  return <span aria-hidden="true">&nbsp;</span>;
}

export function LearningBlock({ state, dispatch, novelLines }: LearningBlockProps) {
  if (novelLines) {
    return (
      <section className="learning-block learning-block--reader" aria-label="小说阅读区">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="learning-row novel-reader-row" key={index}>
            {novelLines[index] || <ConcealedRow />}
          </div>
        ))}
      </section>
    );
  }

  const word = getCurrentWord(state);
  const answerVisible = state.phase !== "recall";

  if (state.hidden) {
    return (
      <section className="learning-block learning-block--hidden" aria-label="学习区已隐藏">
        <div>经研究讨论，现将下一阶段重点工作安排如下。</div>
        <div>各部门应结合实际情况，进一步细化工作任务。</div>
        <div>相关事项按照既定时间节点有序推进。</div>
        <div>执行过程中发现的问题应及时沟通反馈。</div>
        <div>以上内容请各责任单位认真落实。</div>
      </section>
    );
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
        {answerVisible ? `例句：${word.example.trim().replace(/\s+/g, " ") || "暂无例句"}` : <ConcealedRow />}
      </div>
    </section>
  );
}
