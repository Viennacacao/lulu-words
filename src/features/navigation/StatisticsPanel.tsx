import type { LearningStatistics } from "../../core/repository/LearningRepository";
import type { WordbookManifest } from "../../data/wordbooks";

interface StatisticsPanelProps {
  statistics: LearningStatistics;
  wordbook: WordbookManifest;
  dailyGoal: number;
}

export function StatisticsPanel({ statistics, wordbook, dailyGoal }: StatisticsPanelProps) {
  const completed = Math.min(100, Math.round((statistics.todayReviewedCount / Math.max(1, dailyGoal)) * 100));
  const totalRatings = Math.max(1, statistics.reviewedCount);

  return (
    <section className="feature-panel" aria-labelledby="statistics-panel-title">
      <header className="feature-panel-header">
        <div>
          <span className="feature-eyebrow">LEARNING REPORT</span>
          <h1 id="statistics-panel-title">本地学习统计</h1>
          <p>数据直接来自本机复习日志，不上传到服务器。</p>
        </div>
        <div className="current-book-badge">当前：{wordbook.shortName}</div>
      </header>

      <div className="metric-grid">
        <article><strong>{statistics.reviewedCount}</strong><span>累计复习</span></article>
        <article><strong>{statistics.uniqueReviewedCount}</strong><span>已接触单词</span></article>
        <article><strong>{statistics.dueCount}</strong><span>当前待复习</span></article>
        <article><strong>{statistics.mnemonicCount}</strong><span>自定义助记</span></article>
      </div>

      <article className="report-card">
        <div className="report-title-row">
          <div><h2>今日目标</h2><p>{statistics.todayReviewedCount} / {dailyGoal} 次</p></div>
          <strong>{completed}%</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${completed}%` }} /></div>
      </article>

      <article className="report-card">
        <h2>评分分布</h2>
        <div className="rating-bars">
          {([
            ["again", "忘记", "#d65d55"],
            ["hard", "模糊", "#d69b43"],
            ["good", "认识", "#3f9566"],
          ] as const).map(([key, label, color]) => (
            <div key={key}>
              <span>{label}</span>
              <div><i style={{ width: `${(statistics.ratings[key] / totalRatings) * 100}%`, background: color }} /></div>
              <b>{statistics.ratings[key]}</b>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
