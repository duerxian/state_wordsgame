# 8上单词表管理系统

这是一个基于Flask的单词管理系统，将Excel文件作为简易数据库，实现Web界面与Excel文件的数据交换。

## 功能特点

- **读取Excel数据**：自动从"8上-下单词表.xlsx"文件中读取"英文English"列的单词
- **数据交换**：Web界面的所有操作都会同步到Excel文件
- **增删改查**：完整的单词管理功能
- **实时搜索**：支持单词搜索和筛选
- **响应式设计**：支持桌面和移动设备

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动服务

1. 确保"8上-下单词表.xlsx"文件在项目根目录
2. 启动Flask后端服务：

```bash
python app.py
```

3. 在浏览器中打开 `test/index.html` 文件

## API接口

### 获取所有单词
```
GET http://localhost:5000/api/words
```

### 获取单个单词
```
GET http://localhost:5000/api/words/{id}
```

### 添加单词
```
POST http://localhost:5000/api/words
Content-Type: application/json

{
  "word": "example"
}
```

### 更新单词
```
PUT http://localhost:5000/api/words/{id}
Content-Type: application/json

{
  "word": "updated_word"
}
```

### 删除单词
```
DELETE http://localhost:5000/api/words/{id}
```

### 搜索单词
```
GET http://localhost:5000/api/words/search?q=keyword
```

## 文件结构

```
wordsgame/
├── app.py                    # Flask后端应用
├── requirements.txt           # Python依赖
├── 8上-下单词表.xlsx        # Excel数据文件
└── test/
    ├── index.html           # 前端页面
    └── css/
        └── style.css       # 样式文件
```

## 使用说明

1. **查看单词**：页面加载后自动显示所有单词
2. **搜索单词**：在搜索框输入关键词，实时筛选
3. **添加单词**：点击"+ 添加单词"按钮，输入新单词
4. **编辑单词**：点击单词卡片上的编辑按钮
5. **删除单词**：点击单词卡片上的删除按钮

所有操作都会自动保存到Excel文件中。

## 注意事项

- 确保Excel文件没有被其他程序打开
- 后端服务运行在 http://localhost:5000
- 前端页面直接打开HTML文件即可使用
