#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Project {
    id: String,
    name: String,
    app_id: String,
    version: String,
    description: String,
    source_path: String,
    icon_path: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct LogLine {
    t: i64,
    line: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Job {
    id: String,
    project_id: String,
    project_name: String,
    target: String,
    status: String,
    logs: Vec<LogLine>,
    created_at: String,
    finished_at: Option<String>,
    artifact_id: Option<String>,
    error: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Artifact {
    id: String,
    job_id: String,
    project_id: String,
    name: String,
    path: String,
    size: u64,
    target: String,
    created_at: String,
}

#[derive(Default, Serialize, Deserialize)]
struct StoreData {
    projects: Vec<Project>,
    jobs: Vec<Job>,
    artifacts: Vec<Artifact>,
}

struct Store {
    file: PathBuf,
    data: StoreData,
}

impl Store {
    fn load(data_dir: &Path) -> Result<Self, String> {
        fs::create_dir_all(data_dir).map_err(err)?;
        let file = data_dir.join("buildmuhely.json");
        let data = if file.exists() {
            let raw = fs::read_to_string(&file).map_err(err)?;
            serde_json::from_str(&raw).unwrap_or_default()
        } else {
            StoreData::default()
        };
        Ok(Self { file, data })
    }

    fn save(&self) -> Result<(), String> {
        let tmp = self.file.with_extension("json.tmp");
        let raw = serde_json::to_string_pretty(&self.data).map_err(err)?;
        fs::write(&tmp, raw).map_err(err)?;
        fs::rename(&tmp, &self.file).map_err(err)?;
        Ok(())
    }
}

struct RunningBuild {
    job_id: String,
    pid: u32,
    stdin: ChildStdin,
}

struct AppState {
    data_dir: PathBuf,
    store: Mutex<Store>,
    running: Mutex<Option<RunningBuild>>,
}

impl AppState {
    fn new(data_dir: PathBuf) -> Result<Self, String> {
        for sub in ["projects", "builds", "artifacts"] {
            fs::create_dir_all(data_dir.join(sub)).map_err(err)?;
        }
        let store = Store::load(&data_dir)?;
        Ok(Self {
            data_dir,
            store: Mutex::new(store),
            running: Mutex::new(None),
        })
    }
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn is_valid_app_id(value: &str) -> bool {
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() < 2 {
        return false;
    }
    parts.iter().all(|part| {
        let mut chars = part.chars();
        match chars.next() {
            Some(c) if c.is_ascii_alphabetic() => {}
            _ => return false,
        }
        chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
    })
}

fn is_valid_version(value: &str) -> bool {
    let core = value.split(|c| c == '-' || c == '+').next().unwrap_or("");
    let parts: Vec<&str> = core.split('.').collect();
    parts.len() == 3 && parts.iter().all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()))
}

fn sanitize_file_name(value: &str) -> String {
    let mut out = String::new();
    for c in value.chars() {
        if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
            out.push(c);
        } else {
            out.push('_');
        }
    }
    let trimmed = out.trim_matches('_');
    if trimmed.is_empty() {
        "alkalmazas".to_string()
    } else {
        trimmed.to_string()
    }
}

fn runner_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dev = Path::new(env!("CARGO_MANIFEST_DIR")).join("../scripts/build-runner.mjs");
    if dev.exists() {
        return Ok(dev);
    }
    let resource = app
        .path()
        .resource_dir()
        .map_err(err)?
        .join("scripts/build-runner.mjs");
    if resource.exists() {
        Ok(resource)
    } else {
        Err("Nem található a build runner erőforrás.".to_string())
    }
}

fn node_command() -> Command {
    Command::new("node")
}

fn ensure_sample_project(state: &AppState) -> Result<(), String> {
    let mut store = state.store.lock().map_err(err)?;
    if !store.data.projects.is_empty() {
        return Ok(());
    }
    let id = Uuid::new_v4().to_string();
    let source = state.data_dir.join("projects").join(&id).join("source");
    fs::create_dir_all(&source).map_err(err)?;
    fs::write(
        source.join("index.html"),
        include_str!("../../samples/hello-web/index.html"),
    )
    .map_err(err)?;
    store.data.projects.push(Project {
        id,
        name: "Hello BuildMűhely".into(),
        app_id: "hu.buildmuhely.hello".into(),
        version: "1.0.0".into(),
        description: "Mintaprojekt, amin kipróbálhatod a fordítást.".into(),
        source_path: source.to_string_lossy().to_string(),
        icon_path: None,
        created_at: now(),
        updated_at: now(),
    });
    store.save()
}

