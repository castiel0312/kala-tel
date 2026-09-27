#!/usr/bin/env bash
# Hour 4 — Download raw data (RAW MEANS RAW: do not clean here)
#
# Run this on a machine WITH network access and WITH:
#   - kaggle CLI configured (~/.kaggle/kaggle.json)      [for Kaggle sources]
#   - huggingface_hub installed + `huggingface-cli login` [for HF sources]
#   - git                                                  [for GitHub sources]
#
# Every curl-based download is logged to data/raw/download_log.csv with:
# source, well, url, file_name, file_type, download_date, checksum

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG="$REPO_ROOT/data/raw/download_log.csv"

if [ ! -f "$LOG" ]; then
  echo "source,well,url,file_name,file_type,download_date,checksum" > "$LOG"
fi

fetch() {
  local source="$1"; local well="$2"; local url="$3"; local dest_dir="$4"
  local fname; fname=$(basename "$url")
  local dest_path="$REPO_ROOT/$dest_dir/$fname"
  mkdir -p "$REPO_ROOT/$dest_dir"
  echo "Downloading: $url"
  curl -L --fail -o "$dest_path" "$url"
  local ftype="${fname##*.}"
  local dl_date; dl_date=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local checksum; checksum=$(sha256sum "$dest_path" | awk '{print $1}')
  echo "${source},${well},${url},${fname},${ftype},${dl_date},${checksum}" >> "$LOG"
  echo "Logged -> $LOG"
}

# =============================================================================
# TIER 1 — direct HTTPS, no auth (verified working URLs, confirmed 2026-09-26)
# =============================================================================

# --- Utah FORGE Well 16B(78)-32 -- CONFIRMED direct zip/pdf links (gdr.openei.org) ---
fetch "FORGE16B" "16B(78)-32" "https://gdr.openei.org/files/1516/16B%20Daily%20Reports.zip"                 "data/raw/utah_forge"
fetch "FORGE16B" "16B(78)-32" "https://gdr.openei.org/files/1516/16B%20Mud%20Logs.zip"                       "data/raw/utah_forge"
fetch "FORGE16B" "16B(78)-32" "https://gdr.openei.org/files/1516/16B%20mud%20temp%20logs.zip"                "data/raw/utah_forge"
fetch "FORGE16B" "16B(78)-32" "https://gdr.openei.org/files/1516/16B%2878%29-32%20Well%20Survey.zip"         "data/raw/utah_forge"
fetch "FORGE16B" "16B(78)-32" "https://gdr.openei.org/files/1516/16B_Pason.zip"                              "data/raw/utah_forge"
fetch "FORGE16B" "16B(78)-32" "https://gdr.openei.org/files/1516/End%20of%20Well%20Report-16B78-32-May_2024.pdf" "data/raw/utah_forge"
fetch "FORGE16B" "16B(78)-32" "https://gdr.openei.org/files/1516/Utah%20Forge%20-%20Core%20Summary.pdf"      "data/raw/utah_forge"

# --- Utah FORGE Well 78B-32 -- verify exact filenames at the dataset page below
#     (page: https://catalog.data.gov/dataset/utah-forge-well-78b-32-daily-drilling-reports-and-logs)
#     then uncomment / fill in real gdr.openei.org URLs the same way as 16B above:
# fetch "FORGE78B" "78B-32" "https://gdr.openei.org/files/<ID>/<file>.zip" "data/raw/utah_forge"

# --- Utah FORGE Well 56-32 (data.amerigeoss.org mirror) -- verify filenames at:
#     https://data.amerigeoss.org/dataset/utah-forge-well-56-32-drilling-data-and-logs-64155
# fetch "FORGE56_32" "56-32" "<direct-url>" "data/raw/utah_forge"

echo "Tier 1 (direct HTTPS) downloads complete."

# =============================================================================
# TIER 2 — git clone (GitHub repos: FORCE 2020, 3W, torque/drag, stuck pipe, etc.)
# Logged separately below since these aren't single-file curl downloads.
# =============================================================================

GIT_LOG="$REPO_ROOT/data/raw/git_clone_log.csv"
if [ ! -f "$GIT_LOG" ]; then
  echo "source,url,clone_path,clone_date" > "$GIT_LOG"
fi

git_fetch() {
  local source="$1"; local url="$2"; local dest_dir="$3"
  local name; name=$(basename "$url" .git)
  local dest_path="$REPO_ROOT/$dest_dir/$name"
  echo "Cloning: $url"
  git clone --depth 1 "$url" "$dest_path"
  local dt; dt=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "${source},${url},${dest_dir}/${name},${dt}" >> "$GIT_LOG"
}

# Core Day-1 source (lithology data lives directly in this repo)
git_fetch "FORCE2020" "https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition" "data/raw/force2020"

# Hazard-specific ML task repos -> see data/ml_task_registry.csv for the full catalog.
# Uncomment what you actually need; don't clone all of these blindly (see NWIS dossier's
# note against "downloading every dataset you've listed").
# git_fetch "3W"            "https://github.com/petrobras/3W"                                   "data/raw/ml_tasks"
# git_fetch "TORQUE_DRAG"   "https://github.com/pro-well-plan/torque_drag.git"                   "data/raw/ml_tasks"
# git_fetch "STUCKPIPE_1"   "https://github.com/HaythamElmousalami/Drilling-Stuck-Pipe-Prediction.git" "data/raw/ml_tasks"
# git_fetch "FORCE2020_ALT" "https://github.com/yudhaadi77/force2020-lithology-prediction.git"   "data/raw/ml_tasks"
# git_fetch "VOLVE_R"       "https://github.com/f0nzie/volve-drilling"                            "data/raw/ml_tasks"

echo "Tier 2 (git clone) complete."

# =============================================================================
# TIER 3 — auth-required (Kaggle CLI / huggingface_hub) — run these separately,
# they are NOT curl-able directly.
# =============================================================================
cat <<'EOF'

--- TIER 3: run these manually (need credentials configured) ---

# Kaggle (requires ~/.kaggle/kaggle.json):
kaggle datasets download -d imranulhaquenoor/volve-dataset-well-f-9-a -p data/raw/volve --unzip
kaggle datasets download -d ahmedelbashir99/drilling-log-dataset -p data/raw/ml_tasks --unzip
kaggle datasets download -d afrniomelo/3w-dataset -p data/raw/ml_tasks --unzip
kaggle datasets download -d banlevan/oil-and-gas-production-data -p data/raw/ml_tasks --unzip

# Hugging Face (requires `huggingface-cli login`):
python3 -c "from huggingface_hub import snapshot_download; \
  snapshot_download(repo_id='bengsoon/volve_daily_drilling_report', \
  repo_type='dataset', local_dir='data/raw/volve/ddr_hf')"

EOF

echo "Done. Review data/raw/download_log.csv and data/raw/git_clone_log.csv for what was fetched."
