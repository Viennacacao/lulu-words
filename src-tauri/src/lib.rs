use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use tauri::Manager;
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

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NovelLibraryEntry {
    id: String,
    name: String,
    fingerprint: String,
    size: u64,
    imported_at: String,
}

#[derive(Deserialize)]
struct SaveNovelRequest {
    entry: NovelLibraryEntry,
    text: String,
}

#[derive(Serialize)]
struct StoredNovel {
    entry: NovelLibraryEntry,
    text: String,
}

fn novel_library_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位 App 数据目录：{error}"))?
        .join("novels");
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建小说书架：{error}"))?;
    Ok(directory)
}

fn validate_novel_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 80
        || !id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-' || character == '_')
    {
        return Err("小说标识无效".into());
    }
    Ok(())
}

#[tauri::command]
fn save_novel(app: tauri::AppHandle, request: SaveNovelRequest) -> Result<NovelLibraryEntry, String> {
    validate_novel_id(&request.entry.id)?;
    if request.text.trim().is_empty() {
        return Err("小说 TXT 中没有可保存的文字".into());
    }
    let directory = novel_library_dir(&app)?;
    let text_path = directory.join(format!("{}.txt", request.entry.id));
    let metadata_path = directory.join(format!("{}.json", request.entry.id));
    fs::write(text_path, request.text.as_bytes())
        .map_err(|error| format!("无法保存小说文件：{error}"))?;
    let metadata = serde_json::to_vec_pretty(&request.entry)
        .map_err(|error| format!("无法生成小说索引：{error}"))?;
    fs::write(metadata_path, metadata)
        .map_err(|error| format!("无法保存小说索引：{error}"))?;
    Ok(request.entry)
}

#[tauri::command]
fn list_novels(app: tauri::AppHandle) -> Result<Vec<NovelLibraryEntry>, String> {
    let directory = novel_library_dir(&app)?;
    let mut entries = Vec::new();
    for item in fs::read_dir(&directory).map_err(|error| format!("无法读取小说书架：{error}"))? {
        let path = item.map_err(|error| format!("无法读取小说索引：{error}"))?.path();
        if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
            continue;
        }
        if let Ok(bytes) = fs::read(&path) {
            if let Ok(entry) = serde_json::from_slice::<NovelLibraryEntry>(&bytes) {
                if directory.join(format!("{}.txt", entry.id)).is_file() {
                    entries.push(entry);
                }
            }
        }
    }
    entries.sort_by(|left, right| right.imported_at.cmp(&left.imported_at));
    Ok(entries)
}

#[tauri::command]
fn load_novel(app: tauri::AppHandle, id: String) -> Result<StoredNovel, String> {
    validate_novel_id(&id)?;
    let directory = novel_library_dir(&app)?;
    let metadata = fs::read(directory.join(format!("{id}.json")))
        .map_err(|_| "该小说已不在书架中".to_string())?;
    let entry = serde_json::from_slice::<NovelLibraryEntry>(&metadata)
        .map_err(|_| "小说索引已损坏".to_string())?;
    let text = fs::read_to_string(directory.join(format!("{id}.txt")))
        .map_err(|_| "无法读取小说内容，请重新导入".to_string())?;
    Ok(StoredNovel { entry, text })
}

#[tauri::command]
fn delete_novel(app: tauri::AppHandle, id: String) -> Result<(), String> {
    validate_novel_id(&id)?;
    let directory = novel_library_dir(&app)?;
    for extension in ["txt", "json"] {
        let path = directory.join(format!("{id}.{extension}"));
        if path.exists() {
            fs::remove_file(path).map_err(|error| format!("无法删除小说：{error}"))?;
        }
    }
    Ok(())
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
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_learning_tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_background_documents_table",
            sql: include_str!("../migrations/002_background_documents.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ask_deepseek,
            save_novel,
            list_novels,
            load_novel,
            delete_novel
        ])
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
