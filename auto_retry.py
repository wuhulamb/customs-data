#!/usr/bin/env python3
"""
一键重爬取流程：
1. 调用 verify_download.verify_data() 获取验证结果
2. 调用 check_csv.check_csv_file() 检查 CSV 文件合法性
3. 生成待重爬任务列表，自动更新 retry_download.js
4. 删除旧文件并移动新文件（可选）

用法:
    python3 auto_retry.py [--clean] [--move] [--check-csv]
    --clean     删除问题数据的旧文件
    --move      将当前目录的 CSV 移动到 downloads/
    --check-csv 检查 CSV 文件合法性
"""

import os
import json
import glob
import re
import argparse
from datetime import datetime
from pathlib import Path

# 导入现有模块
from verify_download import verify_data
from check_csv import check_csv_file

JSON_FILE = 'customs_data_status_full.json'
DATA_DIR = 'downloads'


def get_mismatch_results(results: list) -> list:
    """从 verify_result 结果中筛选不匹配的任务"""
    return [r for r in results if not r['matched']]


def print_mismatch_report(mismatch: list):
    """打印不匹配报告"""
    print("\n" + "=" * 90)
    print("需要重新爬取的任务")
    print("=" * 90)
    print(f"{'Task Name':<20} {'Expected':>12} {'Actual':>12} {'File Count':>8} {'Status':>20}")
    print("-" * 90)

    for task in mismatch:
        print(f"{task['name']:<20} {task['expected']:>12,} {task['actual']:>12,} {task['file_count']:>8} {task['reason']:>20}")

    print("-" * 90)
    print(f"共 {len(mismatch)} 个任务需要重爬\n")


def generate_retry_list(mismatch: list):
    """生成重爬任务 JSON 文件和 JS 配置"""
    tasks = []
    js_lines = []
    for t in mismatch:
        parts = t['name'].split('-')
        ietype_str, year, port = parts[0], parts[1], parts[2]
        ietype = 1 if ietype_str == 'import' else 0
        tasks.append({
            'iEType': ietype,
            'year': int(year),
            'port': port
        })
        js_lines.append(f"    {{ iEType: {ietype}, year: {year}, port: '{port}' }},  // {t['name']}: {t['expected']:,}条")

    output = {
        'tasks': tasks,
        'generated_at': datetime.now().isoformat()
    }
    with open('_retry_download_config.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    js_header = "// ==================== 配置 ====================\n"
    js_header += "  const RETRY_TASKS = [\n"
    js_footer = "\n  ];\n"
    js_body = "\n".join(js_lines)
    js_content = js_header + js_body + js_footer

    js_file = Path('retry_download.js')
    if js_file.exists():
        content = js_file.read_text(encoding='utf-8')
        regex_pattern = r'// ==================== 配置 ====================\s*const RETRY_TASKS = \[[\s\S]*?\];'
        new_content = re.sub(regex_pattern, js_content.strip(), content)
        js_file.write_text(new_content, encoding='utf-8')
        print(f"✅ 已更新 retry_download.js，包含 {len(tasks)} 个任务\n")
    else:
        print(f"⚠️ 未找到 retry_download.js，跳过更新\n")

    print(f"✅ 已生成 _retry_download_config.json\n")
    return output


def delete_old_files(mismatch: list):
    """删除不匹配任务的旧 CSV 文件"""
    deleted = 0
    for t in mismatch:
        pattern = os.path.join(DATA_DIR, f"{t['name']}*.csv")
        files = glob.glob(pattern)
        for fp in files:
            try:
                os.remove(fp)
                print(f"  删除：{fp}")
                deleted += 1
            except OSError as e:
                print(f"  删除失败：{fp}, {e}")

    print(f"\n✅ 删除了 {deleted} 个文件\n")
    return deleted


def move_new_files(mismatch: list = None):
    """将当前目录的 CSV 移动到 downloads/"""
    if not os.path.exists(JSON_FILE):
        print(f"❌ 未找到 {JSON_FILE}")
        return 0

    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 确保目标目录存在
    os.makedirs(DATA_DIR, exist_ok=True)

    moved = 0
    for task in data.get('data', []):
        name = task['name']
        pattern = f"{name}*.csv"

        files = glob.glob(pattern)
        for fp in files:
            try:
                dest = os.path.join(DATA_DIR, os.path.basename(fp))
                os.rename(fp, dest)
                print(f"  移动：{fp} -> {dest}")
                moved += 1
            except OSError as e:
                print(f"  移动失败：{fp}, {e}")

    print(f"\n✅ 移动了 {moved} 个文件\n")
    return moved


def check_invalid_csv_files():
    """使用 check_csv.py 检查 downloads/ 目录中的无效 CSV 文件"""
    print("\n检查 downloads/ 目录中的 CSV 文件合法性:")
    print("-" * 60)

    folder = Path(DATA_DIR)
    if not folder.exists():
        print(f"文件夹 {DATA_DIR} 不存在")
        return []

    csv_files = list(folder.glob("*.csv"))
    if not csv_files:
        print("未找到 CSV 文件")
        return []

    invalid_files = []
    for filepath in sorted(csv_files):
        valid, message = check_csv_file(filepath)
        status = "✓" if valid else "✗"
        print(f"{status} {filepath.name}: {message}")
        if not valid:
            invalid_files.append(filepath.name)

    if invalid_files:
        print(f"\n发现 {len(invalid_files)} 个无效文件")
    return invalid_files


def main():
    parser = argparse.ArgumentParser(description='自动重爬取流程')
    parser.add_argument('--clean', action='store_true', help='删除问题数据的旧文件')
    parser.add_argument('--move', action='store_true', help='将新下载的 CSV 移动到 downloads/')
    parser.add_argument('--check-csv', action='store_true', help='检查 CSV 文件合法性')
    args = parser.parse_args()

    # 步骤 1: 调用 verify_download.verify_data() 获取验证结果
    print("=" * 60)
    print("阶段 1: 运行 verify_download.py 验证数据完整性")
    print("=" * 60)

    if not os.path.exists(JSON_FILE):
        print(f"❌ 未找到 {JSON_FILE}，请先运行 search_and_save.js")
        return

    results = verify_data(JSON_FILE, DATA_DIR)

    # 可选：检查 CSV 文件合法性
    if args.check_csv:
        check_invalid_csv_files()

    # 步骤 2: 获取不匹配的任务
    print("\n" + "=" * 60)
    print("阶段 2: 分析数据完整性")
    print("-" * 60)

    mismatch = get_mismatch_results(results)

    if not mismatch:
        print("🎉 所有数据都已完整下载！")
        return

    # 加载重试记录
    print_mismatch_report(mismatch)

    # 步骤 3: 生成重爬配置
    print("阶段 3: 生成重爬配置文件")
    print("-" * 60)
    generate_retry_list(mismatch)

    # 步骤 4: 清理和移动
    if args.clean:
        print("阶段 4: 删除旧文件")
        print("-" * 60)
        delete_old_files(mismatch)

    if args.move:
        print("阶段 5: 移动新文件")
        print("-" * 60)
        move_new_files()

    print("=" * 60)
    print("下一步操作:")
    print("=" * 60)
    print("1. retry_download.js 已自动更新")
    print("2. 在浏览器中运行 retry_download.js")
    print("3. 下载完成后执行：python auto_retry.py --clean --move")
    print("=" * 60)


if __name__ == '__main__':
    main()
