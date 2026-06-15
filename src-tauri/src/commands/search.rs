use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

static SEARCH_CANCELLED: AtomicBool = AtomicBool::new(false);

const MAX_RESULTS: usize = 10_000;

fn rg_child_lock() -> &'static Mutex<Option<Child>> {
    static RG_CHILD: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
    RG_CHILD.get_or_init(|| Mutex::new(None))
}

fn find_rg_binary() -> Option<String> {
    if let Ok(output) = std::process::Command::new("rg").arg("--version").output() {
        if output.status.success() {
            return Some("rg".to_string());
        }
    }

    let try_paths = [
        "node_modules/.bin/rg",
        "../node_modules/.bin/rg",
    ];

    for path in &try_paths {
        let pb = PathBuf::from(path);
        let with_exe = pb.with_extension("exe");
        if pb.exists() || with_exe.exists() {
            return Some(path.to_string());
        }
    }

    None
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMatch {
    pub file: String,
    pub lines: Vec<LineMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineMatch {
    pub line_num: usize,
    pub content: String,
    pub match_start: usize,
    pub match_end: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<Vec<ContextLine>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub after: Option<Vec<ContextLine>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextLine {
    pub line_num: usize,
    pub content: String,
}

#[derive(Deserialize)]
struct RgMessage {
    #[serde(rename = "type")]
    msg_type: String,
    data: serde_json::Value,
}

#[tauri::command]
pub async fn search_in_dir_cmd(
    app_handle: AppHandle,
    dir: String,
    query: String,
    use_regex: bool,
    case_sensitive: bool,
    whole_word: bool,
) -> Result<(), String> {
    SEARCH_CANCELLED.store(false, Ordering::SeqCst);

    let root = PathBuf::from(&dir);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", dir));
    }

    let rg_bin = find_rg_binary()
        .ok_or_else(|| "ripgrep (rg) not found. Install it from https://github.com/BurntSushi/ripgrep or run: scoop install ripgrep".to_string())?;

    let mut args = vec![
        "--json".to_string(),
        "--no-heading".to_string(),
        "--with-filename".to_string(),
    ];

    if !case_sensitive {
        args.push("-i".to_string());
    }
    if whole_word {
        args.push("-w".to_string());
    }
    if use_regex {
        args.push("-e".to_string());
        args.push(query.clone());
    } else {
        args.push("-F".to_string());
        args.push(query.clone());
    }

    args.push("--".to_string());
    args.push(dir.clone());

    let mut child = Command::new(&rg_bin)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start rg: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture rg stdout")?;

    {
        let mut guard = rg_child_lock().lock().await;
        *guard = Some(child);
    }

    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    let mut current_file = String::new();
    let mut current_lines: Vec<LineMatch> = Vec::new();
    let mut total_matches: usize = 0;
    let mut truncated = false;

    while let Ok(Some(line)) = lines.next_line().await {
        if SEARCH_CANCELLED.load(Ordering::SeqCst) {
            break;
        }

        let msg: RgMessage = match serde_json::from_str(&line) {
            Ok(m) => m,
            Err(_) => continue,
        };

        match msg.msg_type.as_str() {
            "begin" => {
                if !current_file.is_empty() && !current_lines.is_empty() {
                    total_matches += current_lines.len();
                    let fm = FileMatch {
                        file: std::mem::take(&mut current_file),
                        lines: std::mem::take(&mut current_lines),
                    };
                    let _ = app_handle.emit("search-result", &fm);
                }
                current_file = msg.data["path"]["text"]
                    .as_str()
                    .unwrap_or("")
                    .to_string();
                if let Ok(rel) = PathBuf::from(&current_file).strip_prefix(&root) {
                    current_file = rel.to_string_lossy().to_string();
                }
                current_lines.clear();
            }
            "match" => {
                let line_num = msg.data["line_number"].as_u64().unwrap_or(0) as usize;
                let raw_content = msg.data["lines"]["text"]
                    .as_str()
                    .unwrap_or("");
                let content = raw_content
                    .trim_end_matches('\n')
                    .trim_end_matches('\r')
                    .to_string();

                let (match_start, match_end) = msg.data["submatches"]
                    .as_array()
                    .and_then(|arr| arr.first())
                    .map(|sub| {
                        let start = sub["start"].as_u64().unwrap_or(0) as usize;
                        let end = sub["end"].as_u64().unwrap_or(0) as usize;
                        (start, end)
                    })
                    .unwrap_or((0, 0));

                current_lines.push(LineMatch {
                    line_num,
                    content,
                    match_start,
                    match_end,
                    before: None,
                    after: None,
                });

                if total_matches + current_lines.len() >= MAX_RESULTS {
                    truncated = true;
                    break;
                }
            }
            "end" => {
                if !current_lines.is_empty() {
                    total_matches += current_lines.len();
                    let fm = FileMatch {
                        file: std::mem::take(&mut current_file),
                        lines: std::mem::take(&mut current_lines),
                    };
                    let _ = app_handle.emit("search-result", &fm);
                }
                current_file.clear();
                current_lines.clear();
            }
            _ => {}
        }
    }

    if !current_file.is_empty() && !current_lines.is_empty() {
        total_matches += current_lines.len();
        let fm = FileMatch {
            file: std::mem::take(&mut current_file),
            lines: std::mem::take(&mut current_lines),
        };
        let _ = app_handle.emit("search-result", &fm);
    }

    if truncated {
        let _ = app_handle.emit("search-truncated", true);
    }

    {
        let mut guard = rg_child_lock().lock().await;
        if let Some(mut child) = guard.take() {
            let _ = child.kill().await;
        }
    }

    let _ = app_handle.emit(
        "search-done",
        serde_json::json!({ "total_matches": total_matches }),
    );

    Ok(())
}

#[tauri::command]
pub async fn cancel_search() -> Result<(), String> {
    SEARCH_CANCELLED.store(true, Ordering::SeqCst);
    let mut guard = rg_child_lock().lock().await;
    if let Some(mut child) = guard.take() {
        let _ = child.kill().await;
    }
    Ok(())
}

#[tauri::command]
pub async fn replace_in_file_cmd(
    file_path: String,
    query: String,
    replacement: String,
    use_regex: bool,
    case_sensitive: bool,
    whole_word: bool,
) -> Result<usize, String> {
    replace_in_file(&file_path, &query, &replacement, use_regex, case_sensitive, whole_word)
}

pub fn replace_in_file(
    file_path: &str,
    query: &str,
    replacement: &str,
    use_regex: bool,
    case_sensitive: bool,
    whole_word: bool,
) -> Result<usize, String> {
    let pattern = build_pattern(query, use_regex, case_sensitive, whole_word)?;
    let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let new_content = pattern.replace_all(&content, replacement);
    let count = pattern.find_iter(&content).count();

    if count > 0 {
        fs::write(file_path, new_content.as_bytes()).map_err(|e| e.to_string())?;
    }

    Ok(count)
}

fn build_pattern(
    query: &str,
    use_regex: bool,
    case_sensitive: bool,
    whole_word: bool,
) -> Result<Regex, String> {
    let mut pattern = if use_regex {
        query.to_string()
    } else {
        regex::escape(query)
    };

    if whole_word {
        pattern = format!(r"\b{}\b", pattern);
    }

    if !case_sensitive {
        pattern = format!("(?i){}", pattern);
    }

    Regex::new(&pattern).map_err(|e| format!("Invalid pattern: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    

    fn setup_test_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(name);
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn replace_in_file_replaces_matches() {
        let dir = setup_test_dir("asteria_replace_test");
        let file_path = dir.join("f.txt");
        fs::write(&file_path, "hello world hello").unwrap();

        let count = replace_in_file(
            file_path.to_str().unwrap(),
            "hello",
            "hi",
            false,
            false,
            false,
        )
        .unwrap();

        assert_eq!(count, 2);
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hi world hi");
    }

    #[test]
    fn replace_in_file_handles_no_matches() {
        let dir = setup_test_dir("asteria_replace_no_match");
        let file_path = dir.join("g.txt");
        fs::write(&file_path, "hello world").unwrap();

        let count = replace_in_file(
            file_path.to_str().unwrap(),
            "zzz",
            "yyy",
            false,
            false,
            false,
        )
        .unwrap();

        assert_eq!(count, 0);
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello world");
    }

    #[test]
    fn build_pattern_escapes_literal() {
        let re = build_pattern("hello(", false, false, false).unwrap();
        assert!(re.is_match("hello("));
        assert!(!re.is_match("helloX"));
    }

    #[test]
    fn build_pattern_case_insensitive() {
        let re = build_pattern("hello", false, false, false).unwrap();
        assert!(re.is_match("Hello"));
        assert!(re.is_match("HELLO"));
    }

    #[test]
    fn build_pattern_case_sensitive() {
        let re = build_pattern("Hello", false, true, false).unwrap();
        assert!(re.is_match("Hello"));
        assert!(!re.is_match("hello"));
    }

    #[test]
    fn build_pattern_whole_word() {
        let re = build_pattern("foo", false, false, true).unwrap();
        assert!(re.is_match("foo bar"));
        assert!(!re.is_match("foobar"));
    }

    #[test]
    fn build_pattern_regex() {
        let re = build_pattern(r"cat\d+", true, false, false).unwrap();
        assert!(re.is_match("cat123"));
        assert!(!re.is_match("dog456"));
    }
}