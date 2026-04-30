// 句子练习页面逻辑
const API_BASE_URL = '/api/articles';
const WORDS_API_URL = '/api/words';
let articles = [];
let filteredArticles = [];
let currentSelectedArticle = null; // 保存当前选中的文章
let words = []; // 存储单词数据用于翻译查询
// ⭐ 删除 wordTranslationMap，改为基于当前文章的动态查找

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
            // ⭐ 始终加载所有可用的翻译配置（不管当前 provider 是什么）
            
            // 配置百度通用翻译
            if (data.config.baidu.configured) {
                translationConfig.baidu.appid = data.config.baidu.appid;
                translationConfig.baidu.key = data.config.baidu.key;
                console.log('✅ 已加载百度通用翻译配置');
                
                // 如果之前没有设置 provider，默认使用百度
                if (!translationConfig.provider || translationConfig.provider === 'baidu') {
                    translationConfig.provider = 'baidu';
                }
            }
            
            // 配置百度大模型翻译
            if (data.config.baidu_large.configured) {
                translationConfig.baidu_large = {
                    appid: data.config.baidu_large.appid,
                    key: data.config.baidu_large.key
                };
                console.log('✅ 已加载百度大模型翻译配置');
            }
            
            // ⭐ 配置有道翻译（无论百度是否配置，都要加载）
            if (data.config.youdao.configured) {
                translationConfig.youdao.appkey = data.config.youdao.appkey;
                translationConfig.youdao.key = data.config.youdao.key;
                console.log('✅ 已加载有道翻译配置');
                
                // 只有在百度未配置时，才将有道设为默认 provider
                if (!data.config.baidu.configured && !translationConfig.provider) {
                    translationConfig.provider = 'youdao';
                    console.log('✅ 设置有道为默认翻译服务');
                }
            }
            
            // 保存到localStorage，下次直接使用
            localStorage.setItem('translationConfig', JSON.stringify(translationConfig));
            console.log('✅ 翻译配置已保存到localStorage');
            console.log('📋 当前可用翻译服务:', {
                baidu: data.config.baidu.configured,
                baidu_large: data.config.baidu_large?.configured || false,
                youdao: data.config.youdao.configured,
                current_provider: translationConfig.provider
            });
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

