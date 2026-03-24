#!/usr/bin/env python3
"""
删除 downloads/ 文件夹中需要重新爬取的 CSV 文件
从 retry_download.js 中的 RETRY_TASKS 读取任务列表
"""

import os
import glob
import re

# RETRY_TASKS 中的任务列表 (iEType, year, port)
RETRY_TASKS = [
    ('export', '2023', '32'),  # 387,912 条
    ('export', '2024', '13'),  # 119,076 条
    ('export', '2024', '33'),  # 514,800 条
    ('export', '2025', '32'),  # 454,844 条
    ('export', '2025', '33')   # 637,473 条
]

DATA_DIR = 'downloads'


def main():
    deleted_count = 0

    for ietype, year, port in RETRY_TASKS:
        prefix = f"{ietype}-{year}-{port}"
        pattern = os.path.join(DATA_DIR, f"{prefix}_*.csv")

        files = glob.glob(pattern)

        for filepath in files:
            try:
                os.remove(filepath)
                print(f"删除：{filepath}")
                deleted_count += 1
            except OSError as e:
                print(f"删除失败 {filepath}: {e}")

    print(f"\n完成！共删除 {deleted_count} 个文件。")


if __name__ == '__main__':
    main()