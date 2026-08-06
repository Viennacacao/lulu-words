import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AppPreferencesStore,
  clampDocumentFontSize,
  type AppPreferences,
  type AppView,
} from "./core/preferences/AppPreferences";
import type { LearningStatistics } from "./core/repository/LearningRepository";
import { FsrsReviewScheduler } from "./core/scheduler/FsrsReviewScheduler";
import { LearningProgressService } from "./core/services/LearningProgressService";
import { sampleWords } from "./data/sampleWords";
import {
  getWordbookManifest,
  loadWordbook,
  wordbookManifests,
  type WordbookId,
} from "./data/wordbooks";
import { DocumentPage } from "./features/document/DocumentPage";
import { OfficeShell } from "./features/document/OfficeShell";
import {
  clampDocumentZoom,
  DocumentLayoutCache,
} from "./features/document/documentLayout";
import {
  builtInTexts,
  createTextDocumentTemplate,
} from "./features/document/textSources";
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
import { ProfilePanel } from "./features/navigation/ProfilePanel";
import { StatisticsPanel } from "./features/navigation/StatisticsPanel";
import { TextPanel } from "./features/navigation/TextPanel";
import { WordbookPanel } from "./features/navigation/WordbookPanel";
import { createLearningRepository } from "./infrastructure/persistence/createLearningRepository";

const emptyStatistics: LearningStatistics = {
  reviewedCount: 0,
  todayReviewedCount: 0,
  uniqueReviewedCount: 0,
  dueCount: 0,
  mnemonicCount: 0,
  ratings: { again: 0, hard: 0, good: 0 },
};

