import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FsrsReviewScheduler } from "./core/scheduler/FsrsReviewScheduler";
import { LearningProgressService } from "./core/services/LearningProgressService";
import { sampleWords } from "./data/sampleWords";
import { DocumentPage } from "./features/document/DocumentPage";
import { OfficeShell } from "./features/document/OfficeShell";
import {
  clampDocumentZoom,
  DocumentLayoutCache,
} from "./features/document/documentLayout";
import {
  documentTemplates,
  getDocumentTemplate,
  type DocumentTemplate,
} from "./features/document/templates";
import { FloatingBar } from "./features/learning/FloatingBar";
import { LearningBlock } from "./features/learning/LearningBlock";
import {
  createLearningSession,
  getCurrentWord,
  learningSessionReducer,
  type LearningSessionAction,
} from "./features/learning/session";
import { createLearningRepository } from "./infrastructure/persistence/createLearningRepository";

function App() {
  const [templateId, setTemplateId] =
    useState<DocumentTemplate["id"]>("project-weekly");
  const [documentZoom, setDocumentZoom] = useState(1);
  const layoutCache = useRef(new DocumentLayoutCache());
  const documentTemplate = getDocumentTemplate(templateId);
  const documentLayout = layoutCache.current.get(documentTemplate);
  const [state, dispatch] = useReducer(
    learningSessionReducer,
    sampleWords,
    createLearningSession,
  );
  const progressService = useMemo(
    () =>
      new LearningProgressService(
        createLearningRepository(),
        new FsrsReviewScheduler(),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    progressService
      .initialize(sampleWords)
      .then((progress) => {
        if (!cancelled) {
          dispatch({ type: "HYDRATE_PROGRESS", ...progress });
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to initialize local learning progress", error);
      });

    return () => {
      cancelled = true;
    };
  }, [progressService]);

  const speak = useCallback(() => {
    if (state.hidden || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(getCurrentWord(state).word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, [state]);

  const handleAction = useCallback(
    (action: LearningSessionAction) => {
      if (
        action.type === "GRADE" &&
        state.phase === "revealed" &&
        !state.hidden
      ) {
        progressService.recordReview(
          getCurrentWord(state).id,
          action.rating,
        );
      } else if (
        action.type === "SAVE_MNEMONIC" &&
        state.phase === "editingMnemonic"
      ) {
        progressService.saveMnemonic(
          getCurrentWord(state).id,
          state.mnemonicDraft.trim(),
        );
      }

      dispatch(action);
    },
    [progressService, state],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (state.phase === "editingMnemonic") {
        if (event.key === "Escape") {
          event.preventDefault();
          handleAction({ type: "CANCEL_MNEMONIC_EDIT" });
        } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          handleAction({ type: "SAVE_MNEMONIC" });
        }
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        handleAction({ type: "TOGGLE_ANSWER" });
      } else if (event.key === "1") {
        handleAction({ type: "GRADE", rating: "again" });
      } else if (event.key === "2") {
        handleAction({ type: "GRADE", rating: "hard" });
      } else if (event.key === "3") {
        handleAction({ type: "GRADE", rating: "good" });
      } else if (event.key.toLowerCase() === "p") {
        speak();
      } else if (event.key.toLowerCase() === "e") {
        handleAction({ type: "START_MNEMONIC_EDIT" });
      } else if (event.key.toLowerCase() === "h") {
        handleAction({ type: "TOGGLE_HIDDEN" });
      } else if (event.key === "ArrowRight") {
        handleAction({ type: "NEXT" });
      } else if (event.key === "ArrowLeft") {
        handleAction({ type: "PREVIOUS" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction, speak, state.phase]);

  return (
    <OfficeShell
      currentTemplateId={templateId}
      documentTitle={documentTemplate.fileName}
      pageCount={documentLayout.pageCount}
      wordCount={documentLayout.wordCount}
      zoom={documentZoom}
      templates={documentTemplates}
      onTemplateChange={setTemplateId}
      onZoomChange={(zoom) => setDocumentZoom(clampDocumentZoom(zoom))}
    >
      <div
        className="document-zoom-layer"
        style={{ "--document-zoom": documentZoom } as CSSProperties}
      >
        <DocumentPage
          layout={documentLayout}
          learningBlock={<LearningBlock state={state} dispatch={handleAction} />}
        />
      </div>
      <div className="session-progress" aria-live="polite">
        今日复习 {state.reviewedCount} · 当前 {state.currentIndex + 1}/{state.words.length}
      </div>
      <FloatingBar state={state} dispatch={handleAction} onSpeak={speak} />
    </OfficeShell>
  );
}

export default App;
