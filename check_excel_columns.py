import pandas as pd
import os

# Excel文件路径
EXCEL_FILE = '8上-下单词表.xlsx'

try:
    if os.path.exists(EXCEL_FILE):
        df = pd.read_excel(EXCEL_FILE)
        print("Excel文件列名:")
        for col in df.columns:
            print(f"- '{col}'")
    else:
        print("Excel文件不存在")
except Exception as e:
    print(f"读取Excel文件失败: {e}")
