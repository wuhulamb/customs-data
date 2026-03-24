#!/usr/bin/env python3
"""检查 CSV 文件是否合法"""

import csv
import os
from pathlib import Path

# 海关统计数据标准表头
EXPECTED_HEADERS = [
    "商品编码", "商品名称",
    "贸易伙伴编码", "贸易伙伴名称",
    "贸易方式编码", "贸易方式名称",
    "注册地编码", "注册地名称",
    "第一数量", "第一计量单位",
    "第二数量", "第二计量单位",
    "人民币"
]

def check_csv_file(filepath):
    """检查单个 CSV 文件是否合法"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader, None)

            if headers is None:
                return False, "文件为空"

            # 检查前 13 列表头是否匹配（忽略后续可能的空列或'备注'列）
            actual_headers_13 = headers[:13]
            if actual_headers_13 != EXPECTED_HEADERS:
                # 查找差异
                missing_in_file = set(EXPECTED_HEADERS) - set(actual_headers_13)
                extra_in_file = set(actual_headers_13) - set(EXPECTED_HEADERS)
                msg = f"表头不匹配（应={len(EXPECTED_HEADERS)}列，实际={len(headers)}列）"
                if missing_in_file:
                    msg += f"，缺失：{missing_in_file}"
                if extra_in_file:
                    msg += f"，多余：{extra_in_file}"
                return False, msg

            row_count = 0
            for row in reader:
                row_count += 1

            return True, f"有效，{len(headers)}列，{row_count}行数据"
    except UnicodeDecodeError:
        # GBK 编码文件视为无效（海关数据应该使用 UTF-8 编码）
        return False, "编码错误：应为 UTF-8 编码，检测到 GBK 编码"
    except csv.Error as e:
        return False, f"CSV 解析错误：{e}"
    except Exception as e:
        return False, f"错误：{e}"

def main():
    folder = Path("downloads")

    if not folder.exists():
        print(f"文件夹 {folder} 不存在")
        return

    csv_files = list(folder.glob("*.csv"))

    if not csv_files:
        print("未找到 CSV 文件")
        return

    print(f"找到 {len(csv_files)} 个 CSV 文件\n")

    valid_count = 0
    invalid_count = 0

    for filepath in sorted(csv_files):
        valid, message = check_csv_file(filepath)
        status = "✓" if valid else "✗"
        print(f"{status} {filepath.name}: {message}")

        if valid:
            valid_count += 1
        else:
            invalid_count += 1

    print(f"\n总计：{valid_count} 个有效，{invalid_count} 个无效")

if __name__ == "__main__":
    main()