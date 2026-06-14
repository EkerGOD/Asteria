mod commands;

use commands::file_ops::{
    create_dir, create_file, delete_path, list_dir, read_binary_file, read_file, rename_path,
    write_binary_file, write_file,
};
use commands::search::{cancel_search, replace_in_file_cmd, search_in_dir_cmd};

fn asteria_protocol(
    _ctx: tauri::UriSchemeContext<tauri::Wry>,
    request: tauri::http::Request<Vec<u8>>,
) -> tauri::http::Response<Vec<u8>> {
    let uri_str = request.uri().to_string();
    let path_str = uri_str
        .strip_prefix("asteria://")
        .unwrap_or(&uri_str)
        .trim_start_matches('/');
    let file_path = if cfg!(target_os = "windows") {
        path_str.to_string()
    } else {
        format!("/{}", path_str)
    };
    match std::fs::read(&file_path) {
        Ok(data) => {
            let mime = mime_from_ext(&file_path);
            tauri::http::Response::builder()
                .status(tauri::http::StatusCode::OK)
                .header("Content-Type", mime)
                .body(data)
                .unwrap()
        }
        Err(_) => tauri::http::Response::builder()
            .status(tauri::http::StatusCode::NOT_FOUND)
            .body(Vec::new())
            .unwrap(),
    }
}

fn mime_from_ext(path: &str) -> &str {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "tiff" | "tif" => "image/tiff",
        _ => "application/octet-stream",
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .register_uri_scheme_protocol("asteria", asteria_protocol)
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            write_binary_file,
            read_binary_file,
            list_dir,
            create_file,
            create_dir,
            delete_path,
            rename_path,
            search_in_dir_cmd,
            cancel_search,
            replace_in_file_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
