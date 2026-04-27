// 句子练习页面逻辑
const API_BASE_URL = '/api/articles';
const WORDS_API_URL = '/api/words';
let articles = [];
let filteredArticles = [];
let currentSelectedArticle = null; // 保存当前选中的文章
let words = []; // 存储单词数据用于翻译查询

// 翻译配置 - 从localStorage加载或使用默认值
let translationConfig = {
    provider: 'baidu', // 'baidu' 或 'youdao'
    baidu: {
        appid: '',
        key: ''
    },
    youdao: {
        appkey: '',
        key: ''
    }
};

// 从localStorage或后端API加载翻译配置
async function loadTranslationConfig() {
    // 首先尝试从localStorage加载
    const saved = localStorage.getItem('translationConfig');
    if (saved) {
        try {
            translationConfig = JSON.parse(saved);
            console.log('✅ 已从localStorage加载翻译配置:', translationConfig.provider);
            return;
        } catch (e) {
            console.error('加载localStorage配置失败:', e);
        }
    }
    
    // 如果localStorage没有，从后端API自动获取
    try {
        const response = await fetch('/api/translation-config');
        const data = await response.json();
        
        if (data.success && data.config) {
            // 自动配置API密钥
            if (data.config.baidu.configured) {
                translationConfig.baidu.appid = data.config.baidu.appid;
                translationConfig.baidu.key = data.config.baidu.key;
                translationConfig.provider = 'baidu';
                console.log('✅ 已自动配置百度翻译API');
            }
            
            if (data.config.youdao.configured) {
                translationConfig.youdao.appkey = data.config.youdao.appkey;
                translationConfig.youdao.key = data.config.youdao.key;
                
                // 如果百度未配置，使用有道
                if (!data.config.baidu.configured) {
                    translationConfig.provider = 'youdao';
                    console.log('✅ 已自动配置有道翻译API');
                }
            }
            
            // 保存到localStorage，下次直接使用
            localStorage.setItem('translationConfig', JSON.stringify(translationConfig));
            console.log('✅ 翻译配置已保存到localStorage');
        } else {
            console.warn('⚠️ 未找到翻译API配置，请前往 config.html 页面配置');
        }
    } catch (error) {
        console.warn('⚠️ 无法从后端获取翻译配置:', error.message);
    }
}

// 初始化时加载配置
loadTranslationConfig();