function App() {
  const preferencesStore = useMemo(() => new AppPreferencesStore(), []);
  const [preferences, setPreferences] = useState(() => preferencesStore.load());
  const [activeView, setActiveView] = useState<AppView>("study");
  const [templateId, setTemplateId] = useState("project-weekly");
  const [customTextTemplate, setCustomTextTemplate] = useState<DocumentTemplate>();
  const [selectedTextName, setSelectedTextName] = useState("");
  const [loadingWordbookId, setLoadingWordbookId] = useState<WordbookId>();
  const [wordbookError, setWordbookError] = useState("");
  const [statistics, setStatistics] = useState(emptyStatistics);
  const layoutCache = useRef(new DocumentLayoutCache());
  const documentTemplate = customTextTemplate ?? getDocumentTemplate(templateId);
  const documentLayout = layoutCache.current.get(documentTemplate, preferences.fontSize);
  const currentWordbook = getWordbookManifest(preferences.selectedWordbookId);
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

  const updatePreferences = useCallback(
    (next: AppPreferences) => {
      setPreferences(next);
      preferencesStore.save(next);
    },
    [preferencesStore],
  );

  const refreshStatistics = useCallback(() => {
    progressService
      .loadStatistics()
      .then(setStatistics)
      .catch((error: unknown) => console.error("Failed to load statistics", error));
  }, [progressService]);

  useEffect(() => {
    let cancelled = false;
    const wordbookId = preferences.selectedWordbookId;
    setLoadingWordbookId(wordbookId);
    setWordbookError("");

    loadWordbook(wordbookId)
      .then(async (words) => {
        const progress = await progressService.initialize(words);
        if (cancelled) return;
        dispatch({ type: "LOAD_WORDS", words });
        dispatch({ type: "HYDRATE_PROGRESS", ...progress });
        setLoadingWordbookId(undefined);
        refreshStatistics();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Failed to load wordbook", error);
        setLoadingWordbookId(undefined);
        setWordbookError(error instanceof Error ? error.message : "词库载入失败");
        progressService.initialize(sampleWords).then((progress) => {
          if (!cancelled) dispatch({ type: "HYDRATE_PROGRESS", ...progress });
        });
      });

    return () => {
      cancelled = true;
    };
  }, [preferences.selectedWordbookId, progressService, refreshStatistics]);

  const speak = useCallback(() => {
    if (state.hidden || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(getCurrentWord(state).word);
    utterance.lang = "en-US";
    utterance.rate = preferences.voiceRate;
    window.speechSynthesis.speak(utterance);
  }, [preferences.voiceRate, state]);

  const handleAction = useCallback(
    (action: LearningSessionAction) => {
      if (
        action.type === "GRADE" &&
        state.phase === "revealed" &&
        !state.hidden
      ) {
        void progressService
          .recordReview(getCurrentWord(state).id, action.rating)
          .then(refreshStatistics);
      } else if (
        action.type === "SAVE_MNEMONIC" &&
        state.phase === "editingMnemonic"
      ) {
        void progressService
          .saveMnemonic(getCurrentWord(state).id, state.mnemonicDraft.trim())
          .then(refreshStatistics);
      }

      dispatch(action);
    },
    [progressService, refreshStatistics, state],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeView !== "study") return;
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
  }, [activeView, handleAction, speak, state.phase]);

  const selectWordbook = (wordbookId: WordbookId) => {
    updatePreferences({ ...preferences, selectedWordbookId: wordbookId });
  };

  const selectText = (name: string, content: string, author?: string) => {
    const template = createTextDocumentTemplate(name, content, author);
    layoutCache.current.clear();
    setCustomTextTemplate(template);
    setSelectedTextName(name);
    setActiveView("study");
  };

  const selectDocumentTemplate = (nextTemplateId: string) => {
    if (!documentTemplates.some((template) => template.id === nextTemplateId)) return;
    setCustomTextTemplate(undefined);
    setSelectedTextName("");
    setTemplateId(nextTemplateId);
  };

  const changeFontSize = (fontSize: number) => {
    updatePreferences({
      ...preferences,
      fontSize: clampDocumentFontSize(fontSize),
    });
  };

  const changeZoom = (zoom: number) => {
    updatePreferences({
      ...preferences,
      documentZoom: clampDocumentZoom(zoom),
    });
  };

  const lineHeight = preferences.fontSize * 2;
  const documentStyle = {
    "--document-zoom": preferences.documentZoom,
    "--document-font-size": `${preferences.fontSize}px`,
    "--document-line-height": `${lineHeight}px`,
    "--learning-row-height": `${lineHeight}px`,
    "--document-lower-top": `${386 + lineHeight * 6}px`,
  } as CSSProperties;

  return (
    <OfficeShell
      activeView={activeView}
      currentTemplateId={documentTemplate.id}
      documentTitle={documentTemplate.fileName}
      pageCount={documentLayout.pageCount}
      wordCount={documentLayout.wordCount}
      zoom={preferences.documentZoom}
      fontSize={preferences.fontSize}
      templates={documentTemplates}
      onViewChange={setActiveView}
      onTemplateChange={selectDocumentTemplate}
      onZoomChange={changeZoom}
      onFontSizeChange={changeFontSize}
    >
      {activeView === "study" && (
        <>
          <div className="document-zoom-layer" style={documentStyle}>
            <DocumentPage
              layout={documentLayout}
              learningBlock={<LearningBlock state={state} dispatch={handleAction} />}
            />
          </div>
          <div className="session-progress" aria-live="polite">
            {currentWordbook.shortName} · 今日复习 {statistics.todayReviewedCount} · 当前 {state.currentIndex + 1}/{state.words.length}
          </div>
          <FloatingBar
            state={state}
            dispatch={handleAction}
            onSpeak={speak}
            showKeyboardHints={preferences.showKeyboardHints}
          />
        </>
      )}

      {activeView === "wordbooks" && (
        <WordbookPanel
          manifests={wordbookManifests}
          selectedId={preferences.selectedWordbookId}
          loadingId={loadingWordbookId}
          error={wordbookError}
          onSelect={selectWordbook}
        />
      )}
      {activeView === "texts" && (
        <TextPanel
          builtInTexts={builtInTexts}
          selectedName={selectedTextName}
          onSelect={selectText}
        />
      )}
      {activeView === "statistics" && (
        <StatisticsPanel
          statistics={statistics}
          wordbook={currentWordbook}
          dailyGoal={preferences.dailyGoal}
        />
      )}
      {activeView === "profile" && (
        <ProfilePanel preferences={preferences} onChange={updatePreferences} />
      )}
    </OfficeShell>
  );
}

export default App;
