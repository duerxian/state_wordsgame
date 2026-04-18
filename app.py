from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

# Excel文件路径
EXCEL_FILE = '8上-下单词表.xlsx'

# 全局变量存储数据
words_data = []
# 数据加载标志
data_loaded = False

def load_excel_data():
    """从Excel文件加载数据"""
    global words_data, data_loaded
    words_data = []
    
    try:
        if os.path.exists(EXCEL_FILE):
            df = pd.read_excel(EXCEL_FILE)
            print("Excel文件列名:", df.columns.tolist())
            
            # 确保列名字符串化，防止因Excel格式问题导致列名类型不一致
            df.columns = [str(col).strip() for col in df.columns]

            if '英文English' in df.columns:
                for idx, row in df.iterrows():
                    word = str(row['英文English']).strip() if pd.notna(row['英文English']) else ''
                    
                    # 加载 kill 状态
                    kill = bool(row.get('kill', False)) if 'kill' in df.columns else False
                    
                    # 【新增】加载 check 状态
                    # 假设Excel中check列存在，若不存在则默认为0
                    check_val = row.get('check', 0) if 'check' in df.columns else 0
                    # 处理可能的浮点数情况 (Excel中数字常读为float)
                    try:
                        check = int(float(check_val)) if pd.notna(check_val) else 0
                    except:
                        check = 0

                    grade = str(row.get('Grade', '')).strip() if 'Grade' in df.columns else ''
                    unit = str(row.get('unit', '')).strip() if 'unit' in df.columns else ''
                    pos = str(row.get('词性', '')).strip() if '词性' in df.columns else ''
                    
                    # 尝试不同的中文释义列名
                    meaning = ''
                    for col in df.columns:
                        if '释义' in col or 'meaning' in col.lower():
                            meaning = str(row.get(col, '')).strip() if pd.notna(row.get(col)) else ''
                            break
                    # 直接检查常见的中文释义列名
                    if not meaning:
                        for col in ['中文释义', '释义', 'meaning', 'Meaning']:
                            if col in df.columns:
                                meaning = str(row.get(col, '')).strip() if pd.notna(row.get(col)) else ''
                                break
                    
                    # 获取音标
                    phonetic = str(row.get('音标', '')).strip() if pd.notna(row.get('音标', '')) else ''
                    # 获取例句
                    example = str(row.get('例句', '')).strip() if pd.notna(row.get('例句', '')) else ''
                    # 获取联想词
                    related = str(row.get('联想词', '')).strip() if pd.notna(row.get('联想词', '')) else ''
                    
                    if word:
                        words_data.append({
                            'id': idx + 1,
                            'word': word,
                            'kill': kill,
                            'check': check, # 【新增】存入check字段
                            'grade': grade,
                            'unit': unit,
                            'pos': pos,
                            'meaning': meaning,
                            'phonetic': phonetic,
                            'example': example,
                            'related': related
                        })
        print(f"加载了 {len(words_data)} 个单词")
        data_loaded = True
    except Exception as e:
        print(f"加载Excel数据失败: {e}")
        import traceback
        traceback.print_exc()


    """保存数据到Excel文件，保留其他列数据"""
    try:
        if not os.path.exists(EXCEL_FILE):
            data = {
                '英文English': [w['word'] for w in words_data],
                'kill': [w.get('kill', False) for w in words_data],
                'check': [w.get('check', 0) for w in words_data] # 【新增】初始化check列
            }
            df = pd.DataFrame(data)
            df.to_excel(EXCEL_FILE, index=False)
            print("数据已保存到Excel文件")
            return
        
        original_df = pd.read_excel(EXCEL_FILE)
        # 确保列名一致
        original_df.columns = [str(col).strip() for col in original_df.columns]
        
        # 如果原始文件中没有check列，添加它
        if 'check' not in original_df.columns:
            original_df['check'] = 0
        if 'kill' not in original_df.columns:
            original_df['kill'] = False

        for idx, row in original_df.iterrows():
            if idx < len(words_data):
                current_word = words_data[idx]
                original_df.at[idx, '英文English'] = current_word['word']
                
                # 更新 kill 列
                if 'kill' in original_df.columns:
                    original_df.at[idx, 'kill'] = current_word.get('kill', False)
                
                # 【新增】更新 check 列
                if 'check' in original_df.columns:
                    original_df.at[idx, 'check'] = current_word.get('check', 0)
        
        # 使用openpyxl设置格式
        from openpyxl import load_workbook
        from openpyxl.styles import Alignment
        
        # 保存原始数据
        original_df.to_excel(EXCEL_FILE, index=False)
        
        # 加载工作簿设置格式
        wb = load_workbook(EXCEL_FILE)
        ws = wb.active
        
        # 设置所有单元格左对齐
        for row in ws.iter_rows():
            for cell in row:
                cell.alignment = Alignment(horizontal='left', vertical='center')
        
        # 设置行高30
        for row in ws.iter_rows():
            ws.row_dimensions[row[0].row].height = 30
        
        # 保持原列宽不变，仅设置自动折行
        for col in ws.columns:
            column = col[0].column_letter
            # 设置自动折行
            for cell in col:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        
        # 保存格式设置
        wb.save(EXCEL_FILE)
        print("数据已保存到Excel文件，其他列数据已保留，格式已设置为左对齐、行高30、列宽自动适配")
    except Exception as e:
        print(f"保存Excel数据失败: {e}")
        import traceback
        traceback.print_exc()