fn append_log(state: &AppState, job_id: &str, line: String) {
    if let Ok(mut store) = state.store.lock() {
        if let Some(job) = store.data.jobs.iter_mut().find(|j| j.id == job_id) {
            job.logs.push(LogLine {
                t: Utc::now().timestamp_millis(),
                line,
            });
            if job.logs.len() > 3000 {
                let excess = job.logs.len() - 3000;
                job.logs.drain(0..excess);
            }
            let _ = store.save();
        }
    }
}

fn kill_process(pid: u32) {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
    }
}

#[tauri::command]
fn health() -> Value {
    json!({ "ok": true, "app": "BuildMűhely", "demoMode": false, "runtime": "tauri" })
}

#[tauri::command]
fn environment(app: AppHandle) -> Result<Value, String> {
    let runner = runner_path(&app)?;
    let output = node_command().arg(runner).arg("env").output();
    match output {
        Ok(output) if output.status.success() => {
            let value: Value = serde_json::from_slice(&output.stdout).map_err(err)?;
            Ok(value)
        }
        _ => Ok(json!({
            "node": "nem található",
            "npm": false,
            "java": false,
            "javac": false,
            "javaVersion": null,
            "gradle": false,
            "adb": false,
            "androidHome": null,
            "androidSdk": false,
            "platform": std::env::consts::OS,
            "canBuildWindows": false,
            "canBuildAndroid": false
        })),
    }
}

#[tauri::command]
fn list_projects(state: State<Arc<AppState>>) -> Result<Vec<Project>, String> {
    let store = state.store.lock().map_err(err)?;
    Ok(store.data.projects.clone())
}

#[tauri::command]
fn create_sample_project(state: State<Arc<AppState>>) -> Result<Project, String> {
    let id = Uuid::new_v4().to_string();
    let source = state.data_dir.join("projects").join(&id).join("source");
    fs::create_dir_all(&source).map_err(err)?;
    fs::write(
        source.join("index.html"),
        include_str!("../../samples/hello-web/index.html"),
    )
    .map_err(err)?;
    let project = Project {
        id,
        name: "Új mintaprojekt".into(),
        app_id: format!("hu.buildmuhely.sample{}", Utc::now().timestamp_millis()),
        version: "1.0.0".into(),
        description: String::new(),
        source_path: source.to_string_lossy().to_string(),
        icon_path: None,
        created_at: now(),
        updated_at: now(),
    };
    let mut store = state.store.lock().map_err(err)?;
    store.data.projects.push(project.clone());
    store.save()?;
    Ok(project)
}

fn safe_zip_name(name: &str) -> bool {
    if name.is_empty() || name.contains('\\') || name.starts_with('/') {
        return false;
    }
    if name.split(':').next().map(|s| s.len() == 1).unwrap_or(false) {
        return false;
    }
    name.split('/').all(|part| part != "..")
}

fn find_web_root(dir: &Path) -> Result<Option<PathBuf>, String> {
    if dir.join("index.html").exists() {
        return Ok(Some(dir.to_path_buf()));
    }
    for entry in fs::read_dir(dir).map_err(err)? {
        let entry = entry.map_err(err)?;
        let path = entry.path();
        if path.is_dir() && path.join("index.html").exists() {
            return Ok(Some(path));
        }
    }
    Ok(None)
}

