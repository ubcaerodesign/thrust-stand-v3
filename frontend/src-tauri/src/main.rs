// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::sync::Mutex;
use tauri::api::process::{Command, CommandChild};
use tauri::Manager;

struct BackendProcess(Mutex<Option<CommandChild>>);

fn main() {
    tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            // Attempt to spawn the bundled backend sidecar if available
            if let Ok(cmd) = Command::new_sidecar("aerothrust-backend") {
                if let Ok((_rx, child)) = cmd.spawn() {
                    let state = app.state::<BackendProcess>();
                    *state.0.lock().unwrap() = Some(child);
                }
            }
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                // Statements ending with ';' drop temporary MutexGuards immediately
                let state = event.window().state::<BackendProcess>();
                let maybe_child = state.0.lock().unwrap().take();

                if let Some(child) = maybe_child {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}