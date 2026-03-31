#!/usr/bin/env python3
"""
验证下载数据完整性
读取 customs_data_status_full.json，对比 downloads/ 目录下实际下载的 CSV 文件行数
"""

import json
import glob
import os
from pathlib import Path


def count_csv_lines(file_pattern: str) -> tuple[int, int]:
    """
    统计匹配文件的总行数（减去表头）
    返回：(实际数据行数，文件数量)
    """
    files = glob.glob(file_pattern)
    if not files:
        return 0, 0

    total_lines = 0
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            # 计算行数（包含表头）
            lines = f.readlines()
            total_lines += len(lines)

    # 减去每个文件的表头（1 行）
    data_rows = total_lines - len(files)
    return data_rows, len(files)


def verify_data(json_path: str, data_dir: str = 'downloads'):
    """验证下载数据完整性"""

    # 加载 JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print('=' * 80)
    print('下载数据完整性验证报告')
    print('=' * 80)
    print(f"\nJSON 文件：{json_path}")
    print(f"数据目录：{data_dir}/")
    print(f"生成时间：{data.get('generatedAt', 'N/A')}")
    print(f"\n{'=' * 80}\n")

    results = []
    match_count = 0
    mismatch_count = 0
    missing_count = 0

    for task in data.get('data', []):
        name = task['name']  # 如 import-2021-11
        expected = task.get('count', 0)
        status = task.get('status', 'unknown')

        # 查找对应的 CSV 文件
        pattern = os.path.join(data_dir, f"{name}*.csv")
        actual, file_count = count_csv_lines(pattern)

        # 判断是否匹配
        if status == 'error':
            result = {
                'name': name,
                'expected': expected,
                'actual': 0,
                'file_count': 0,
                'matched': False,
                'reason': '查询失败'
            }
            missing_count += 1
        elif file_count == 0:
            result = {
                'name': name,
                'expected': expected,
                'actual': 0,
                'file_count': 0,
                'matched': False,
                'reason': '未找到文件' if expected > 0 else '无数据'
            }
            if expected > 0:
                missing_count += 1
        elif abs(actual - expected) > 0:
            result = {
                'name': name,
                'expected': expected,
                'actual': actual,
                'file_count': file_count,
                'matched': False,
                'reason': f'差异 {actual - expected:+,}条'
            }
            mismatch_count += 1
        else:
            result = {
                'name': name,
                'expected': expected,
                'actual': actual,
                'file_count': file_count,
                'matched': True,
                'reason': 'OK'
            }
            match_count += 1

        results.append(result)

    # 打印表格
    print(f"{'Task Name':<20} {'Expected':>12} {'Actual':>12} {'File Count':>8} {'Status':>20}")
    print('-' * 80)

    for r in results:
        status_str = '✓' if r['matched'] else f"✗ ({r['reason']})"
        print(f"{r['name']:<20} {r['expected']:>12,} {r['actual']:>12,} {r['file_count']:>8} {status_str:>20}")

    # 总结
    print('\n' + '=' * 80)
    print('总结')
    print('=' * 80)
    print(f"  匹配：{match_count}")
    print(f"  不匹配：{mismatch_count}")
    print(f"  缺失：{missing_count}")
    print(f"  总计：{len(results)}")

    total_expected = sum(r['expected'] for r in results)
    total_actual = sum(r['actual'] for r in results)
    print(f"\n  总记录数（实际/理论）：{total_actual:,} / {total_expected:,}")

    return results


if __name__ == '__main__':
    json_file = 'customs_data_status_full.json'
    verify_data(json_file)