def save_excel_data():
    """保存数据到Excel文件，保留其他列数据"""
    try:
        if not os.path.exists(EXCEL_FILE):
            data = {
                '英文English': [w['word'] for w in words_data],
                'kill': [w.get('kill', False) for w in words_data],
                # 【修改】确保 check 列存入的是整数 0 或 1，而不是布尔值
                'check': [int(w.get('check', 0)) for w in words_data] 
            }
            df = pd.DataFrame(data)
            df.to_excel(EXCEL_FILE, index=False)
            print("数据已保存到Excel文件")
            return
        
        original_df = pd.read_excel(EXCEL_FILE)
        # 确保列名一致
        original_df.columns = [str(col).strip() for col in original_df.columns]
        
        # 如果原始文件中没有check列，添加它
        if 'check' not in original_df.columns:
            original_df['check'] = 0
        if 'kill' not in original_df.columns:
            original_df['kill'] = False

        for idx, row in original_df.iterrows():
            if idx < len(words_data):
                current_word = words_data[idx]
                original_df.at[idx, '英文English'] = current_word['word']
                
                # 更新 kill 列
                if 'kill' in original_df.columns:
                    original_df.at[idx, 'kill'] = current_word.get('kill', False)
                
                # 【新增】更新 check 列
                if 'check' in original_df.columns:
                    # 【关键修改】强制转换为 int，确保写入 Excel 的是 1 或 0，而不是 TRUE/FALSE
                    val = current_word.get('check', 0)
                    original_df.at[idx, 'check'] = int(val) if val is not None else 0
        
        # 使用openpyxl设置格式
        from openpyxl import load_workbook
        from openpyxl.styles import Alignment
        
        # 保存原始数据
        original_df.to_excel(EXCEL_FILE, index=False)
        
        # 加载工作簿设置格式
        wb = load_workbook(EXCEL_FILE)
        ws = wb.active
        
        # 设置所有单元格左对齐
        for row in ws.iter_rows():
            for cell in row:
                cell.alignment = Alignment(horizontal='left', vertical='center')
        
        # 设置行高30
        for row in ws.iter_rows():
            ws.row_dimensions[row[0].row].height = 30
        
        # 保持原列宽不变，仅设置自动折行
        for col in ws.columns:
            column = col[0].column_letter
            # 设置自动折行
            for cell in col:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        
        # 保存格式设置
        wb.save(EXCEL_FILE)
        print("数据已保存到Excel文件，其他列数据已保留，格式已设置为左对齐、行高30、列宽自动适配")
    except Exception as e:
        print(f"保存Excel数据失败: {e}")
        import traceback
        traceback.print_exc()

# 在每次请求前检查数据是否已加载
@app.before_request
def check_data_loaded():
    global data_loaded
    if not data_loaded:
        load_excel_data()

@app.route('/')
@app.route('/index.html')
def index():
    """返回主页"""
    with open('index.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/css/style.css')
def css():
    """返回CSS文件"""
    with open('css/style.css', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'text/css'}

@app.route('/css/balloon.css')
def balloon_css():
    try:
        with open('css/balloon.css', 'r', encoding='utf-8') as f:
            return f.read(), 200, {'Content-Type': 'text/css'}
    except FileNotFoundError:
        return "CSS 文件未找到", 404

@app.route('/js/main.js')
def js():
    """返回JS文件"""
    with open('js/main.js', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'application/javascript'}

@app.route('/js/game1.js')
def game1_js():
    """返回游戏JS文件"""
    with open('js/game1.js', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'application/javascript'}

