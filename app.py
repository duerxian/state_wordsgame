from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import openpyxl
from openpyxl.styles import Alignment

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Excel文件路径
EXCEL_FILE = '8上-下单词表.xlsx'
ARTICLE_FILE = '英文文章表.xlsx'

# 全局变量存储数据
words_data = []
articles_data = []
# 数据加载标志
data_loaded = False
article_loaded = False

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
                    
                    # 加载 id，如果Excel中存在id列则使用它，否则使用 idx + 1
                    if 'id' in df.columns and pd.notna(row['id']):
                        try:
                            word_id = int(row['id'])
                        except:
                            word_id = idx + 1
                    else:
                        word_id = idx + 1
                    
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
                            'id': word_id,
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

def load_article_data():
    """从Excel文件加载文章数据"""
    global articles_data, article_loaded
    articles_data = []
    
    try:
        if os.path.exists(ARTICLE_FILE):
            df = pd.read_excel(ARTICLE_FILE)
            print("文章Excel文件列名:", df.columns.tolist())
            
            # 确保列名字符串化，防止因Excel格式问题导致列名类型不一致
            df.columns = [str(col).strip() for col in df.columns]

            # 尝试不同的标题列名
            title_col = None
            for col in ['title', 'Title', 'TITLE']:
                if col in df.columns:
                    title_col = col
                    break
            
            if not title_col:
                print("未找到标题列")
                article_loaded = True
                return
            
            for idx, row in df.iterrows():
                title = str(row[title_col]).strip() if pd.notna(row[title_col]) else ''
                
                if not title:
                    continue
                
                # 加载 kill 状态 - 对应Excel的kill列
                kill = bool(row.get('kill', False)) if 'kill' in df.columns else False
                
                # 加载 grade - 对应Excel的Grade列（优先）或grade列
                grade = ''
                if 'Grade' in df.columns:
                    grade = str(row['Grade']).strip() if pd.notna(row['Grade']) else ''
                elif 'grade' in df.columns:
                    grade = str(row['grade']).strip() if pd.notna(row['grade']) else ''
                
                # 加载 unit - 对应Excel的unit列（优先）或Unit列
                unit = ''
                if 'unit' in df.columns:
                    unit = str(row['unit']).strip() if pd.notna(row['unit']) else ''
                elif 'Unit' in df.columns:
                    unit = str(row['Unit']).strip() if pd.notna(row['Unit']) else ''
                
                # 加载英文内容 - 对应Excel的English列（优先）或english列
                english = ''
                if 'English' in df.columns:
                    english = str(row['English']).strip() if pd.notna(row['English']) else ''
                elif 'english' in df.columns:
                    english = str(row['english']).strip() if pd.notna(row['english']) else ''
                
                # 加载中文内容 - 对应Excel的Chinese列（优先）或meaning列或meaning列
                meaning = ''
                if 'Chinese' in df.columns:
                    meaning = str(row['Chinese']).strip() if pd.notna(row['Chinese']) else ''
                elif 'meaning' in df.columns:
                    meaning = str(row['meaning']).strip() if pd.notna(row['meaning']) else ''
                elif 'Meaning' in df.columns:
                    meaning = str(row['Meaning']).strip() if pd.notna(row['Meaning']) else ''
                
                # 加载 translate-word 列
                translate_word = ''
                if 'translate-word' in df.columns:
                    translate_word = str(row['translate-word']).strip() if pd.notna(row['translate-word']) else ''
                
                # 加载 check 状态 - 对应Excel的check列
                check_val = row.get('check', 0) if 'check' in df.columns else 0
                # 处理可能的浮点数情况 (Excel中数字常读为float)
                try:
                    check = int(float(check_val)) if pd.notna(check_val) else 0
                except:
                    check = 0
                
                articles_data.append({
                    'id': idx + 1,
                    'title': title,
                    'kill': kill,
                    'check': check,
                    'grade': grade,
                    'unit': unit,
                    'english': english,
                    'meaning': meaning,
                    'translate_word': translate_word
                })
        print(f"加载了 {len(articles_data)} 篇文章")
        article_loaded = True
    except Exception as e:
        print(f"加载文章Excel数据失败: {e}")
        import traceback
        traceback.print_exc()

