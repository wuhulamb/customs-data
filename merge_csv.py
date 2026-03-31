#!/usr/bin/env python3
"""
合并 downloads/ 目录中的 CSV 文件
按年份和进出口类型合并，只保留标准表头列
输出文件：merged_data/import-YYYY.csv, merged_data/export-YYYY.csv
"""

import csv
import os
import re
from pathlib import Path
from collections import defaultdict

DATA_DIR = 'downloads'
OUTPUT_DIR = 'merged_data'

# 标准表头（13 列）
EXPECTED_HEADERS = [
    "商品编码", "商品名称",
    "贸易伙伴编码", "贸易伙伴名称",
    "贸易方式编码", "贸易方式名称",
    "注册地编码", "注册地名称",
    "第一数量", "第一计量单位",
    "第二数量", "第二计量单位",
    "人民币"
]


def extract_year_type(filename):
    """从文件名提取类型和年份，如 import-2025-44_p1-10.csv -> ('import', 2025)"""
    # 移除.csv 扩展名
    basename = filename.rsplit('.', 1)[0]

    # 匹配 type-year-port[_...],如 import-2025-44 或 export-2023-32_p1-10
    match = re.match(r'^(import|export)-(\d{4})-(\d+)', basename)
    if match:
        ietype = match.group(1)
        year = int(match.group(2))
        return ietype, year

    return None, None


def merge_csv_files():
    """合并所有 CSV 文件"""
    data_dir = Path(DATA_DIR)

    if not data_dir.exists():
        print(f"❌ 文件夹 {DATA_DIR} 不存在")
        return

    # 创建输出目录
    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(exist_ok=True)

    # 获取所有 CSV 文件
    csv_files = list(data_dir.glob("*.csv"))

    if not csv_files:
        print(f"⚠️ {DATA_DIR} 中未找到 CSV 文件")
        return

    print(f"找到 {len(csv_files)} 个 CSV 文件\n")

    # 按 (type, year) 分组
    grouped = defaultdict(list)
    for filepath in sorted(csv_files):
        ietype, year = extract_year_type(filepath.name)
        if ietype is None:
            print(f"⚠️ 跳过文件名格式不符：{filepath.name}")
            continue
        grouped[(ietype, year)].append(filepath)

    # 合并每个组
    merged_count = 0
    total_rows = 0

    for (ietype, year), files in sorted(grouped.items()):
        output_file = output_dir / f"{ietype}-{year}.csv"

        print(f"处理 {output_file.name}: {len(files)} 个源文件")

        all_rows = []

        for filepath in files:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    headers = next(reader, None)

                    if headers is None:
                        print(f"  ⚠️ 跳过空文件：{filepath.name}")
                        continue

                    # 计算标准列的索引（前 13 个有效列）
                    header_indices = []
                    for expected_col in EXPECTED_HEADERS:
                        try:
                            idx = headers.index(expected_col)
                            header_indices.append(idx)
                        except ValueError:
                            print(f"  ⚠️ {filepath.name} 缺少列：{expected_col}")
                            header_indices = None
                            break

                    if header_indices is None or len(header_indices) < len(EXPECTED_HEADERS):
                        continue

                    # 读取数据行并提取标准列
                    row_count = 0
                    for row in reader:
                        if len(row) > max(header_indices):
                            extracted_row = [row[i] for i in header_indices]
                            extracted_row[-1] = extracted_row[-1].replace(',', '')  # 移除货币列中的逗号
                            all_rows.append(extracted_row)
                            row_count += 1

                    total_rows += row_count

            except Exception as e:
                print(f"  ❌ 读取失败 {filepath.name}: {e}")
                continue

        if not all_rows:
            print(f"  ⚠️ {output_file.name}: 无数据可写入")
            continue

        # 写入合并后的文件
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(EXPECTED_HEADERS)
            writer.writerows(all_rows)

        print(f"  ✓ 已写入：{len(files)} 个文件 → {len(all_rows):,} 行数据\n")
        merged_count += 1

    print("=" * 50)
    print(f"完成！共生成 {merged_count} 个合并文件，总计 {total_rows:,} 行数据")
    print(f"输出目录：{OUTPUT_DIR}/")


if __name__ == '__main__':
    merge_csv_files()
