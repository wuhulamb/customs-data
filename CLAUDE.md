# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Customs data scraping toolkit for China Customs Statistics website (`stats.customs.gov.cn`). The system queries and downloads import/export trade data, handles partial failures through automated retry workflows.

## Architecture

**Two-tier design:** Browser console scripts perform API calls/downloads; Python scripts verify and orchestrate.

### Data Flow

1. `search_and_save.js` → Queries all task combinations → outputs `customs_data_status_full.json`
2. `download.js` → Downloads CSV files using binary splitting when records exceed 10,000 rows
3. `verify_download.py` → Compares JSON expectations vs actual CSV line counts in `downloads/` directory
4. `auto_retry.py` → Generates retry config for mismatched tasks → updates `retry_download.js`
5. `retry_download.js` → Re-downloads failed tasks with HTTP 502/504 retry logic
6. `merge_csv.py` → Merges split CSV files into annual consolidated reports (`merged_data/import-YYYY.csv`, `export-YYYY.csv`)

### Key Files

| File | Language | Purpose |
|------|----------|---------|
| `search_and_save.js` | JS (browser) | Query record counts for all ieType/year/port combinations |
| `download.js` | JS (browser) | Download CSV data; splits requests using binary partitioning |
| `retry_download.js` | JS (browser) | Retry downloads with 3x attempt handling for server errors |
| `verify_download.py` | Python | Validate CSV row counts match expected values from JSON |
| `auto_retry.py` | Python | Orchestrate full verification + retry workflow |
| `check_csv.py` | Python | Validate UTF-8 encoding, CSV structure and headers |
| `merge_csv.py` | Python | Merge split CSV files into annual consolidated reports |

### Core Configuration

```javascript
const IE_TYPES = [1, 0];        // 1: import, 0: export
const YEARS = [2021, 2022, 2023, 2024, 2025];
const MAX_ROWS = 10000;         // Max rows per download request
const SELECT_TABLE_STATE = {    // Year-specific table states
  2021: 2, 2022: 2, 2023: 2, 2024: 2, 2025: 1
};
```

Naming convention: `{type}-{year}-{port}` (e.g., `import-2025-44`)

## Common Commands

### Full Workflow

```bash
# Step 1: In browser console at stats.customs.gov.cn
- Run search_and_save.js → saves customs_data_status_full.json

# Step 2: Download data in browser
- Run download.js

# Step 3: Verify completeness locally
python3 verify_download.py

# Step 4: Auto-generate retry tasks for mismatches
python3 auto_retry.py [--clean] [--move] [--check-csv]

# Step 5: Retrying failed downloads in browser
- Run updated retry_download.js

# Step 6: Merge downloaded CSV files into annual reports
python3 merge_csv.py
```

### Individual Tools

```bash
# Check specific JSON file against downloads/ directory
python3 verify_download.py

# Validate CSV encoding (UTF-8) and structure
python3 check_csv.py

# Merge split CSV files into annual reports (import-YYYY.csv, export-YYYY.csv)
python3 merge_csv.py

# Generate retry list only (no cleanup)
python3 auto_retry.py

# With cleanup: delete failed CSVs, move successful ones to downloads/
python3 auto_retry.py --clean --move
```

## Technical Details

- Responses are GBK-encoded CSV; decode to UTF-8 after stripping newlines within quoted fields
- Binary splitting partitions by trade partners first, then trade methods
-中断 downloads via `window.stopDownload = true` in browser console
- Data stored in `downloads/` directory with pattern `{type}-{year}-{port}[_p1-N][_m1-N].csv`
- Merged data stored in `merged_data/` with pattern `{type}-{year}.csv` (13 standard columns)