// ⭐ 从当前文章的 translate-word 列中查找单词的翻译（基于位置对应）
function getTranslationFromCurrentArticle(word, wordIndex) {
    if (!currentSelectedArticle || !currentSelectedArticle.translate_word) {
        return null;
    }
    
    const englishText = currentSelectedArticle.english || '';
    const translateWordText = currentSelectedArticle.translate_word || '';
    
    if (!englishText || !translateWordText) {
        return null;
    }
    
    // ⭐ 关键修复：按相同的方式分段处理英文和中文
    const englishLines = englishText.split(/\n/).filter(line => line.trim());
    const chineseLines = translateWordText.split(/\n/).filter(line => line.trim());
    
    // 构建所有单词的列表及其对应的行号和行内索引
    const allWords = [];
    let globalIndex = 0;
    
    englishLines.forEach((line, lineIdx) => {
        const wordsInLine = line.match(/[a-zA-Z]+(?:['-][a-zA-Z]+)*/g) || [];
        wordsInLine.forEach(word => {
            allWords.push({
                word: word,
                globalIndex: globalIndex,
                lineIndex: lineIdx,
                indexInLine: allWords.filter(w => w.lineIndex === lineIdx).length
            });
            globalIndex++;
        });
    });
    
    // 构建所有翻译的列表
    const allTranslations = [];
    chineseLines.forEach((line, lineIdx) => {
        let translationsInLine = [];
        if (line.includes('/')) {
            translationsInLine = line.split('/').filter(t => t.trim());
        } else {
            translationsInLine = line.split(/[,;，；\s]+/).filter(t => t.trim());
        }
        
        translationsInLine.forEach(trans => {
            allTranslations.push({
                translation: trans,
                lineIndex: lineIdx
            });
        });
    });
    
    console.log(`🔍 解析翻译 - 英文行数: ${englishLines.length}, 中文行数: ${chineseLines.length}`);
    console.log(`🔍 英文单词总数: ${allWords.length}, 中文翻译总数: ${allTranslations.length}`);
    
    // 检查索引是否有效
    if (wordIndex >= 0 && wordIndex < allWords.length && wordIndex < allTranslations.length) {
        const targetWord = allWords[wordIndex];
        const clickedWordLower = word.toLowerCase();
        const currentWordLower = targetWord.word.toLowerCase();
        
        if (currentWordLower === clickedWordLower) {
            const translation = allTranslations[wordIndex].translation;
            console.log(`✅ 本地翻译（位置匹配）: "${word}" (全局位置${wordIndex}, 第${targetWord.lineIndex + 1}行) -> "${translation}"`);
            return translation;
        } else {
            console.warn(`⚠️ 位置不匹配: 期望 "${clickedWordLower}"，实际 "${currentWordLower}" (位置${wordIndex})`);
        }
    } else {
        console.warn(`⚠️ 索引越界: wordIndex=${wordIndex}, 英文单词数=${allWords.length}, 中文翻译数=${allTranslations.length}`);
    }
    
    return null;
}

// ⭐ 在文章中查找单词的所有出现位置及其翻译
function findAllWordTranslationsInArticle(word) {
    if (!currentSelectedArticle || !currentSelectedArticle.translate_word) {
        return [];
    }
    
    const englishText = currentSelectedArticle.english || '';
    const translateWordText = currentSelectedArticle.translate_word || '';
    
    if (!englishText || !translateWordText) {
        return [];
    }
    
    // ⭐ 关键修复：按相同的方式分段处理英文和中文
    const englishLines = englishText.split(/\n/).filter(line => line.trim());
    const chineseLines = translateWordText.split(/\n/).filter(line => line.trim());
    
    // 构建所有单词的列表
    const allWords = [];
    let globalIndex = 0;
    
    englishLines.forEach((line, lineIdx) => {
        const wordsInLine = line.match(/[a-zA-Z]+(?:['-][a-zA-Z]+)*/g) || [];
        wordsInLine.forEach(word => {
            allWords.push({
                word: word,
                globalIndex: globalIndex
            });
            globalIndex++;
        });
    });
    
    // 构建所有翻译的列表
    const allTranslations = [];
    chineseLines.forEach((line, lineIdx) => {
        let translationsInLine = [];
        if (line.includes('/')) {
            translationsInLine = line.split('/').filter(t => t.trim());
        } else {
            translationsInLine = line.split(/[,;，；\s]+/).filter(t => t.trim());
        }
        
        translationsInLine.forEach(trans => {
            allTranslations.push({
                translation: trans
            });
        });
    });
    
    const results = [];
    const targetWord = word.toLowerCase();
    
    // 查找所有匹配的单词位置
    for (let i = 0; i < allWords.length; i++) {
        if (allWords[i].word.toLowerCase() === targetWord && i < allTranslations.length) {
            results.push({
                index: i,
                translation: allTranslations[i].translation
            });
        }
    }
    
    return results;
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
    
    // 测试翻译API连接
    testTranslationAPI();
}

// 测试翻译API连接
async function testTranslationAPI() {
    const transFilter = document.getElementById('transFilter')?.value || 'baidu-general';
    const testWord = 'test';
    
    console.log(`🧪 测试${transFilter}翻译API连接...`);
    
    try {
        // ⭐ 传入 transFilter 参数
        const config = getCurrentTranslationConfig(transFilter);
        if (!config.valid) {
            console.error(`❌ 翻译配置无效: ${config.message}`);
            return;
        }
        
        let translation;
        if (transFilter === 'baidu-general' || transFilter === 'baidu-large') {
            translation = await translateWithBaidu(testWord, config.appid, config.key, transFilter === 'baidu-large' ? 'large' : 'general');
        } else if (transFilter === 'youdao') {
            translation = await translateWithYoudao(testWord, config.appkey, config.key);
        } else if (transFilter === 'local') {
            translation = getLocalTranslation(testWord);
            console.log(`✅ 本地翻译测试成功: "${testWord}" → "${translation}"`);
            return;
        }
        
        if (translation) {
            console.log(`✅ ${transFilter}翻译API连接成功: "${testWord}" → "${translation}"`);
        } else {
            console.error(`❌ ${transFilter}翻译API测试失败: 无翻译结果`);
        }
    } catch (error) {
        console.error(`❌ ${transFilter}翻译API测试失败: ${error.message}`);
    }
}

// 测试所有翻译 API
async function testAllTranslationAPIs() {
    console.log('🧪 开始测试所有翻译 API...');
    
    try {
        const response = await fetch('/api/test-translation');
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ 测试失败:', data.error);
            alert('测试失败: ' + data.error);
            return;
        }
        
        console.log('📊 测试结果:', data);
        
        let message = '翻译 API 测试结果:\n\n';
        const results = data.results;
        
        // 百度通用翻译
        if (results.baidu_general) {
            message += '【百度通用翻译】\n';
            if (results.baidu_general.status === 'success') {
                message += `✅ 成功 - "${data.test_word}" → "${results.baidu_general.translation}"\n`;
            } else if (results.baidu_general.status === 'error') {
                message += `❌ 失败 - 错误码: ${results.baidu_general.error_code}\n`;
                message += `   错误信息: ${results.baidu_general.error_msg}\n`;
            } else if (results.baidu_general.status === 'not_configured') {
                message += `⚠️ 未配置\n`;
            } else {
                message += `❌ 异常: ${results.baidu_general.error}\n`;
            }
            message += '\n';
        }
        
        // 百度大模型翻译
        if (results.baidu_large) {
            message += '【百度大模型翻译】\n';
            if (results.baidu_large.status === 'success') {
                message += `✅ 成功 - "${data.test_word}" → "${results.baidu_large.translation}"\n`;
            } else if (results.baidu_large.status === 'error') {
                message += `❌ 失败 - 错误码: ${results.baidu_large.error_code}\n`;
                message += `   错误信息: ${results.baidu_large.error_msg}\n`;
                
                // 提供解决方案
                if (results.baidu_large.error_code === '517') {
                    message += `\n💡 提示: 该密钥可能未开通"大模型翻译"服务\n`;
                    message += `   请前往百度翻译开放平台开通服务\n`;
                    message += `   网址: https://fanyi-api.baidu.com/api/trans/product/apipro\n`;
                }
            } else if (results.baidu_large.status === 'not_configured') {
                message += `⚠️ 未配置\n`;
            } else {
                message += `❌ 异常: ${results.baidu_large.error}\n`;
            }
            message += '\n';
        }
        
        // 有道翻译
        if (results.youdao) {
            message += '【有道翻译】\n';
            if (results.youdao.status === 'success') {
                message += `✅ 成功 - "${data.test_word}" → "${results.youdao.translation}"\n`;
            } else if (results.youdao.status === 'error') {
                message += `❌ 失败 - 错误码: ${results.youdao.error_code}\n`;
            } else if (results.youdao.status === 'not_configured') {
                message += `⚠️ 未配置\n`;
            } else {
                message += `❌ 异常: ${results.youdao.error}\n`;
            }
            message += '\n';
        }
        
        console.log(message);
        alert(message);
        
    } catch (error) {
        console.error('❌ 测试异常:', error);
        alert('测试异常: ' + error.message);
    }
}

// ⭐ 删除 showLocalTranslationStats，因为不再维护全局映射表

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
        articleCard.className = `word-card full-width ${article.check ? 'checked' : ''}`;
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
            const clickableText = makeWordsClickableWithIndex(article.english);
            contentHtml += `<div class="english-content">${clickableText}</div>`;
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
            const clickableText = makeWordsClickableWithIndex(article.english);
            contentHtml += `<div class="english-content">${clickableText}</div>`;
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

// 将文本按句子分割（只按换行符分割，不按标点分割）
function splitIntoSentences(text) {
    if (!text) return [];
    
    // 只按换行符分割，保留每一行的完整内容
    const lines = text.split(/\n/);
    const sentences = [];
    
    lines.forEach(line => {
        line = line.trim();
        if (line) {
            sentences.push(line);
        }
    });
    
    return sentences;
}

// 将英文文本中的单词包装成可点击的元素，并添加全局位置索引
function makeWordsClickableWithIndex(text) {
    if (!text) return '';
    
    // 按换行符分割成多行
    const lines = text.split(/\n/);
    let globalWordIndex = 0; // 全局单词索引
    
    const processedLines = lines.map(line => {
        line = line.trim();
        if (!line) return '';
        
        // 使用正则表达式匹配单词，并为每个单词添加 data-index 属性
        let wordIndexInLine = 0;
        const processedLine = line.replace(/([a-zA-Z]+(?:['-][a-zA-Z]+)*)/g, (match) => {
            const span = `<span class="clickable-word" data-word="${match}" data-index="${globalWordIndex}">${match}</span>`;
            globalWordIndex++;
            wordIndexInLine++;
            return span;
        });
        
        return `<div class="sentence-line">${processedLine}</div>`;
    });
    
    return processedLines.join('');
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
    const wordIndex = parseInt(wordElement.dataset.index); // ⭐ 获取单词的位置索引
    
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
    let translation;
    if (e.ctrlKey) {
        // CTRL+左键直接调用翻译API并覆盖缓存
        console.log(`🔄 强制调用API翻译: ${word}`);
        translation = await translateWithAPI(word);
        if (translation) {
            // 更新本地单词数据
            const localWord = words.find(w => w.word.toLowerCase() === word.toLowerCase());
            if (localWord) {
                localWord.meaning = translation;
            } else {
                words.push({ word: word, meaning: translation });
            }
        } else {
            translation = '暂无翻译';
        }
    } else {
        // 正常流程，优先本地缓存
        translation = await getWordTranslation(word, wordIndex); // ⭐ 传入位置索引
    }
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
    msg.rate = 0.6; // 语速稍慢，便于学习
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

// 获取单词翻译 - 智能降级策略
async function getWordTranslation(word, wordIndex = -1) {
    const transFilter = document.getElementById('transFilter')?.value || 'baidu-general';
    
    // ⭐ 如果选择本地翻译模式，直接使用本地数据
    if (transFilter === 'local') {
        const translation = getLocalTranslation(word, wordIndex);
        console.log(`🗄️ 本地翻译: "${word}" → "${translation}"`);
        return translation;
    }
    
    // ⭐ 第一优先级：从当前文章的 translate-word 列中查找（基于位置）
    if (wordIndex >= 0 && currentSelectedArticle) {
        const articleTranslation = getTranslationFromCurrentArticle(word, wordIndex);
        if (articleTranslation) {
            console.log(`✅ 使用文章翻译（位置匹配）: "${word}" → "${articleTranslation}"`);
            return articleTranslation;
        }
    }
    
    // ⭐ 第二优先级：从单词表（words数组）中查找
    const localWord = words.find(w => w.word.toLowerCase() === word.toLowerCase());
    if (localWord && localWord.meaning) {
        console.log(`✅ 使用单词表翻译: "${word}" → "${localWord.meaning}"`);
        return localWord.meaning;
    }
    
    // ⭐ 第三优先级：尝试使用翻译API
    try {
        const apiTranslation = await translateWithAPI(word, transFilter);
        if (apiTranslation) {
            console.log(`✅ API翻译成功: "${word}" → "${apiTranslation}"`);
            
            // 将API翻译结果保存到本地单词表，下次可以直接使用
            const existingWord = words.find(w => w.word.toLowerCase() === word.toLowerCase());
            if (existingWord) {
                existingWord.meaning = apiTranslation;
            } else {
                words.push({ word: word, meaning: apiTranslation });
            }
            
            return apiTranslation;
        }
    } catch (error) {
        console.warn(`⚠️ API翻译失败: ${error.message}`);
    }
    
    // ⭐ 第四优先级：返回友好提示
    console.log(`⚠️ 无法获取翻译: ${word}`);
    return '暂无翻译';
}

// 本地翻译 - 优先使用当前文章的 translate-word 列数据
function getLocalTranslation(word, wordIndex = -1) {
    if (!word) return '缺少释义';
    
    const lowerWord = word.toLowerCase();
    
    // ⭐ 第一优先级：如果有位置索引且当前有选中的文章，从文章中查找
    if (wordIndex >= 0 && currentSelectedArticle) {
        const articleTranslation = getTranslationFromCurrentArticle(word, wordIndex);
        if (articleTranslation) {
            return articleTranslation;
        }
    }
    
    // ⭐ 第二优先级：从单词表（words数组）中查找
    const localWord = words.find(w => w.word.toLowerCase() === lowerWord);
    if (localWord && localWord.meaning) {
        console.log(`✅ 本地翻译（单词表）: ${word} -> ${localWord.meaning}`);
        return localWord.meaning;
    }
    
    // ⭐ 第三优先级：返回提示
    console.log(`⚠️ 本地无翻译: ${word}`);
    return '缺少释义';
}

// 使用翻译API翻译单词
async function translateWithAPI(word, transFilter) {
    // ⭐ 传入 transFilter 参数获取对应的配置
    const config = getCurrentTranslationConfig(transFilter);
    
    if (!config.valid) {
        throw new Error(config.message);
    }
    
    // 根据筛选条件选择翻译服务
    if (transFilter === 'baidu-general' || transFilter === 'baidu-large') {
        return await translateWithBaidu(word, config.appid, config.key, transFilter === 'baidu-large' ? 'large' : 'general');
    } else if (transFilter === 'youdao') {
        return await translateWithYoudao(word, config.appkey, config.key);
    } else {
        // 默认使用百度通用翻译
        return await translateWithBaidu(word, config.appid, config.key, 'general');
    }
}

// 获取当前有效的翻译配置
function getCurrentTranslationConfig(transFilter) {
    // ⭐ 根据 transFilter 参数动态选择配置
    
    if (transFilter === 'baidu-general' || transFilter === 'baidu-large') {
        // 百度翻译（通用或大模型）
        if (!translationConfig.baidu.appid || !translationConfig.baidu.key) {
            return { valid: false, message: '百度翻译未配置' };
        }
        return { 
            valid: true, 
            provider: 'baidu',
            appid: translationConfig.baidu.appid,
            key: translationConfig.baidu.key
        };
    } else if (transFilter === 'youdao') {
        // 有道翻译
        if (!translationConfig.youdao.appkey || !translationConfig.youdao.key) {
            return { valid: false, message: '有道翻译未配置' };
        }
        return { 
            valid: true, 
            provider: 'youdao',
            appkey: translationConfig.youdao.appkey,
            key: translationConfig.youdao.key
        };
    } else {
        // 默认使用当前 provider
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
}

// 百度翻译API（通过本地代理服务器）
async function translateWithBaidu(text, appid, key, model = 'general') {
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
                key: key,
                model: model
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
function toggleKill(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.kill = !article.kill;
        // 更新卡片样式
        const articleCard = document.querySelector(`[data-id="${id}"]`);
        if (articleCard) {
            if (article.kill) {
                articleCard.classList.add('killed');
            } else {
                articleCard.classList.remove('killed');
            }
        }
        // 保存到后端
        fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(article)
        });
    }
}

// 切换文章check状态 - 对应Excel的check列
async function toggleCheckStatus(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.check = article.check ? 0 : 1;
        // 更新卡片样式
        const articleCard = document.querySelector(`[data-id="${id}"]`);
        if (articleCard) {
            if (article.check) {
                articleCard.classList.add('checked');
            } else {
                articleCard.classList.remove('checked');
            }
        }
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
                // 回滚卡片样式
                if (articleCard) {
                    if (article.check) {
                        articleCard.classList.add('checked');
                    } else {
                        articleCard.classList.remove('checked');
                    }
                }
            }
        } catch (error) {
            console.error('网络错误:', error);
            article.check = article.check ? 0 : 1; // 回滚
            // 回滚卡片样式
            if (articleCard) {
                if (article.check) {
                    articleCard.classList.add('checked');
                } else {
                    articleCard.classList.remove('checked');
                }
            }
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