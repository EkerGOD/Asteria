mod commands;

use commands::file_ops::{
    create_dir, create_file, delete_path, list_dir, read_file, rename_path, write_file,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            list_dir,
            create_file,
            create_dir,
            delete_path,
            rename_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
