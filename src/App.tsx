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
import { askDeepSeek } from "./core/services/DeepSeekService";
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
import { createTextDocumentTemplate } from "./features/document/textSources";
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
import {
  createNovelFingerprint,
  createNovelReaderDocument,
  findNovelPageIndex,
  NovelProgressStore,
  type NovelReadingProgress,
} from "./features/reader/novelReader";
import {
  isDesktopApp,
  NovelLibraryService,
  type NovelLibraryEntry,
} from "./features/reader/NovelLibraryService";
import { createLearningRepository } from "./infrastructure/persistence/createLearningRepository";

const emptyStatistics: LearningStatistics = {
  reviewedCount: 0,
  todayReviewedCount: 0,
  uniqueReviewedCount: 0,
  dueCount: 0,
  mnemonicCount: 0,
  ratings: { again: 0, hard: 0, good: 0 },
};

interface NovelSource {
  libraryId: string;
  name: string;
  text: string;
  fingerprint: string;
}

function App() {
  const preferencesStore = useMemo(() => new AppPreferencesStore(), []);
  const [preferences, setPreferences] = useState(() => preferencesStore.load());
  const [activeView, setActiveView] = useState<AppView>("study");
  const [templateId, setTemplateId] = useState("project-weekly");
  const [customTextTemplate, setCustomTextTemplate] = useState<DocumentTemplate>();
  const [selectedTextName, setSelectedTextName] = useState("");
  const [novelSource, setNovelSource] = useState<NovelSource>();
  const [novelLibraryEntries, setNovelLibraryEntries] = useState<NovelLibraryEntry[]>([]);
  const [novelLibraryError, setNovelLibraryError] = useState("");
  const [busyNovelId, setBusyNovelId] = useState<string>();
  const [studyMode, setStudyMode] = useState<"words" | "novel">("words");
  const [novelOffset, setNovelOffset] = useState(0);
  const [readerHidden, setReaderHidden] = useState(false);
  const [resumeProgress, setResumeProgress] = useState<NovelReadingProgress>();
  const [loadingWordbookId, setLoadingWordbookId] = useState<WordbookId>();
  const [wordbookError, setWordbookError] = useState("");
  const [statistics, setStatistics] = useState(emptyStatistics);
  const layoutCache = useRef(new DocumentLayoutCache());
  const documentTemplate = customTextTemplate ?? getDocumentTemplate(templateId);
  const documentLayout = layoutCache.current.get(documentTemplate, preferences.fontSize);
  const novelProgressStore = useMemo(() => new NovelProgressStore(), []);
  const novelLibraryService = useMemo(() => new NovelLibraryService(), []);
  const novelDocument = useMemo(() => novelSource ? createNovelReaderDocument(
    novelSource.name,
    novelSource.text,
    {
      fingerprint: novelSource.fingerprint,
      lineWidthEm: 610 / (preferences.fontSize * 1.04),
      linesPerPage: 6,
    },
  ) : undefined, [novelSource, preferences.fontSize]);
  const novelPageIndex = novelDocument
    ? findNovelPageIndex(novelDocument.pages, novelOffset)
    : 0;
  const novelPage = novelDocument?.pages[novelPageIndex];
  const readerActive = studyMode === "novel" && Boolean(novelDocument);
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

  const refreshNovelLibrary = useCallback(async () => {
    if (!isDesktopApp()) return;
    try {
      setNovelLibraryEntries(await novelLibraryService.list());
      setNovelLibraryError("");
    } catch (error) {
      setNovelLibraryError(error instanceof Error ? error.message : "无法读取本地小说书架");
    }
  }, [novelLibraryService]);

  useEffect(() => {
    void refreshNovelLibrary();
  }, [refreshNovelLibrary]);

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
      .then((words) => {
        if (cancelled) return;

        // Reading the bundled file is enough to start studying. Persisting a
        // large wordbook to SQLite can take longer on first launch, so keep it
        // off the critical path for switching books.
        dispatch({ type: "LOAD_WORDS", words });
        setLoadingWordbookId(undefined);

        void progressService
          .initialize(words)
          .then((progress) => {
            if (cancelled) return;
            dispatch({ type: "HYDRATE_PROGRESS", ...progress });
            refreshStatistics();
          })
          .catch((error: unknown) => {
            if (cancelled) return;
            console.error("Failed to initialize learning progress", error);
            setWordbookError("词库已载入，但学习进度初始化失败");
          });
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

  const moveNovelPage = useCallback((offset: number) => {
    if (!novelDocument) return;
    const target = Math.min(
      novelDocument.pages.length - 1,
      Math.max(0, novelPageIndex + offset),
    );
    setNovelOffset(novelDocument.pages[target].startOffset);
  }, [novelDocument, novelPageIndex]);

  const jumpToNovelPage = useCallback((page: number) => {
    if (!novelDocument) return;
    const target = Math.min(novelDocument.pages.length, Math.max(1, page)) - 1;
    setNovelOffset(novelDocument.pages[target].startOffset);
  }, [novelDocument]);

  useEffect(() => {
    if (!novelDocument || !novelSource || resumeProgress) return;
    novelProgressStore.save({
      fingerprint: novelSource.fingerprint,
      name: novelDocument.name,
      offset: novelOffset,
      lastPage: novelPageIndex + 1,
      totalPages: novelDocument.pages.length,
      updatedAt: new Date().toISOString(),
    });
  }, [novelDocument, novelOffset, novelPageIndex, novelProgressStore, novelSource, resumeProgress]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeView !== "study") return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (readerActive && novelDocument) {
        if (event.key === "ArrowRight" || event.key === " ") {
          event.preventDefault();
          moveNovelPage(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveNovelPage(-1);
        } else if (event.key.toLowerCase() === "h") {
          setReaderHidden((hidden) => !hidden);
        } else if (event.key === "Escape") {
          setStudyMode("words");
        }
        return;
      }
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
  }, [activeView, handleAction, moveNovelPage, novelDocument, readerActive, speak, state.phase]);

  const selectWordbook = (wordbookId: WordbookId) => {
    updatePreferences({ ...preferences, selectedWordbookId: wordbookId });
    setActiveView("study");
  };

  const selectText = (name: string, content: string, author?: string) => {
    const template = createTextDocumentTemplate(name, content, author);
    layoutCache.current.clear();
    setCustomTextTemplate(template);
    setSelectedTextName(name);
    setActiveView("study");
  };

  const selectImportedTemplate = (template: DocumentTemplate) => {
    layoutCache.current.clear();
    setCustomTextTemplate(template);
    setSelectedTextName(template.name);
    setActiveView("study");
  };

  const openNovel = useCallback((entry: NovelLibraryEntry, content: string) => {
    const fingerprint = entry.fingerprint;
    const savedProgress = novelProgressStore.load(fingerprint);
    setNovelSource({ libraryId: entry.id, name: entry.name, text: content, fingerprint });
    setNovelOffset(0);
    setReaderHidden(false);
    setResumeProgress(savedProgress?.offset ? savedProgress : undefined);
    setStudyMode("novel");
    setActiveView("study");
  }, [novelProgressStore]);

  const importNovel = async (name: string, content: string, file: { size: number; lastModified: number }) => {
    const fingerprint = createNovelFingerprint(name, file.size, file.lastModified);
    const pendingId = `import:${fingerprint}`;
    setBusyNovelId(pendingId);
    setNovelLibraryError("");
    try {
      const entry = await novelLibraryService.save(name, content, fingerprint);
      setNovelLibraryEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      openNovel(entry, content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setNovelLibraryError(message);
      throw new Error(message);
    } finally {
      setBusyNovelId(undefined);
    }
  };

  const openStoredNovel = async (entry: NovelLibraryEntry) => {
    setBusyNovelId(entry.id);
    setNovelLibraryError("");
    try {
      const stored = await novelLibraryService.load(entry.id);
      openNovel(stored.entry, stored.text);
    } catch (error) {
      setNovelLibraryError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyNovelId(undefined);
    }
  };

  const deleteStoredNovel = async (entry: NovelLibraryEntry) => {
    setBusyNovelId(entry.id);
    setNovelLibraryError("");
    try {
      await novelLibraryService.delete(entry.id);
      setNovelLibraryEntries((current) => current.filter((item) => item.id !== entry.id));
      if (novelSource?.libraryId === entry.id) {
        setNovelSource(undefined);
        setStudyMode("words");
        setResumeProgress(undefined);
      }
    } catch (error) {
      setNovelLibraryError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyNovelId(undefined);
    }
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

  const askAi = useCallback((prompt: string) => {
    const word = getCurrentWord(state);
    return askDeepSeek({
      apiKey: preferences.deepseekApiKey,
      baseUrl: preferences.deepseekBaseUrl,
      model: preferences.deepseekModel,
    }, prompt, readerActive && novelDocument ? {
      word: `小说《${novelDocument.name}》阅读片段`,
      example: novelPage?.lines.map((line) => line.text).join("\n"),
    } : word);
  }, [novelDocument, novelPage, preferences.deepseekApiKey, preferences.deepseekBaseUrl, preferences.deepseekModel, readerActive, state]);

  const lineHeight = preferences.fontSize * 2;
  const documentStyle = {
    "--document-zoom": preferences.documentZoom,
    "--document-font-size": `${preferences.fontSize}px`,
    "--document-line-height": `${lineHeight}px`,
    "--learning-row-height": `${lineHeight}px`,
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
              learningBlock={<LearningBlock
                state={state}
                dispatch={handleAction}
                camouflageLines={documentLayout.camouflageLines}
                novelLines={readerActive ? novelPage?.lines : undefined}
                readerHidden={readerHidden}
              />}
            />
          </div>
          <div className="session-progress" aria-live="polite">
            {readerActive && novelDocument
              ? `${novelDocument.name} · 阅读 ${novelPageIndex + 1}/${novelDocument.pages.length} · ${Math.round(((novelPageIndex + 1) / novelDocument.pages.length) * 100)}%`
              : loadingWordbookId === currentWordbook.id
              ? `${currentWordbook.shortName} · 正在载入词库…`
              : `${currentWordbook.shortName} · 今日复习 ${statistics.todayReviewedCount} · 当前 ${state.currentIndex + 1}/${state.words.length}`}
          </div>
          <FloatingBar
            state={state}
            dispatch={handleAction}
            onSpeak={speak}
            showKeyboardHints={preferences.showKeyboardHints}
            aiConfigured={Boolean(preferences.deepseekApiKey.trim())}
            onAskAi={askAi}
            onOpenReader={novelDocument ? () => setStudyMode("novel") : undefined}
            reader={readerActive && novelDocument ? {
              page: novelPageIndex + 1,
              totalPages: novelDocument.pages.length,
              canPrevious: novelPageIndex > 0,
              canNext: novelPageIndex < novelDocument.pages.length - 1,
              hidden: readerHidden,
              onPrevious: () => moveNovelPage(-1),
              onNext: () => moveNovelPage(1),
              onJump: jumpToNovelPage,
              onToggleHidden: () => setReaderHidden((hidden) => !hidden),
              onSwitchToWords: () => setStudyMode("words"),
            } : undefined}
          />
          {resumeProgress && novelDocument && (
            <aside className="resume-reading-prompt" role="status">
              <div>
                <b>发现上次阅读进度</b>
                <span>上次读到第 {resumeProgress.lastPage} 页，约 {Math.round((resumeProgress.lastPage / Math.max(1, resumeProgress.totalPages)) * 100)}%</span>
              </div>
              <button className="primary-button" onClick={() => {
                setNovelOffset(resumeProgress.offset);
                setResumeProgress(undefined);
              }}>继续阅读</button>
              <button className="secondary-button" onClick={() => {
                setNovelOffset(0);
                setResumeProgress(undefined);
              }}>从头开始</button>
            </aside>
          )}
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
          currentBackgroundName={selectedTextName || documentTemplate.name}
          currentNovelFingerprint={novelSource?.fingerprint}
          novels={novelLibraryEntries.map((entry) => ({
            ...entry,
            progress: novelProgressStore.load(entry.fingerprint),
          }))}
          libraryError={novelLibraryError}
          busyNovelId={busyNovelId}
          onSelectBackground={selectText}
          onSelectTemplate={selectImportedTemplate}
          onImportNovel={importNovel}
          onOpenNovel={openStoredNovel}
          onDeleteNovel={deleteStoredNovel}
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