#[tauri::command]
fn import_project_zip(state: State<Arc<AppState>>, path: String) -> Result<Project, String> {
    let zip_path = PathBuf::from(&path);
    let file = fs::File::open(&zip_path).map_err(err)?;
    let mut archive = zip::ZipArchive::new(file).map_err(err)?;
    let id = Uuid::new_v4().to_string();
    let project_dir = state.data_dir.join("projects").join(&id);
    let extract_dir = project_dir.join("extracted");
    fs::create_dir_all(&extract_dir).map_err(err)?;

    let mut total: u64 = 0;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(err)?;
        let name = entry.name().to_string();
        if !safe_zip_name(&name) {
            return Err("A ZIP érvénytelen útvonalat tartalmaz.".into());
        }
        total += entry.size();
        if total > 500 * 1024 * 1024 {
            return Err("A ZIP kicsomagolt mérete túl nagy.".into());
        }
        let dest = extract_dir.join(&name);
        if name.ends_with('/') {
            fs::create_dir_all(&dest).map_err(err)?;
        } else {
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(err)?;
            }
            let mut out = fs::File::create(&dest).map_err(err)?;
            std::io::copy(&mut entry, &mut out).map_err(err)?;
        }
    }

    let web_root = find_web_root(&extract_dir)?
        .ok_or_else(|| "Nem található index.html a ZIP-ben.".to_string())?;
    let source = project_dir.join("source");
    fs::rename(&web_root, &source).map_err(err)?;

    let name = zip_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Importált projekt".into());
    let project = Project {
        id: id.clone(),
        name: name.chars().take(120).collect(),
        app_id: format!("hu.buildmuhely.{}", &id[..8]),
        version: "1.0.0".into(),
        description: String::new(),
        source_path: source.to_string_lossy().to_string(),
        icon_path: None,
        created_at: now(),
        updated_at: now(),
    };
    let mut store = state.store.lock().map_err(err)?;
    store.data.projects.push(project.clone());
    store.save()?;
    Ok(project)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectPatch {
    name: Option<String>,
    app_id: Option<String>,
    version: Option<String>,
    description: Option<String>,
}

#[tauri::command]
fn update_project(
    state: State<Arc<AppState>>,
    id: String,
    patch: ProjectPatch,
) -> Result<Project, String> {
    let mut store = state.store.lock().map_err(err)?;
    let project = store
        .data
        .projects
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| "Nincs ilyen projekt.".to_string())?;
    if let Some(name) = patch.name {
        let name = name.trim().to_string();
        if name.is_empty() {
            return Err("A projektnév nem lehet üres.".into());
        }
        project.name = name.chars().take(120).collect();
    }
    if let Some(app_id) = patch.app_id {
        if !is_valid_app_id(&app_id) {
            return Err("Érvénytelen csomagazonosító (pl. hu.cegnev.app).".into());
        }
        project.app_id = app_id;
    }
    if let Some(version) = patch.version {
        if !is_valid_version(&version) {
            return Err("A verzió ilyen alakú legyen: 1.0.0".into());
        }
        project.version = version;
    }
    if let Some(description) = patch.description {
        project.description = description.chars().take(500).collect();
    }
    project.updated_at = now();
    let result = project.clone();
    store.save()?;
    Ok(result)
}

