import { useState } from "react";
import type { AppPreferences } from "../../core/preferences/AppPreferences";

interface ProfilePanelProps {
  preferences: AppPreferences;
  onChange: (preferences: AppPreferences) => void;
}

export function ProfilePanel({ preferences, onChange }: ProfilePanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const patch = (change: Partial<AppPreferences>) => onChange({ ...preferences, ...change });

  return (
    <section className="feature-panel" aria-labelledby="profile-panel-title">
      <header className="feature-panel-header">
        <div>
          <span className="feature-eyebrow">LOCAL PROFILE</span>
          <h1 id="profile-panel-title">我的设置</h1>
          <p>第一版不需要账号，所有偏好均保存在本机。</p>
        </div>
        <div className="local-profile-mark">L</div>
      </header>

      <div className="settings-list">
        <label>
          <span><b>每日学习目标</b><small>先安排到期复习，剩余数量用于新词</small></span>
          <input
            type="number"
            min="5"
            max="200"
            step="5"
            value={preferences.dailyGoal}
            onChange={(event) => patch({ dailyGoal: Math.min(200, Math.max(5, Number(event.target.value))) })}
          />
        </label>
        <label>
          <span><b>发音速度</b><small>系统英语发音的播放速度</small></span>
          <select value={preferences.voiceRate} onChange={(event) => patch({ voiceRate: Number(event.target.value) })}>
            <option value="0.7">较慢</option>
            <option value="0.85">标准</option>
            <option value="1">较快</option>
          </select>
        </label>
        <label>
          <span><b>快捷键提示</b><small>在学习工具栏显示按键名称</small></span>
          <input
            type="checkbox"
            checked={preferences.showKeyboardHints}
            onChange={(event) => patch({ showKeyboardHints: event.target.checked })}
          />
        </label>
      </div>

      <article className="ai-settings-card">
        <div className="ai-settings-heading">
          <div><span className="feature-eyebrow">LOCAL AI</span><h2>DeepSeek 设置</h2></div>
          <span className={preferences.deepseekApiKey.trim() ? "ai-ready" : "ai-missing"}>
            {preferences.deepseekApiKey.trim() ? "已配置" : "未配置"}
          </span>
        </div>
        <p>密钥仅保存在本机偏好中，请勿在公共电脑使用或截图分享。</p>
        <label className="ai-setting-field">
          <span>API Key</span>
          <div className="api-key-field">
            <input type={showApiKey ? "text" : "password"} value={preferences.deepseekApiKey}
              placeholder="sk-..." autoComplete="off"
              onChange={(event) => patch({ deepseekApiKey: event.target.value })} />
            <button type="button" onClick={() => setShowApiKey((value) => !value)}>{showApiKey ? "隐藏" : "显示"}</button>
          </div>
        </label>
        <label className="ai-setting-field"><span>API 地址</span>
          <input type="url" value={preferences.deepseekBaseUrl}
            onChange={(event) => patch({ deepseekBaseUrl: event.target.value })} />
        </label>
        <label className="ai-setting-field"><span>模型</span>
          <input type="text" value={preferences.deepseekModel}
            onChange={(event) => patch({ deepseekModel: event.target.value })} />
        </label>
      </article>

      <article className="shortcut-card">
        <h2>键盘操作</h2>
        <p><kbd>Space</kbd> 显示答案　<kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> 评分　<kbd>P</kbd> 发音　<kbd>E</kbd> 助记　<kbd>H</kbd> 隐藏</p>
      </article>
    </section>
  );
}