@app.route('/js/game2.js')
def game2_js():
    """返回游戏JS文件"""
    with open('js/game2.js', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'application/javascript'}

@app.route('/js/balloon.js')
def balloon_js():
    """返回游戏JS文件"""
    with open('js/balloon.js', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'application/javascript'}

# 🎵 添加声音文件路由
@app.route('/sounds/<filename>')
def serve_sound(filename):
    """返回声音文件"""
    with open(f'sounds/{filename}', 'rb') as f:
        return f.read(), 200, {'Content-Type': 'audio/mpeg'}

#添加image路由
@app.route('/images/<filename>')
def serve_image(filename):
    """返回图片文件"""
    with open(f'images/{filename}', 'rb') as f:
        return f.read(), 200, {'Content-Type': 'image/png'}

@app.route('/api/words', methods=['GET'])
def get_words():
    """获取所有单词"""
    return jsonify(words_data)

@app.route('/api/words/<int:word_id>', methods=['GET'])
def get_word(word_id):
    """获取单个单词"""
    word = next((w for w in words_data if w['id'] == word_id), None)
    if word:
        return jsonify(word)
    return jsonify({'error': '单词不存在'}), 404

@app.route('/api/words', methods=['POST'])
def add_word():
    """添加新单词"""
    data = request.get_json()
    if not data or 'word' not in data:
        return jsonify({'error': '缺少单词内容'}), 400
    
    # 检查单词是否已存在
    word_text = data['word'].strip().lower()
    existing_word = next((w for w in words_data if w['word'].lower() == word_text), None)
    if existing_word:
        return jsonify({'error': '单词已存在'}), 400
    
    new_id = max([w['id'] for w in words_data], default=-1) + 1
    new_word = {
            'id': new_id,
            'word': data['word'].strip(),
            'grade': data.get('grade', '7上'),
            'unit': data.get('unit', '1'),
            'meaning': data.get('meaning', ''),
            'pos': data.get('pos', ''),
            'phonetic': data.get('phonetic', ''),
            'example': data.get('example', ''),
            'related': data.get('related', ''),
            'check': 0
        }
    words_data.append(new_word)
    
    # 保存到Excel
    save_excel_data()
    
    return jsonify(new_word), 201

@app.route('/api/words/<int:word_id>', methods=['PUT'])
def update_word(word_id):
    """更新单词"""
    global words_data
    data = request.get_json()
    
    word = next((w for w in words_data if w['id'] == word_id), None)
    if not word:
        return jsonify({'error': '单词不存在'}), 404
    
    if 'word' in data:
        word['word'] = data['word'].strip()
    if 'grade' in data:
        word['grade'] = data['grade']
    if 'unit' in data:
        word['unit'] = data['unit']
    if 'meaning' in data:
        word['meaning'] = data['meaning']
    if 'pos' in data:
        word['pos'] = data['pos']
    if 'example' in data:
        word['example'] = data['example']
    if 'related' in data:
        word['related'] = data['related']
    if 'check' in data:
        word['check'] = int(data['check'])
    if 'kill' in data:
        word['kill'] = bool(data['kill'])
    
    save_excel_data()
    return jsonify(word)

@app.route('/api/words/<int:word_id>', methods=['DELETE'])
def delete_word(word_id):
    """删除单词"""
    global words_data
    words_data = [w for w in words_data if w['id'] != word_id]
    # 保存到Excel
    save_excel_data()
    return jsonify({'message': '单词已删除'})

@app.route('/api/words/search', methods=['GET'])
def search_words():
    """搜索单词"""
    query = request.args.get('q', '').lower().strip()
    if not query:
        return jsonify(words_data)
    
    results = [w for w in words_data if query in w['word'].lower()]
    return jsonify(results)

@app.route('/api/words/save-all', methods=['POST'])
def save_all_words():
    """批量保存所有单词到Excel，保留其他列数据"""
    global words_data
    data = request.get_json()
    if not data or 'words' not in data:
        return jsonify({'error': '缺少单词数据'}), 400
    
    words_data = data['words']
    save_excel_data()
    return jsonify({'message': '保存成功'})

@app.route('/wordgame.html')
def wordgame():
    with open('wordgame.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/typing.html')
def typing():
    with open('typing.html', 'r', encoding='utf-8') as f:
        return f.read()


@app.route('/balloongame.html')
def balloongame():
    with open('balloongame.html', 'r', encoding='utf-8') as f:
        return f.read()

if __name__ == '__main__':
    # 启动Flask应用
    app.run(debug=True, port=5000)