#[tauri::command]
fn delete_project(state: State<Arc<AppState>>, id: String) -> Result<Value, String> {
    let mut store = state.store.lock().map_err(err)?;
    store.data.projects.retain(|p| p.id != id);
    store.save()?;
    let _ = fs::remove_dir_all(state.data_dir.join("projects").join(id));
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn list_jobs(state: State<Arc<AppState>>) -> Result<Vec<Job>, String> {
    let store = state.store.lock().map_err(err)?;
    Ok(store.data.jobs.clone())
}

#[tauri::command]
fn get_job(state: State<Arc<AppState>>, id: String) -> Result<Job, String> {
    let store = state.store.lock().map_err(err)?;
    store
        .data
        .jobs
        .iter()
        .find(|j| j.id == id)
        .cloned()
        .ok_or_else(|| "Nincs ilyen feladat.".into())
}

#[tauri::command]
fn list_artifacts(state: State<Arc<AppState>>) -> Result<Vec<Artifact>, String> {
    let store = state.store.lock().map_err(err)?;
    Ok(store.data.artifacts.clone())
}

#[tauri::command]
fn copy_artifact(
    state: State<Arc<AppState>>,
    id: String,
    destination: String,
) -> Result<Value, String> {
    let store = state.store.lock().map_err(err)?;
    let artifact = store
        .data
        .artifacts
        .iter()
        .find(|a| a.id == id)
        .ok_or_else(|| "Nincs ilyen fájl.".to_string())?;
    fs::copy(&artifact.path, &destination).map_err(err)?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn start_build(
    app: AppHandle,
    state: State<Arc<AppState>>,
    project_id: String,
    target: String,
) -> Result<Job, String> {
    if target != "windows" && target != "android" {
        return Err("Érvénytelen cél.".into());
    }
    {
        let running = state.running.lock().map_err(err)?;
        if running.is_some() {
            return Err("Már fut egy fordítás. Várd meg, míg befejeződik, vagy szakítsd meg.".into());
        }
    }

    let project = {
        let store = state.store.lock().map_err(err)?;
        store
            .data
            .projects
            .iter()
            .find(|p| p.id == project_id)
            .cloned()
            .ok_or_else(|| "Nincs ilyen projekt.".to_string())?
    };
    if !Path::new(&project.source_path).join("index.html").exists() {
        return Err("A projektben nem található index.html.".into());
    }

    let job_id = Uuid::new_v4().to_string();
    let workspace = state.data_dir.join("builds").join(&job_id);
    fs::create_dir_all(&workspace).map_err(err)?;
    let job = Job {
        id: job_id.clone(),
        project_id: project.id.clone(),
        project_name: project.name.clone(),
        target: target.clone(),
        status: "running".into(),
        logs: vec![LogLine {
            t: Utc::now().timestamp_millis(),
            line: format!(
                "Fordítás indítása: {} → {}",
                project.name,
                if target == "windows" {
                    "Windows EXE"
                } else {
                    "Android APK"
                }
            ),
        }],
        created_at: now(),
        finished_at: None,
        artifact_id: None,
        error: None,
    };
    {
        let mut store = state.store.lock().map_err(err)?;
        store.data.jobs.insert(0, job.clone());
        store.save()?;
    }

    let request = json!({
        "project": project,
        "target": target,
        "workspace": workspace.to_string_lossy(),
    });
    let request_path = workspace.join("request.json");
    fs::write(&request_path, serde_json::to_vec_pretty(&request).map_err(err)?).map_err(err)?;

    let runner = runner_path(&app)?;
    let mut child = node_command()
        .arg(runner)
        .arg("build")
        .arg(&request_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Nem indítható a Node.js build runner: {e}. Telepítsd a Node.js-t."))?;

    let stdin = child.stdin.take().ok_or_else(|| "Nem nyitható meg a build runner bemenete.".to_string())?;
    let stdout = child.stdout.take().ok_or_else(|| "Nem olvasható a build runner kimenete.".to_string())?;
    let stderr = child.stderr.take().ok_or_else(|| "Nem olvasható a build runner hibakimenete.".to_string())?;
    let pid = child.id();
    {
        let mut running = state.running.lock().map_err(err)?;
        *running = Some(RunningBuild {
            job_id: job_id.clone(),
            pid,
            stdin,
        });
    }

    let state2 = state.inner().clone();
    let job_id2 = job_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            if !line.trim().is_empty() {
                append_log(&state2, &job_id2, line);
            }
        }
    });

    let state3 = state.inner().clone();
    let job_id3 = job_id.clone();
    let project2 = project.clone();
    let target2 = target.clone();
    std::thread::spawn(move || {
        let mut artifact_path: Option<String> = None;
        let mut build_error: Option<String> = None;
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<Value>(&line) {
                Ok(value) => match value.get("type").and_then(Value::as_str) {
                    Some("log") => {
                        if let Some(text) = value.get("line").and_then(Value::as_str) {
                            append_log(&state3, &job_id3, text.to_string());
                        }
                    }
                    Some("done") => {
                        artifact_path = value
                            .get("artifactPath")
                            .and_then(Value::as_str)
                            .map(str::to_string);
                    }
                    Some("error") => {
                        build_error = value
                            .get("message")
                            .and_then(Value::as_str)
                            .map(str::to_string);
                    }
                    _ => append_log(&state3, &job_id3, line),
                },
                Err(_) => append_log(&state3, &job_id3, line),
            }
        }

        let status = child.wait();
        {
            let mut running = state3.running.lock().unwrap();
            if running.as_ref().map(|r| r.job_id == job_id3).unwrap_or(false) {
                *running = None;
            }
        }

        let mut store = state3.store.lock().unwrap();
        let cancelled = store
            .data
            .jobs
            .iter()
            .find(|j| j.id == job_id3)
            .map(|j| j.status == "cancelled")
            .unwrap_or(false);
        if cancelled {
            return;
        }

        let exit_ok = status.as_ref().map(|s| s.success()).unwrap_or(false);
        if exit_ok && artifact_path.is_some() {
            let source = artifact_path.unwrap();
            let artifact_id = Uuid::new_v4().to_string();
            let ext = Path::new(&source)
                .extension()
                .map(|s| format!(".{}", s.to_string_lossy()))
                .unwrap_or_else(|| if target2 == "windows" { ".exe".into() } else { ".apk".into() });
            let file_name = format!(
                "{}-{}-{}{}",
                sanitize_file_name(&project2.name),
                project2.version,
                target2,
                ext
            );
            let dest_dir = state3.data_dir.join("artifacts").join(&artifact_id);
            let copy_result = fs::create_dir_all(&dest_dir).and_then(|_| {
                let dest = dest_dir.join(&file_name);
                fs::copy(&source, &dest)?;
                Ok(dest)
            });
            match copy_result {
                Ok(dest) => {
                    let size = fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);
                    store.data.artifacts.push(Artifact {
                        id: artifact_id.clone(),
                        job_id: job_id3.clone(),
                        project_id: project2.id.clone(),
                        name: file_name.clone(),
                        path: dest.to_string_lossy().to_string(),
                        size,
                        target: target2.clone(),
                        created_at: now(),
                    });
                    if let Some(job) = store.data.jobs.iter_mut().find(|j| j.id == job_id3) {
                        job.status = "succeeded".into();
                        job.finished_at = Some(now());
                        job.artifact_id = Some(artifact_id);
                        job.logs.push(LogLine {
                            t: Utc::now().timestamp_millis(),
                            line: format!("Kész: {file_name}"),
                        });
                    }
                }
                Err(e) => {
                    if let Some(job) = store.data.jobs.iter_mut().find(|j| j.id == job_id3) {
                        job.status = "failed".into();
                        job.finished_at = Some(now());
                        job.error = Some(format!("Nem menthető a kész fájl: {e}"));
                    }
                }
            }
        } else {
            let message = build_error
                .or_else(|| status.as_ref().err().map(|e| e.to_string()))
                .unwrap_or_else(|| "A build runner hibával állt le.".into());
            if let Some(job) = store.data.jobs.iter_mut().find(|j| j.id == job_id3) {
                job.status = "failed".into();
                job.finished_at = Some(now());
                job.error = Some(message.clone());
                job.logs.push(LogLine {
                    t: Utc::now().timestamp_millis(),
                    line: format!("Hiba: {message}"),
                });
            }
        }
        let _ = store.save();
    });

    Ok(job)
}

