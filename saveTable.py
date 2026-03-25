# 文件名：format_trade_ports.py
# 功能：将 tradePort.txt 整理为 code,name 格式

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

# 使用示例
# 假设文件在当前目录下
format_trade_ports('tradeCode.txt', 'tradeCode.csv')
