import pandas as pd
import os

# Excel文件路径
EXCEL_FILE = '英文文章表.xlsx'

try:
    if os.path.exists(EXCEL_FILE):
        df = pd.read_excel(EXCEL_FILE)
        print("英文文章表列名:")
        for col in df.columns:
            print(f"- '{col}'")
        print(f"\n总行数: {len(df)}")
        print("\n前3行数据:")
        print(df.head(3).to_string())
    else:
        print("Excel文件不存在")
except Exception as e:
    print(f"读取Excel文件失败: {e}")
    import traceback
    traceback.print_exc()