# 在每次请求前检查数据是否已加载
@app.before_request
def check_data_loaded():
    global data_loaded, article_loaded
    if not data_loaded:
        load_excel_data()
    if not article_loaded:
        load_article_data()

@app.route('/')
@app.route('/index.html')
def index():
    """返回主页"""
    with open('index.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/wordgame.html')
def wordgame():
    """返回单词连连看页面"""
    with open('wordgame.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/typing.html')
def typing():
    """返回打字练习页面"""
    with open('typing.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/sentence.html')
def sentence():
    """返回句子练习页面"""
    with open('sentence.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/balloongame.html')
def balloongame():
    """返回气球射击游戏页面"""
    with open('balloongame.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/config.html')
def config():
    """返回配置页面"""
    with open('config.html', 'r', encoding='utf-8') as f:
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

@app.route('/js/sentence.js')
def sentence_js():
    """返回句子练习JS文件"""
    with open('js/sentence.js', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'application/javascript'}

@app.route('/js/config.js')
def config_js():
    """返回配置JS文件"""
    with open('js/config.js', 'r', encoding='utf-8') as f:
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
        return f.read(), 200, {'Content-Type': 'image/jpeg'}

# 添加单词API路由
@app.route('/api/words', methods=['GET'])
def get_words():
    """获取所有单词"""
    return jsonify(words_data)

@app.route('/api/words/search', methods=['GET'])
def search_words():
    """搜索单词"""
    global words_data
    query = request.args.get('q', '').strip().lower()
    
    if not query:
        return jsonify([])
    
    # 搜索逻辑：匹配单词、释义、例句等
    results = []
    for word in words_data:
        match = False
        # 匹配单词
        if query in word.get('word', '').lower():
            match = True
        # 匹配释义
        elif query in word.get('meaning', '').lower():
            match = True
        # 匹配例句
        elif query in word.get('example', '').lower():
            match = True
        # 匹配联想词
        elif query in word.get('related', '').lower():
            match = True
        
        if match:
            results.append(word)
    
    return jsonify(results)

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
    if 'pos' in data:
        word['pos'] = data['pos']
    if 'meaning' in data:
        word['meaning'] = data['meaning']
    if 'phonetic' in data:
        word['phonetic'] = data['phonetic']
    if 'example' in data:
        word['example'] = data['example']
    if 'related' in data:
        word['related'] = data['related']
    if 'check' in data:
        word['check'] = int(data['check'])
    if 'kill' in data:
        word['kill'] = bool(data['kill'])
    
    save_words_to_excel()
    return jsonify(word)

@app.route('/api/words', methods=['POST'])
def add_word():
    """添加新单词"""
    global words_data
    data = request.get_json()
    if not data or 'word' not in data:
        return jsonify({'error': '缺少单词内容'}), 400
    
    # 检查单词是否已存在
    word_text = data['word'].strip().lower()
    existing_word = next((w for w in words_data if w['word'].lower() == word_text), None)
    if existing_word:
        return jsonify({'error': '单词已存在'}), 400
    
    new_id = max([w['id'] for w in words_data], default=0) + 1
    new_word = {
        'id': new_id,
        'word': data['word'].strip(),
        'grade': data.get('grade', ''),
        'unit': data.get('unit', ''),
        'pos': data.get('pos', ''),
        'meaning': data.get('meaning', ''),
        'phonetic': data.get('phonetic', ''),
        'example': data.get('example', ''),
        'related': data.get('related', ''),
        'kill': False,
        'check': 0
    }
    words_data.append(new_word)
    
    # 保存到Excel
    save_words_to_excel()
    
    return jsonify(new_word), 201

