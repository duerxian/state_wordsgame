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
            if '英文English' in df.columns:
                for idx, row in df.iterrows():
                    word = str(row['英文English']).strip() if pd.notna(row['英文English']) else ''
                    kill = bool(row.get('kill', False)) if 'kill' in df.columns else False
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
                    print(f"单词: {word}, 释义: {meaning}")
                    if word:
                        words_data.append({
                            'id': idx + 1,
                            'word': word,
                            'kill': kill,
                            'grade': grade,
                            'unit': unit,
                            'pos': pos,
                            'meaning': meaning
                        })
        print(f"加载了 {len(words_data)} 个单词")
        data_loaded = True
    except Exception as e:
        print(f"加载Excel数据失败: {e}")

# 在每次请求前检查数据是否已加载
@app.before_request
def check_data_loaded():
    global data_loaded
    if not data_loaded:
        load_excel_data()

def save_excel_data():
    """保存数据到Excel文件，保留其他列数据"""
    try:
        if not os.path.exists(EXCEL_FILE):
            data = {
                '英文English': [w['word'] for w in words_data],
                'kill': [w.get('kill', False) for w in words_data]
            }
            df = pd.DataFrame(data)
            df.to_excel(EXCEL_FILE, index=False)
            print("数据已保存到Excel文件")
            return
        
        original_df = pd.read_excel(EXCEL_FILE)
        
        for idx, row in original_df.iterrows():
            if idx < len(words_data):
                original_df.at[idx, '英文English'] = words_data[idx]['word']
                if 'kill' in original_df.columns:
                    original_df.at[idx, 'kill'] = words_data[idx].get('kill', False)
                else:
                    original_df['kill'] = False
                    original_df.at[idx, 'kill'] = words_data[idx].get('kill', False)
        
        original_df.to_excel(EXCEL_FILE, index=False)
        print("数据已保存到Excel文件，其他列数据已保留")
    except Exception as e:
        print(f"保存Excel数据失败: {e}")

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
    
    new_id = max([w['id'] for w in words_data], default=-1) + 1
    new_word = {'id': new_id, 'word': data['word'].strip()}
    words_data.append(new_word)
    
    # 保存到Excel
    save_excel_data()
    
    return jsonify(new_word), 201

@app.route('/api/words/<int:word_id>', methods=['PUT'])
def update_word(word_id):
    """更新单词"""
    data = request.get_json()
    if not data or 'word' not in data:
        return jsonify({'error': '缺少单词内容'}), 400
    
    word = next((w for w in words_data if w['id'] == word_id), None)
    if word:
        word['word'] = data['word'].strip()
        # 更新kill属性
        if 'kill' in data:
            word['kill'] = bool(data['kill'])
        # 保存到Excel
        save_excel_data()
        return jsonify(word)
    return jsonify({'error': '单词不存在'}), 404

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

if __name__ == '__main__':
    # 启动Flask应用
    app.run(debug=True, port=5000)