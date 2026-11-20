// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::sync::Mutex;
use tauri::api::process::{Command, CommandChild};
use tauri::Manager;

struct BackendProcess(Mutex<Option<CommandChild>>);

fn kill_backend(state: &BackendProcess) {
    if let Some(child) = state.0.lock().unwrap().take() {
        #[cfg(target_os = "windows")]
        {
            let pid = child.pid();
            use std::os::windows::process::CommandExt;
            // CREATE_NO_WINDOW (0x08000000) prevents a console window from flashing
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .creation_flags(0x08000000)
                .output();
        }
        let _ = child.kill();
    }
}

fn main() {
    tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            // Clean up any stale backend processes before spawning a new instance
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/IM", "aerothrust-backend.exe"])
                    .creation_flags(0x08000000)
                    .output();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("pkill")
                    .args(["-f", "aerothrust-backend"])
                    .output();
            }

            // Attempt to spawn the bundled backend sidecar if available
            if let Ok(cmd) = Command::new_sidecar("aerothrust-backend") {
                if let Ok((mut rx, child)) = cmd.spawn() {
                    // Continuously drain sidecar stdout/stderr so OS pipe buffers never block Python
                    tauri::async_runtime::spawn(async move {
                        while let Some(_event) = rx.recv().await {}
                    });
                    let state = app.state::<BackendProcess>();
                    *state.0.lock().unwrap() = Some(child);
                }
            }
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                let state = event.window().state::<BackendProcess>();
                kill_backend(&state);
            }
        })
        .build(tauri::generate_context!())
        .expect("Error while running Tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
                let state = app_handle.state::<BackendProcess>();
                kill_backend(&state);
            }
        });
}