@app.route('/api/words/<int:word_id>', methods=['DELETE'])
def delete_word(word_id):
    """删除单词"""
    global words_data
    words_data = [w for w in words_data if w['id'] != word_id]
    # 保存到Excel
    save_words_to_excel()
    return jsonify({'message': '单词已删除'})

@app.route('/api/words/save-all', methods=['POST'])
def save_all_words():
    """批量保存所有单词到Excel"""
    global words_data
    data = request.get_json()
    if not data or 'words' not in data:
        return jsonify({'error': '缺少单词数据'}), 400
    
    words_data = data['words']
    save_words_to_excel()
    return jsonify({'message': '保存成功'})

# 添加文章API路由
@app.route('/api/articles', methods=['GET'])
def get_articles():
    """获取所有文章"""
    return jsonify(articles_data)

@app.route('/api/articles/<int:article_id>', methods=['GET'])
def get_article(article_id):
    """获取单个文章"""
    article = next((a for a in articles_data if a['id'] == article_id), None)
    if article:
        return jsonify(article)
    return jsonify({'error': '文章不存在'}), 404

@app.route('/api/articles', methods=['POST'])
def add_article():
    """添加新文章"""
    global articles_data
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'error': '缺少文章标题'}), 400
    
    # 检查文章是否已存在
    title_text = data['title'].strip().lower()
    existing_article = next((a for a in articles_data if a['title'].lower() == title_text), None)
    if existing_article:
        return jsonify({'error': '文章已存在'}), 400
    
    new_id = max([a['id'] for a in articles_data], default=0) + 1
    new_article = {
        'id': new_id,
        'title': data['title'].strip(),
        'grade': data.get('grade', ''),
        'unit': data.get('unit', ''),
        'english': data.get('english', ''),
        'meaning': data.get('meaning', ''),
        'kill': False,
        'check': 0
    }
    articles_data.append(new_article)
    
    # 保存到Excel
    save_article_to_excel()
    
    return jsonify(new_article), 201

def save_words_to_excel():
    """保存单词数据到Excel文件"""
    global words_data
    
    try:
        if os.path.exists(EXCEL_FILE):
            # 读取现有Excel文件
            df = pd.read_excel(EXCEL_FILE)
            df.columns = [str(col).strip() for col in df.columns]
            
            # 准备要写入的数据
            data_list = []
            for word in words_data:
                data_list.append({
                    'id': word.get('id', ''),
                    'Grade': word.get('grade', ''),
                    'unit': word.get('unit', ''),
                    '英文English': word.get('word', ''),
                    '音标': word.get('phonetic', ''),
                    '词性': word.get('pos', ''),
                    '中文释义': word.get('meaning', ''),
                    '例句': word.get('example', ''),
                    '联想词': word.get('related', ''),
                    'kill': word.get('kill', False),
                    'check': word.get('check', 0)
                })
            
            # 创建新的DataFrame
            new_df = pd.DataFrame(data_list)
            
            # 保存到Excel文件，保持原有格式
            with pd.ExcelWriter(EXCEL_FILE, engine='openpyxl') as writer:
                new_df.to_excel(writer, index=False, sheet_name='Sheet1')
                
                # 获取工作表并设置格式
                worksheet = writer.sheets['Sheet1']
                
                # 设置列宽
                for column in worksheet.columns:
                    column_letter = column[0].column_letter
                    max_length = 0
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
                
                # 设置所有行高为40
                for row in range(2, worksheet.max_row + 1):
                    worksheet.row_dimensions[row].height = 40
                
                # 设置单元格自动换行、顶对齐、左对齐
                for row in worksheet.iter_rows(min_row=2):
                    for cell in row:
                        cell.alignment = openpyxl.styles.Alignment(
                            wrap_text=True,
                            vertical='top',
                            horizontal='left'
                        )
            
            print(f"✅ 成功保存 {len(words_data)} 个单词到Excel")
        else:
            print(f"⚠️ Excel文件不存在: {EXCEL_FILE}")
    except Exception as e:
        print(f"❌ 保存单词到Excel失败: {e}")
        import traceback
        traceback.print_exc()
        raise

