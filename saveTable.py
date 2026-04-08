#!/usr/bin/env python3
# 文件名：format_trade_ports.py
# 功能：将 tradePort.txt 整理为 code,name 格式

import argparse
import sys


def format_trade_ports(input_file, output_file=None):
    """
    读取输入文件，整理为 code,name 格式。
    如果指定了 output_file，则保存到新文件；否则打印到控制台。
    """
    results = []

    with open(input_file, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines()]

    # 过滤掉空行
    valid_lines = [line for line in lines if line]

    # 每两行一组：代码，名称
    for i in range(0, len(valid_lines), 2):
        if i + 1 < len(valid_lines):
            code = valid_lines[i]
            name = valid_lines[i+1]
            results.append(f"{code},{name}")

    # 输出结果
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(results))
            f.write('\n')    # 添加换行符
        print(f"已保存至 {output_file}")
    else:
        for line in results:
            print(line)

    return results

def main():
    parser = argparse.ArgumentParser(
        description='将代码/名称文本文件整理为 CSV 格式（code,name）',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s tradeCode.txt
  %(prog)s tradeCode.txt tradeCode.csv
        """
    )
    parser.add_argument('input_file', help='输入的文本文件（代码和名称交替行）')
    parser.add_argument('output_file', nargs='?', default=None,
                        help='输出的 CSV 文件（可选，不指定则打印到控制台）')

    args = parser.parse_args()

    try:
        format_trade_ports(args.input_file, args.output_file)
    except FileNotFoundError:
        print(f"错误：文件 '{args.input_file}' 不存在", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"错误：{e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
