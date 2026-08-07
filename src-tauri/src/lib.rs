use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeepSeekRequest {
    api_key: String,
    base_url: String,
    model: String,
    prompt: String,
    context: String,
}

#[derive(Serialize)]
struct ChatMessage {
    role: &'static str,
    content: String,
}

#[derive(Serialize)]
struct ChatCompletionBody {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
    max_tokens: u16,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}
#[derive(Deserialize)]
struct ChatChoice {
    message: ChatResponseMessage,
}
#[derive(Deserialize)]
struct ChatResponseMessage {
    content: String,
}

#[tauri::command]
async fn ask_deepseek(request: DeepSeekRequest) -> Result<String, String> {
    let base_url = request.base_url.trim().trim_end_matches('/');
    if !base_url.starts_with("https://") {
        return Err("API 地址必须使用 https://".into());
    }
    if request.api_key.trim().is_empty() || request.prompt.trim().is_empty() {
        return Err("API Key 和问题不能为空".into());
    }

    let body = ChatCompletionBody {
    model: request.model,
    messages: vec![
      ChatMessage {
        role: "system",
        content: "你是一个简洁的英语学习助手。结合当前单词上下文，用中文直接回答，必要时给出英文例句。".into(),
      },
      ChatMessage {
        role: "user",
        content: format!("{}\n\n用户问题：{}", request.context, request.prompt),
      },
    ],
    stream: false,
    max_tokens: 700,
  };

    let response = reqwest::Client::builder()
        .timeout(Duration::from_secs(35))
        .build()
        .map_err(|_| "无法初始化 AI 网络请求".to_string())?
        .post(format!("{base_url}/chat/completions"))
        .bearer_auth(request.api_key)
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("AI 网络请求失败：{error}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!(
            "DeepSeek 返回错误（HTTP {}），请检查 API Key、模型和余额",
            status.as_u16()
        ));
    }
    let completion: ChatCompletionResponse = response
        .json()
        .await
        .map_err(|_| "无法解析 DeepSeek 返回内容".to_string())?;
    completion
        .choices
        .into_iter()
        .next()
        .map(|choice| choice.message.content.trim().to_string())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "DeepSeek 未返回有效回答".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_learning_tables",
        sql: include_str!("../migrations/001_initial.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ask_deepseek])
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:lulu-words.db", migrations)
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