def save_article_to_excel():
    """保存文章数据到Excel文件"""
    global articles_data
    
    try:
        if os.path.exists(ARTICLE_FILE):
            # 读取现有Excel文件
            df = pd.read_excel(ARTICLE_FILE)
            df.columns = [str(col).strip() for col in df.columns]
            
            # 准备要写入的数据
            data_list = []
            for article in articles_data:
                data_list.append({
                    'title': article.get('title', ''),
                    'Grade': article.get('grade', ''),
                    'unit': article.get('unit', ''),
                    'English': article.get('english', ''),
                    'Chinese': article.get('meaning', ''),
                    'translate-word': article.get('translate_word', ''),
                    'kill': article.get('kill', False),
                    'check': article.get('check', 0)
                })
            
            # 创建新的DataFrame
            new_df = pd.DataFrame(data_list)
            
            # 保存到Excel文件，保持原有格式
            with pd.ExcelWriter(ARTICLE_FILE, engine='openpyxl') as writer:
                new_df.to_excel(writer, index=False, sheet_name='Sheet1')
                
                # 获取工作表并设置格式
                worksheet = writer.sheets['Sheet1']
                
                # 设置列宽
                for column in worksheet.columns:
                    column_letter = column[0].column_letter
                    # English、Chinese、translate-word列宽设为40，其他列自动调整
                    if column_letter in ['D', 'E', 'F']:  # 假设English是第4列，Chinese是第5列，translate-word是第6列
                        worksheet.column_dimensions[column_letter].width = 40
                    else:
                        max_length = 0
                        for cell in column:
                            try:
                                if len(str(cell.value)) > max_length:
                                    max_length = len(str(cell.value))
                            except:
                                pass
                        adjusted_width = min(max_length + 2, 50)
                        worksheet.column_dimensions[column_letter].width = adjusted_width
                
                # 设置所有行高为40
                for row in range(2, worksheet.max_row + 1):
                    worksheet.row_dimensions[row].height = 40
                
                # 设置单元格自动换行、顶对齐、左对齐
                for row in worksheet.iter_rows(min_row=2):
                    for cell in row:
                        cell.alignment = openpyxl.styles.Alignment(
                            wrap_text=True,
                            vertical='top',
                            horizontal='left'
                        )
            
            print(f"✅ 成功保存 {len(articles_data)} 篇文章到Excel")
        else:
            print(f"⚠️ Excel文件不存在: {ARTICLE_FILE}")
    except Exception as e:
        print(f"❌ 保存文章到Excel失败: {e}")
        import traceback
        traceback.print_exc()
        raise

@app.route('/api/articles/<int:article_id>', methods=['PUT'])
def update_article(article_id):
    """更新文章"""
    global articles_data
    data = request.get_json()
    
    article = next((a for a in articles_data if a['id'] == article_id), None)
    if not article:
        return jsonify({'error': '文章不存在'}), 404
    
    if 'title' in data:
        article['title'] = data['title'].strip()
    if 'grade' in data:
        article['grade'] = data['grade']
    if 'unit' in data:
        article['unit'] = data['unit']
    if 'english' in data:
        article['english'] = data['english']
    if 'meaning' in data:
        article['meaning'] = data['meaning']
    if 'check' in data:
        article['check'] = int(data['check'])
    if 'kill' in data:
        article['kill'] = bool(data['kill'])
    
    save_article_to_excel()
    return jsonify(article)

@app.route('/api/articles/<int:article_id>', methods=['DELETE'])
def delete_article(article_id):
    """删除文章"""
    global articles_data
    articles_data = [a for a in articles_data if a['id'] != article_id]
    # 保存到Excel
    save_article_to_excel()
    return jsonify({'message': '文章已删除'})