// 初始化页面
async function initPage() {
    try {
        // 同时加载文章和单词数据
        const [articlesResponse, wordsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}`),
            fetch(`${WORDS_API_URL}`)
        ]);
        
        articles = await articlesResponse.json();
        words = await wordsResponse.json();
        
        console.log('加载的文章数据:', articles);
        console.log('加载的单词数据:', words.length, '个单词');
        applyFilters();
    } catch (error) {
        console.error('初始化页面失败:', error);
    }
}

// 筛选文章
function filterArticles() {
    const gradeFilter = document.getElementById('gradeFilter')?.value || '';
    const unitFilter = document.getElementById('unitFilter')?.value || '';
    const languageFilter = document.getElementById('languageFilter')?.value || '';
    const killFilter = document.getElementById('killFilter')?.value || '';
    const checkFilter = document.getElementById('checkFilter')?.value || '';
    const sortFilter = document.getElementById('sortFilter')?.value || 'id';
    const searchText = (document.getElementById('searchInput')?.value || '').toLowerCase();
    
    let filtered = [...articles];
    
    // 按年级筛选 - 对应Excel的Grade列
    if (gradeFilter) {
        filtered = filtered.filter(article => {
            const articleGrade = article.grade || '';
            return articleGrade === gradeFilter;
        });
    }
    
    // 按单元筛选 - 对应Excel的unit列
    if (unitFilter) {
        filtered = filtered.filter(article => {
            const articleUnit = String(article.unit || '');
            return articleUnit === unitFilter;
        });
    }
    
    // 按语言筛选 - English列和Chinese列
    if (languageFilter === 'english') {
        // 只显示有英文内容的文章
        filtered = filtered.filter(article => article.english && article.english.trim() !== '');
    } else if (languageFilter === 'meaning') {
        // 只显示有中文内容的文章
        filtered = filtered.filter(article => article.meaning && article.meaning.trim() !== '');
    }
    
    // 按kill筛选 - 对应Excel的kill列
    if (killFilter === 'kill') {
        filtered = filtered.filter(article => article.kill === true || article.kill === 1);
    } else if (killFilter === 'no-kill') {
        filtered = filtered.filter(article => article.kill === false || article.kill === 0 || !article.kill);
    }
    
    // 按check筛选 - 对应Excel的check列
    if (checkFilter === 'checked') {
        filtered = filtered.filter(article => article.check === 1 || article.check === true);
    } else if (checkFilter === 'unchecked') {
        filtered = filtered.filter(article => article.check === 0 || article.check === false || !article.check);
    }
    
    // 搜索筛选
    if (searchText) {
        filtered = filtered.filter(article => 
            (article.title && article.title.toLowerCase().includes(searchText)) ||
            (article.english && article.english.toLowerCase().includes(searchText)) ||
            (article.meaning && article.meaning.toLowerCase().includes(searchText))
        );
    }
    
    // 排序
    if (sortFilter === 'random') {
        filtered = filtered.sort(() => Math.random() - 0.5);
    } else if (sortFilter === 'az') {
        filtered = filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
        filtered = filtered.sort((a, b) => a.id - b.id);
    }
    
    return filtered;
}

// 应用筛选条件
function applyFilters() {
    filteredArticles = filterArticles();
    renderArticles(filteredArticles);
    
    // 如果有选中的文章，根据新的语言筛选重新渲染内容
    if (currentSelectedArticle) {
        renderArticleContent(currentSelectedArticle);
    }
}

// 渲染文章列表
function renderArticles(articles) {
    const container = document.getElementById('normalWordContainer');
    container.innerHTML = '';
    
    if (articles.length === 0) {
        container.innerHTML = '<div class="no-data">没有符合条件的文章</div>';
        return;
    }
    
    articles.forEach(article => {
        const articleCard = document.createElement('div');
        articleCard.className = 'word-card full-width';
        articleCard.dataset.id = article.id;
        
        // 文章列表始终显示英文标题，不受语言筛选影响
        const displayText = article.title || '';
        
        articleCard.innerHTML = `
            <span class="word-text">${displayText}</span>
            <input type="checkbox" class="check-box" onchange="toggleKill(${article.id})" ${article.kill ? 'checked' : ''}>
            <input type="checkbox" class="check-box" onchange="toggleCheckStatus(${article.id})" ${article.check ? 'checked' : ''}>
            <div class="edit-btn" onclick="editArticle(${article.id})" title="编辑文章">✏️</div>
        `;
        
        // 点击文章显示内容
        articleCard.addEventListener('click', (e) => {
            if (!e.target.closest('.check-box') && !e.target.closest('.edit-btn')) {
                showArticleContent(article);
            }
        });
        
        container.appendChild(articleCard);
    });
}

// 显示文章内容 - 根据语言筛选决定显示英文还是中文
function showArticleContent(article) {
    currentSelectedArticle = article; // 保存当前选中的文章
    renderArticleContent(article);
}

// 渲染文章内容 - 根据语言筛选显示
function renderArticleContent(article) {
    if (!article) return;
    
    const contentContainer = document.getElementById('killWordContainer');
    const languageFilter = document.getElementById('languageFilter')?.value || '';
    
    let contentHtml = `<div class="article-content"><h3>${article.title || ''}</h3>`;
    
    // 根据语言筛选决定显示内容
    if (languageFilter === 'english') {
        // 只显示英文内容（Excel的English列），并将单词包装成可点击元素
        if (article.english) {
            const sentences = splitIntoSentences(article.english);
            const clickableSentences = sentences.map(sentence => {
                const clickableText = makeWordsClickable(sentence);
                return `<div class="sentence-line">${clickableText}</div>`;
            }).join('');
            contentHtml += `<div class="english-content">${clickableSentences}</div>`;
        } else {
            contentHtml += `<div class="no-data">暂无英文内容</div>`;
        }
    } else if (languageFilter === 'meaning') {
        // 只显示中文内容（Excel的Chinese列）
        if (article.meaning) {
            const sentences = splitIntoSentences(article.meaning);
            const sentenceLines = sentences.map(sentence => {
                return `<div class="sentence-line">${sentence}</div>`;
            }).join('');
            contentHtml += `<div class="chinese-content">${sentenceLines}</div>`;
        } else {
            contentHtml += `<div class="no-data">暂无中文内容</div>`;
        }
    } else {
        // 无筛选时，同时显示英文和中文
        if (article.english) {
            const sentences = splitIntoSentences(article.english);
            const clickableSentences = sentences.map(sentence => {
                const clickableText = makeWordsClickable(sentence);
                return `<div class="sentence-line">${clickableText}</div>`;
            }).join('');
            contentHtml += `<div class="english-content">${clickableSentences}</div>`;
        }
        if (article.meaning) {
            const sentences = splitIntoSentences(article.meaning);
            const sentenceLines = sentences.map(sentence => {
                return `<div class="sentence-line">${sentence}</div>`;
            }).join('');
            contentHtml += `<div class="chinese-content">${sentenceLines}</div>`;
        }
        if (!article.english && !article.meaning) {
            contentHtml += `<div class="no-data">暂无内容</div>`;
        }
    }
    
    contentHtml += `</div>`;
    contentContainer.innerHTML = contentHtml;
    
    // 为所有可点击的单词添加事件监听
    attachWordClickEvents();
}

// 将文本按句子分割（以句号、问号、感叹号、换行符为分隔符）
function splitIntoSentences(text) {
    if (!text) return [];
    
    // 首先按换行符分割
    const lines = text.split(/\n/);
    const sentences = [];
    
    // 对每一行，再按句子结束标点分割
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // 按英文或中文的句子结束标点分割，但保留标点符号
        const matches = line.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g);
        if (matches) {
            matches.forEach(match => {
                const trimmed = match.trim();
                if (trimmed) {
                    sentences.push(trimmed);
                }
            });
        } else {
            sentences.push(line);
        }
    });
    
    return sentences;
}

// 将英文文本中的单词包装成可点击的元素
function makeWordsClickable(text) {
    // 使用正则表达式匹配单词（包括连字符和撇号），保留所有非字母字符不变
    return text.replace(/([a-zA-Z]+(?:['-][a-zA-Z]+)*)/g, '<span class="clickable-word" data-word="$1">$1</span>');
}

// 为所有可点击的单词添加事件监听
function attachWordClickEvents() {
    const clickableWords = document.querySelectorAll('.clickable-word');
    clickableWords.forEach(word => {
        word.addEventListener('click', handleWordClick);
    });
}

// 处理单词点击事件 - 支持切换显示/隐藏，各单词状态独立
async function handleWordClick(e) {
    e.stopPropagation();
    const wordElement = e.target;
    const word = wordElement.dataset.word;
    
    if (!word) return;
    
    // 播放发音并添加视觉反馈
    speakWord(word);
    
    // 添加发音时的视觉反馈
    wordElement.classList.add('speaking');
    setTimeout(() => {
        wordElement.classList.remove('speaking');
    }, 1000);
    
    // 检查是否已经激活（已变色）
    const isActive = wordElement.classList.contains('word-active');
    
    // 如果已经激活，则恢复原样并隐藏翻译
    if (isActive) {
        wordElement.classList.remove('word-active');
        hideWordTranslation(wordElement);
        return;
    }
    
    // 激活当前单词（变色）
    wordElement.classList.add('word-active');
    
    // 获取翻译并显示
    const translation = await getWordTranslation(word);
    showWordTranslation(wordElement, translation);
}

// 使用Web Speech API播放单词发音 - 优化版本
function speakWord(word) {
    if (!word) return;
    
    console.log("🚀 播放单词：", word);
    
    // 先清空之前的语音
    window.speechSynthesis.cancel();
    
    const msg = new SpeechSynthesisUtterance();
    msg.text = word;
    msg.lang = 'zh-CN'; // 设置为美式英语
    msg.rate = 0.8; // 语速稍慢，便于学习
    msg.pitch = 1;

    // 核心：Chrome 必须等语音加载完成
    function speak() {
        window.speechSynthesis.speak(msg);
        console.log("✅ 正在播放……");
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
        speak();
    } else {
        // 如果语音列表为空，等待加载
        window.speechSynthesis.onvoiceschanged = speak;
    }
}

// 获取单词翻译 - 优先本地，其次API
async function getWordTranslation(word) {
    // 首先尝试从本地单词数据中查找
    const localWord = words.find(w => w.word.toLowerCase() === word.toLowerCase());
    if (localWord && localWord.meaning) {
        return localWord.meaning;
    }
    
    // 如果本地没有，尝试使用翻译API
    try {
        const apiTranslation = await translateWithAPI(word);
        if (apiTranslation) {
            console.log(`✅ API翻译成功: "${word}" → "${apiTranslation}"`);
            return apiTranslation;
        }
    } catch (error) {
        console.warn(`⚠️ API翻译失败: ${error.message}`);
    }
    
    // 如果API也失败，返回提示信息
    return '暂无翻译';
}

// 使用翻译API翻译单词
async function translateWithAPI(word) {
    const config = getCurrentTranslationConfig();
    
    if (!config.valid) {
        throw new Error(config.message);
    }
    
    // 根据配置的provider选择翻译服务
    if (config.provider === 'baidu') {
        return await translateWithBaidu(word, config.appid, config.key);
    } else {
        return await translateWithYoudao(word, config.appkey, config.key);
    }
}

// 获取当前有效的翻译配置
function getCurrentTranslationConfig() {
    if (translationConfig.provider === 'baidu') {
        if (!translationConfig.baidu.appid || !translationConfig.baidu.key) {
            return { valid: false, message: '百度翻译未配置' };
        }
        return { 
            valid: true, 
            provider: 'baidu',
            appid: translationConfig.baidu.appid,
            key: translationConfig.baidu.key
        };
    } else {
        if (!translationConfig.youdao.appkey || !translationConfig.youdao.key) {
            return { valid: false, message: '有道翻译未配置' };
        }
        return { 
            valid: true, 
            provider: 'youdao',
            appkey: translationConfig.youdao.appkey,
            key: translationConfig.youdao.key
        };
    }
}

// 百度翻译API（通过本地代理服务器）
async function translateWithBaidu(text, appid, key) {
    const proxyUrl = '/api/translate/baidu';
    
    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                appid: appid,
                key: key
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.translation) {
            throw new Error('翻译结果为空');
        }
        
        return data.translation;
        
    } catch (error) {
        console.error('百度翻译API调用失败:', error);
        throw error;
    }
}

// 有道翻译API（通过本地代理服务器）
async function translateWithYoudao(text, appkey, key) {
    const proxyUrl = '/api/translate/youdao';
    
    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                appkey: appkey,
                key: key
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.translation) {
            throw new Error('翻译结果为空');
        }
        
        return data.translation;
        
    } catch (error) {
        console.error('有道翻译API调用失败:', error);
        throw error;
    }
}

// 显示单词翻译 - 在单词正下方显示
function showWordTranslation(wordElement, translation) {
    // ⭐ 不再隐藏其他翻译，每个单词的翻译独立显示
    
    // 检查是否已经存在翻译元素
    let translationDiv = wordElement.querySelector('.word-translation');
    
    if (!translationDiv) {
        // 创建翻译显示元素
        translationDiv = document.createElement('div');
        translationDiv.className = 'word-translation';
        translationDiv.textContent = translation;
        
        // 作为子元素添加到单词内部，确保在单词正下方
        wordElement.appendChild(translationDiv);
    } else {
        // 如果已存在，更新内容
        translationDiv.textContent = translation;
    }
}

// 隐藏单词翻译
function hideWordTranslation(wordElement) {
    const translationDiv = wordElement.querySelector('.word-translation');
    if (translationDiv) {
        translationDiv.remove();
    }
}

// 搜索文章
function searchSentences() {
    applyFilters();
}

// 切换文章已斩状态 - 对应Excel的kill列
async function toggleKill(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.kill = !article.kill;
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ kill: article.kill })
            });
            if (!response.ok) {
                console.error('更新kill状态失败');
                article.kill = !article.kill; // 回滚
            }
        } catch (error) {
            console.error('网络错误:', error);
            article.kill = !article.kill; // 回滚
        }
    }
}

// 切换文章check状态 - 对应Excel的check列
async function toggleCheckStatus(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.check = article.check ? 0 : 1;
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ check: article.check })
            });
            if (!response.ok) {
                console.error('更新check状态失败');
                article.check = article.check ? 0 : 1; // 回滚
            }
        } catch (error) {
            console.error('网络错误:', error);
            article.check = article.check ? 0 : 1; // 回滚
        }
    }
}

// 编辑文章
function editArticle(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        // 填充表单
        document.getElementById('wordInput').value = article.title || '';
        document.getElementById('gradeInput').value = article.grade || '7上';
        document.getElementById('unitInput').value = article.unit || '1';
        document.getElementById('exampleInput').value = article.english || '';
        document.getElementById('meaningInput').value = article.meaning || '';
        
        // 保存当前编辑ID
        window.currentEditId = id;
        
        // 显示模态框
        document.getElementById('modalTitle').textContent = '编辑文章';
        document.getElementById('modal').style.display = 'block';
    }
}

// 显示添加模态框
function showAddModal() {
    window.currentEditId = null;
    // 清空表单
    document.getElementById('wordInput').value = '';
    document.getElementById('gradeInput').value = '7上';
    document.getElementById('unitInput').value = '1';
    document.getElementById('exampleInput').value = '';
    document.getElementById('meaningInput').value = '';
    
    document.getElementById('modalTitle').textContent = '添加文章';
    document.getElementById('modal').style.display = 'block';
}

// 关闭模态框
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    window.currentEditId = null;
}

// 保存文章
async function saveWord() {
    const title = document.getElementById('wordInput').value.trim();
    const grade = document.getElementById('gradeInput').value;
    const unit = document.getElementById('unitInput').value;
    const english = document.getElementById('exampleInput').value.trim();
    const meaning = document.getElementById('meaningInput').value.trim();
    
    if (!title) {
        alert('请输入文章标题');
        return;
    }
    
    try {
        if (window.currentEditId) {
            // 更新现有文章
            const response = await fetch(`${API_BASE_URL}/${window.currentEditId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    grade: grade,
                    unit: unit,
                    english: english,
                    meaning: meaning
                })
            });
            
            if (response.ok) {
                const updatedArticle = await response.json();
                const index = articles.findIndex(a => a.id === window.currentEditId);
                if (index !== -1) {
                    articles[index] = updatedArticle;
                }
                alert('修改成功！');
                closeModal();
                applyFilters();
            } else {
                alert('修改失败，请重试');
            }
        } else {
            // 添加新文章
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    grade: grade,
                    unit: unit,
                    english: english,
                    meaning: meaning
                })
            });
            
            if (response.ok) {
                const newArticle = await response.json();
                articles.push(newArticle);
                alert('添加成功！');
                closeModal();
                applyFilters();
            } else {
                alert('添加失败，请重试');
            }
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败，请重试');
    }
}

// 保存所有更改
async function saveChanges() {
    if (!confirm('确定要保存所有更改吗？这将更新Excel文件。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/save-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articles: articles })
        });
        
        if (response.ok) {
            alert('保存成功！所有更改已同步到Excel文件。');
        } else {
            alert('保存失败，请重试');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败，请重试');
    }
}

// 页面加载时初始化所有事件
document.addEventListener('DOMContentLoaded', function() {
    // 唤醒语音引擎 - 确保语音列表已加载
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        
        // Chrome需要等待语音加载完成
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                console.log('✅ 语音引擎已就绪');
            };
        }
    }
    
    console.log('📄 句子练习页面已加载');
});

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initPage);