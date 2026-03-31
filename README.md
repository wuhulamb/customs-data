# 中国海关进出口数据下载工具

用于从中国海关 `http://stats.customs.gov.cn/` 网站批量下载进出口贸易数据。

## 功能特点

- 遍历查询设置的年份数据（只能分年查询；分月查询需要修改js代码）
- 自动分段下载超过 10000 条记录的大数据
- 验证下载数据完整性
- 一键重爬失败数据

## 文件说明

### 浏览器脚本（在海关统计网站控制台运行）

| 文件名 | 功能 |
|--------|------|
| `search_and_save.js` | 遍历查询所有任务的数据量，保存为 JSON |
| `download.js` | 批量下载所有 CSV 数据，支持自动二分拆分 |
| `retry_download.js` | 重爬之前失败的任务，带重试机制 |
| `retry_download_debug.js` | 调试版重试脚本，带详细日志和数据验证 |
| `search.js` | 单个任务数据量查询示例 |
| `selectTableStates.js` | selectTableState 参数测试脚本 |

### Python 工具（本地运行）

| 文件名 | 功能 |
|--------|------|
| `verify_download.py` | 验证下载的 CSV 行数与预期是否匹配 |
| `check_csv.py` | 检查 CSV 文件格式、编码和表头 |
| `merge_csv.py` | 合并拆分的 CSV 文件，按年份生成合并文件 |
| `auto_retry.py` | 自动化重爬流程：验证 → 生成重试配置 |
| `cleanup_retry_files.py` | 清理需要重爬的旧文件 |
| `saveTable.py` | 格式化贸易港口编码文件（将网站上复制粘贴的 TRADE_PARTNERS 等编码转为CSV文件，方便填入js代码） |

## 使用流程

### 0. 设置货币类型（默认为人民币）

替换所有js文件中的 rmb 为 usd:

```bash
find . -type f -name "*.js" -exec sed -i "s/rmb/usd/g" {} \;
```

修改 `merge_csv.py` 和 `check_csv.py` 中的 EXPECTED_HEADERS 为 [..., "美元"]

### 1. 查询数据量

在海关统计网页浏览器控制台运行：

```javascript
// 根据需要修改 YEAR 变量
// 运行 search_and_save.js
```

会下载 `customs_data_status_full.json`，包含所有任务的预期数据量。

### 2. 下载数据

在同一页面控制台运行：

```javascript
// 在浏览器中设置保存数据的位置
// 根据需要修改 YEAR 变量
// 运行 download.js
```

如需中断，执行 `window.stopDownload = true`。

### 3. 验证完整性

本地运行：

```bash
python3 verify_download.py
```

对比预期与实际下载的行数。

### 4. 处理不完整数据

```bash
# 生成重爬列表并更新 retry_download.js
python3 auto_retry.py

# 同时删除旧文件、移动新文件到 downloads/ 目录
python3 auto_retry.py --clean --move

# 检查 CSV 编码合法性
python3 auto_retry.py --check-csv
```

然后在浏览器中运行更新后的 `retry_download.js`。

### 5. 合并 CSV 文件

将拆分的 CSV 文件按年份合并：

```bash
python3 merge_csv.py
```

生成 `merged_data/` 目录，包含 `import-YYYY.csv` 和 `export-YYYY.csv` 文件。

## 配置文件说明

### download.js

```javascript
const IE_TYPES = [1, 0];        // 1:进口，0:出口
const YEARS = [2021, 2022, 2023, 2024, 2025];
const TRADE_PORTS = ['11','12',...];  // 贸易口岸编码
const TRADE_PARTNERS = [...];   // 贸易伙伴编码
const TRADE_METHODS = [...];    // 贸易方式编码
const MAX_ROWS = 10000;         // 单文件最大行数
const SELECT_TABLE_STATE = {    // 不同年份需使用不同的表状态值
  2021: 2, 2022: 2, 2023: 2, 2024: 2, 2025: 1
};
```

## 目录结构

```
.
├── downloads/                # 下载的 CSV 数据存储目录
├── merged_data/              # 合并后的 CSV 文件（按年份）
├── customs_data_status_full.json  # 任务状态 JSON
├── search_and_save.js        # 查询脚本
├── download.js               # 下载脚本
├── retry_download.js         # 重试下载脚本
├── verify_download.py        # 验证脚本
├── check_csv.py              # CSV 检查脚本
├── merge_csv.py              # CSV 合并脚本
└── auto_retry.py             # 自动化流程脚本
```

## 注意事项

- 需在已登录状态下在浏览器控制台运行 JS 脚本
- CSV 文件使用 UTF-8 编码
- 大数据集会自动按贸易伙伴、贸易方式二分拆分
- 重试脚本会自动处理 HTTP 502/504 错误