@app.route('/api/articles/save-all', methods=['POST'])
def save_all_articles():
    """批量保存所有文章到Excel"""
    global articles_data
    data = request.get_json()
    if not data or 'articles' not in data:
        return jsonify({'error': '缺少文章数据'}), 400
    
    articles_data = data['articles']
    save_article_to_excel()
    return jsonify({'message': '保存成功'})

@app.route('/api/translation-config', methods=['GET'])
def get_translation_config():
    """获取翻译API配置（从翻译平台密钥.json文件读取）"""
    import json
    
    try:
        config_file = '翻译平台密钥.json'
        if os.path.exists(config_file):
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 返回配置信息
            return jsonify({
                'success': True,
                'config': {
                    'baidu': {
                        'configured': bool(config.get('baidu_translate', {}).get('app_id')),
                        'appid': config.get('baidu_translate', {}).get('app_id', ''),
                        'key': config.get('baidu_translate', {}).get('secret_key', '')
                    },
                    'baidu_large': {
                        'configured': bool(config.get('baidu_translate_large', {}).get('app_id')),
                        'appid': config.get('baidu_translate_large', {}).get('app_id', ''),
                        'key': config.get('baidu_translate_large', {}).get('secret_key', '')
                    },
                    'youdao': {
                        'configured': bool(config.get('youdao_translate', {}).get('app_id')),
                        'appkey': config.get('youdao_translate', {}).get('app_id', ''),
                        'key': config.get('youdao_translate', {}).get('secret_key', '')
                    }
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': '配置文件不存在'
            })
    except Exception as e:
        print(f"读取翻译配置失败: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/test-translation', methods=['GET'])
def test_translation():
    """测试翻译 API 配置"""
    import json
    import hashlib
    import random
    import requests
    import time
    
    results = {}
    
    # 读取配置
    config_file = '翻译平台密钥.json'
    if not os.path.exists(config_file):
        return jsonify({'success': False, 'error': '配置文件不存在'})
    
    with open(config_file, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    test_word = "test"
    
    # 测试百度通用翻译
    try:
        baidu_config = config.get('baidu_translate', {})
        appid = baidu_config.get('app_id', '')
        key = baidu_config.get('secret_key', '')
        
        if appid and key:
            url = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
            salt = str(random.randint(32768, 65536))
            sign_str = appid + test_word + salt + key
            sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
            
            params = {
                'q': test_word,
                'from': 'en',
                'to': 'zh',
                'appid': appid,
                'salt': salt,
                'sign': sign
            }
            
            response = requests.get(url, params=params, timeout=10)
            result = response.json()
            
            if 'error_code' in result:
                results['baidu_general'] = {
                    'status': 'error',
                    'error_code': result['error_code'],
                    'error_msg': result.get('error_msg', '未知错误')
                }
            elif 'trans_result' in result:
                results['baidu_general'] = {
                    'status': 'success',
                    'translation': result['trans_result'][0]['dst']
                }
        else:
            results['baidu_general'] = {'status': 'not_configured'}
    except Exception as e:
        results['baidu_general'] = {'status': 'exception', 'error': str(e)}
    
    # 测试百度大模型翻译
    try:
        baidu_large_config = config.get('baidu_translate_large', {})
        appid = baidu_large_config.get('app_id', '')
        key = baidu_large_config.get('secret_key', '')
        
        if appid and key:
            url = 'https://fanyi-api.baidu.com/api/trans/vip/translate_v3'
            salt = str(random.randint(32768, 65536))
            curtime = str(int(time.time()))
            sign_str = appid + test_word + salt + curtime + key
            sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
            
            params = {
                'q': test_word,
                'from': 'en',
                'to': 'zh',
                'appid': appid,
                'salt': salt,
                'sign': sign,
                'action': 0,
                'curtime': curtime
            }
            
            response = requests.get(url, params=params, timeout=10)
            result = response.json()
            
            if 'error_code' in result:
                results['baidu_large'] = {
                    'status': 'error',
                    'error_code': result['error_code'],
                    'error_msg': result.get('error_msg', '未知错误')
                }
            elif 'trans_result' in result:
                results['baidu_large'] = {
                    'status': 'success',
                    'translation': result['trans_result'][0]['dst']
                }
        else:
            results['baidu_large'] = {'status': 'not_configured'}
    except Exception as e:
        results['baidu_large'] = {'status': 'exception', 'error': str(e)}
    
    # 测试有道翻译
    try:
        youdao_config = config.get('youdao_translate', {})
        appkey = youdao_config.get('app_id', '')
        key = youdao_config.get('secret_key', '')
        
        if appkey and key:
            import uuid
            url = 'https://openapi.youdao.com/api'
            salt = str(uuid.uuid1())
            curtime = str(int(time.time()))
            sign_str = appkey + test_word + salt + curtime + key
            sign = hashlib.sha256(sign_str.encode('utf-8')).hexdigest()
            
            params = {
                'q': test_word,
                'from': 'EN',
                'to': 'ZH_CHS',
                'appKey': appkey,
                'salt': salt,
                'sign': sign,
                'signType': 'v3',
                'curtime': curtime
            }
            
            response = requests.get(url, params=params, timeout=10)
            result = response.json()
            
            if result.get('errorCode', '0') != '0':
                results['youdao'] = {
                    'status': 'error',
                    'error_code': result['errorCode'],
                    'error_msg': '有道翻译错误'
                }
            elif 'translation' in result:
                results['youdao'] = {
                    'status': 'success',
                    'translation': result['translation'][0]
                }
        else:
            results['youdao'] = {'status': 'not_configured'}
    except Exception as e:
        results['youdao'] = {'status': 'exception', 'error': str(e)}
    
    return jsonify({
        'success': True,
        'results': results,
        'test_word': test_word
    })


@app.route('/api/translate/baidu', methods=['POST'])
def translate_baidu():
    """百度翻译API代理"""
    import json
    import hashlib
    import random
    import requests
    import time
    
    try:
        data = request.get_json()
        text = data.get('text', '')
        appid = data.get('appid', '')
        key = data.get('key', '')
        model = data.get('model', 'general')  # 'general' 或 'large'
        
        if not text or not appid or not key:
            return jsonify({
                'success': False,
                'error': '缺少必要参数'
            }), 400
        
        if model == 'large':
            # 百度大模型翻译API
            url = 'https://fanyi-api.baidu.com/api/trans/vip/translate_v3'
            salt = str(random.randint(32768, 65536))
            curtime = str(int(time.time()))
            sign_str = appid + text + salt + curtime + key
            sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
            
            params = {
                'q': text,
                'from': 'en',
                'to': 'zh',
                'appid': appid,
                'salt': salt,
                'sign': sign,
                'action': 0,
                'curtime': curtime
            }
        else:
            # 百度通用翻译API
            url = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
            salt = str(random.randint(32768, 65536))
            sign_str = appid + text + salt + key
            sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
            
            params = {
                'q': text,
                'from': 'en',
                'to': 'zh',
                'appid': appid,
                'salt': salt,
                'sign': sign
            }
        
        # 发送请求
        response = requests.get(url, params=params, timeout=10)
        result = response.json()
        
        # 检查是否有错误
        if 'error_code' in result:
            error_code = result.get('error_code', '未知错误码')
            error_msg = result.get('error_msg', '未知错误')
            
            # 百度翻译API错误码处理
            error_messages = {
                '517': '无权限使用该服务，请检查API密钥权限',
                '520': '请求超时',
                '530': '签名错误',
                '900': '参数错误',
                '901': 'API密钥错误',
                '902': 'API密钥过期'
            }
            
            error_message = error_messages.get(error_code, error_msg)
            return jsonify({
                'success': False,
                'error': f'百度翻译API错误: {error_code} - {error_message}'
            }), 400
        
        # 提取翻译结果
        if 'trans_result' in result and len(result['trans_result']) > 0:
            translation = result['trans_result'][0]['dst']
            return jsonify({
                'success': True,
                'translation': translation
            })
        else:
            return jsonify({
                'success': False,
                'error': '翻译结果为空'
            }), 400
            
    except Exception as e:
        print(f"百度翻译失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/translate/youdao', methods=['POST'])
def translate_youdao():
    """有道翻译API代理"""
    import json
    import hashlib
    import time
    import uuid
    import requests
    
    try:
        data = request.get_json()
        text = data.get('text', '')
        appkey = data.get('appkey', '')
        key = data.get('key', '')
        
        if not text or not appkey or not key:
            return jsonify({
                'success': False,
                'error': '缺少必要参数'
            }), 400
        
        # 有道翻译API地址
        url = 'https://openapi.youdao.com/api'
        
        # 生成随机UUID作为盐值
        salt = str(uuid.uuid1())
        
        # 当前时间戳（秒）
        curtime = str(int(time.time()))
        
        # 生成签名：应用ID + q + salt + curtime + 应用密钥
        sign_str = appkey + text + salt + curtime + key
        sign = hashlib.sha256(sign_str.encode('utf-8')).hexdigest()
        
        # 请求参数
        params = {
            'q': text,
            'from': 'EN',
            'to': 'ZH_CHS',
            'appKey': appkey,
            'salt': salt,
            'sign': sign,
            'signType': 'v3',
            'curtime': curtime
        }
        
        # 发送请求
        response = requests.get(url, params=params, timeout=10)
        result = response.json()
        
        # 检查错误码
        error_code = result.get('errorCode', '0')
        if error_code != '0':
            error_messages = {
                '101': '缺少必填的参数',
                '102': '不支持的语言类型',
                '103': '密钥无效',
                '104': '不支持的API类型',
                '105': '不支持的签名类型',
                '106': '不支持的响应类型',
                '107': '不支持的传输加密类型',
                '108': '应用ID无效',
                '109': 'BatchLog格式不正确',
                '110': '无相关服务的有效实例',
                '111': '开发者账号无效',
                '112': '请求服务无效',
                '113': 'q不能为空',
                '114': '不支持的图片传输方式',
                '201': '解密失败，可能为DES,BASE64,URLDecode的错误',
                '202': '签名检验失败',
                '203': '访问IP地址不在可访问IP列表',
                '205': '请求的接口与应用提供的类型不一致',
                '206': 'OCR接口必须提交base64格式的图片',
                '207': '提交的图片BASE64解码后大小为0',
                '208': '待翻译文本过长',
                '301': '辞典查询失败',
                '302': '翻译查询失败',
                '303': '其他语言互译查询失败',
                '304': '超出今日最大字符数限制',
                '305': '超出当月最大字符数限制',
                '306': '超出每秒最大请求次数',
                '307': '超出总QPS限制',
                '308': '超出单个用户每秒最大请求次数',
                '401': '账户已经欠费，请进行充值',
                '402': 'offlinesdk不可用',
                '411': '访问频率受限,请稍后重试',
                '412': '长请求过于频繁，请稍后重试'
            }
            error_msg = error_messages.get(error_code, f'未知错误码: {error_code}')
            return jsonify({
                'success': False,
                'error': f'有道翻译API错误: {error_msg}'
            }), 400
        
        # 提取翻译结果
        if 'translation' in result and len(result['translation']) > 0:
            translation = result['translation'][0]
            return jsonify({
                'success': True,
                'translation': translation
            })
        else:
            return jsonify({
                'success': False,
                'error': '翻译结果为空'
            }), 400
            
    except Exception as e:
        print(f"有道翻译失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