#[tauri::command]
fn cancel_build(state: State<Arc<AppState>>, job_id: String) -> Result<Value, String> {
    let mut running = state.running.lock().map_err(err)?;
    let Some(build) = running.as_mut() else {
        return Err("Ez a feladat nem szakítható meg.".into());
    };
    if build.job_id != job_id {
        return Err("Ez a feladat nem szakítható meg.".into());
    }
    let message = json!({ "type": "cancel" }).to_string();
    if writeln!(build.stdin, "{message}").and_then(|_| build.stdin.flush()).is_err() {
        kill_process(build.pid);
    }
    let mut store = state.store.lock().map_err(err)?;
    if let Some(job) = store.data.jobs.iter_mut().find(|j| j.id == job_id) {
        job.status = "cancelled".into();
        job.finished_at = Some(now());
    }
    store.save()?;
    Ok(json!({ "ok": true }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_id_validation() {
        assert!(is_valid_app_id("hu.buildmuhely.app"));
        assert!(is_valid_app_id("com.example.my_app"));
        assert!(!is_valid_app_id("app"));
        assert!(!is_valid_app_id("hu..app"));
        assert!(!is_valid_app_id("hu.1app"));
    }

    #[test]
    fn version_validation() {
        assert!(is_valid_version("1.0.0"));
        assert!(is_valid_version("2.3.4-beta.1"));
        assert!(!is_valid_version("1.0"));
        assert!(!is_valid_version("abc"));
    }

    #[test]
    fn file_name_sanitization() {
        assert_eq!(sanitize_file_name("Hello Vilag!"), "Hello_Vilag");
        assert_eq!(sanitize_file_name(""), "alkalmazas");
    }

    #[test]
    fn zip_entry_safety() {
        assert!(safe_zip_name("index.html"));
        assert!(safe_zip_name("assets/app.js"));
        assert!(!safe_zip_name("../evil"));
        assert!(!safe_zip_name("a/../../evil"));
        assert!(!safe_zip_name("/etc/passwd"));
        assert!(!safe_zip_name("C:\\evil"));
        assert!(!safe_zip_name("a\\b"));
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?
                .join("BuildMuhely");
            let state = Arc::new(
                AppState::new(data_dir)
                    .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?,
            );
            ensure_sample_project(&state)
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            health,
            environment,
            list_projects,
            create_sample_project,
            import_project_zip,
            update_project,
            delete_project,
            list_jobs,
            get_job,
            list_artifacts,
            copy_artifact,
            start_build,
            cancel_build
        ])
        .run(tauri::generate_context!())
        .expect("Hiba a BuildMűhely indításakor");
}
