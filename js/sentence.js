let articles = [];
let currentSelectedArticle = null;
let words = []; // 存储单词数据用于翻译查询

// 加载本地Excel文件
async function loadLocalExcel() {
    try {
        console.log('📂 开始加载本地Excel文件: 英文文章表.xlsx');
        
        // 使用fetch获取本地Excel文件
        const response = await fetch('英文文章表.xlsx');
        const data = await response.arrayBuffer();
        
        // 解析Excel文件
        const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('📊 Excel解析结果:', jsonData);
        console.log('📊 第一条数据:', jsonData[0]);
        
        if (jsonData.length === 0) {
            console.log('⚠️ Excel文件中没有数据，使用默认数据');
            return;
        }
        
        // 转换为文章格式
        articles = jsonData.map((article, index) => {
            // 智能查找列名 - 不区分大小写，包含关键词即可
            const getValue = (keywords) => {
                for (const key in article) {
                    const keyLower = key.toLowerCase();
                    for (const keyword of keywords) {
                        if (keyLower.includes(keyword.toLowerCase())) {
                            return article[key];
                        }
                    }
                }
                return '';
            };
            
            // 尝试获取标题
            let titleValue = getValue(['title', '标题', 'name', '名称']);
            
            // 尝试获取英文内容
            let englishValue = getValue(['english', '英文', 'content', '内容']);
            
            // 尝试获取中文释义
            let meaningValue = getValue(['meaning', '释义', '中文', '翻译']);
            
            // 尝试获取其他字段
            const gradeValue = getValue(['grade', '年级']);
            const unitValue = getValue(['unit', '单元']);
            const translateWordValue = getValue(['translate-word', '翻译', 'translate']);
            
            // 获取kill状态
            let killValue = false;
            for (const key in article) {
                if (key.toLowerCase().includes('kill') || key.includes('已斩')) {
                    const val = article[key];
                    killValue = val === true || val === 'true' || val === 1 || val === '已斩' || val === '已斩杀';
                    break;
                }
            }
            
            // 获取check状态
            let checkValue = 0;
            for (const key in article) {
                if (key.toLowerCase().includes('check') || key.includes('检查')) {
                    const val = article[key];
                    checkValue = val === true || val === 'true' || val === 1 ? 1 : 0;
                    break;
                }
            }
            
            return {
                id: index + 1,
                title: titleValue || `文章${index + 1}`,
                kill: killValue,
                check: checkValue,
                grade: gradeValue || '',
                unit: unitValue || '',
                english: englishValue || '',
                meaning: meaningValue || '',
                translate_word: translateWordValue || '',
                content: englishValue || ''
            };
        }).filter(a => a.title);
        
        console.log('✅ 处理后的数据:', articles);
        console.log('✅ 文章数量:', articles.length);
        
        if (articles.length === 0) {
            console.log('⚠️ 没有找到有效的文章数据，使用默认数据');
            return;
        }
        
        // 更新页面
        renderArticles();
        console.log('✅ 本地Excel文件加载成功！');
        
    } catch (error) {
        console.error('❌ 加载本地Excel文件失败:', error);
        // 如果加载失败，使用默认数据
        console.log('⚠️ 加载本地Excel文件失败，使用默认数据');
        loadArticles();
    }
}

async function loadArticles() {
    try {
        const response = await fetch('articles.json');
        articles = await response.json();
        renderArticles();
    } catch (error) {
        console.error('加载文章失败:', error);
        // 使用内置模拟数据
        articles = [
            {
                "id": 1,
                "title": "A myself(关于自己）",
                "content": "Hello,\n  I am li Yuxiang.\n  I am a boy.\n  I'm nine years old.\n  I'm tall and strong.",
                "english": "Hello, I am li Yuxiang. I am a boy. I'm nine years old. I'm tall and strong.",
                "meaning": "你好，我是李雨翔。我是一个男孩。我九岁了。我又高又壮。"
            },
            {
                "id": 2,
                "title": "B hobbies（个人兴趣爱好）",
                "content": "I like reading and writing.\n  I like painting too.\n  I like swimming.\n   I like playing basketball and online-games.",
                "english": "I like reading and writing. I like painting too. I like swimming. I like playing basketball and online-games.",
                "meaning": "我喜欢阅读和写作。我也喜欢绘画。我喜欢游泳。我喜欢打篮球和网络游戏。"
            },
            {
                "id": 3,
                "title": "C family（家庭背景）",
                "content": "I have a happy family.\n  My father is a superman.\n  he can do everything.\n  My mother is a nurse.\n  she works in a hospital.\n  I don't have brothers and sisters.\n  I have three fish.\n  they are my pets.\n  and they are my best friend.",
                "english": "I have a happy family. My father is a superman. He can do everything. My mother is a nurse. She works in a hospital. I don't have brothers and sisters. I have three fish. They are my pets and they are my best friend.",
                "meaning": "我有一个幸福的家庭。我的爸爸是一个超人。他能做所有事情。我的妈妈是一名护士。她在医院工作。我没有兄弟姐妹。我有三条鱼。它们是我的宠物，也是我最好的朋友。"
            },
            {
                "id": 4,
                "title": "D your school life （你的学校生活）",
                "content": "I like my school\n  my school is beautiful\n  There are teachers and students\n  I have a lot of friends, \n  I am so happy at here",
                "english": "I like my school. My school is beautiful. There are teachers and students. I have a lot of friends. I am so happy here.",
                "meaning": "我喜欢我的学校。我的学校很漂亮。有老师和学生。我有很多朋友。我在这里很开心。"
            },
            {
                "id": 5,
                "title": "E my dream（我的梦想）",
                "content": "I have a dream.\n  I want to be a painter （teacher scientist sporter doctor fireman ）",
                "english": "I have a dream. I want to be a painter (teacher scientist sportsman doctor fireman).",
                "meaning": "我有一个梦想。我想成为一名画家（教师、科学家、运动员、医生、消防员）。"
            },
            {
                "id": 6,
                "title": "F Ending （结语）",
                "content": "That's all.\n  Thank you!",
                "english": "That's all. Thank you!",
                "meaning": "就这些了。谢谢！"
            }
        ];
        renderArticles();
    }
}

function renderArticles() {
    const container = document.getElementById('normalWordContainer');
    container.innerHTML = '';
    
    if (articles.length === 0) {
        container.innerHTML = '<div class="no-data">没有文章</div>';
        return;
    }
    
    articles.forEach(article => {
        const articleCard = document.createElement('div');
        articleCard.className = 'word-card full-width';
        articleCard.dataset.id = article.id;
        
        const displayText = article.title || '';
        
        articleCard.innerHTML = `
            <span class="word-text">${displayText}</span>
        `;
        
        articleCard.addEventListener('click', () => {
            showArticleContent(article);
        });
        
        container.appendChild(articleCard);
    });
}

function showArticleContent(article) {
    currentSelectedArticle = article;
    const contentContainer = document.getElementById('killWordContainer');
    
    let contentHtml = `<div class="article-content"><h3>${article.title || ''}</h3>`;
    
    if (article.english) {
        const clickableText = makeWordsClickable(article.english);
        contentHtml += `<div class="english-content">${clickableText}</div>`;
    }
    
    if (article.meaning) {
        // 将文本按换行符分割成句子
        const sentences = article.meaning.split(/\n+/);
        // 为每个句子创建<p>标签
        const meaningWithBreaks = sentences.map(sentence => {
            if (!sentence.trim()) return '';
            return `<p>${sentence}</p>`;
        }).join('');
        contentHtml += `<div class="chinese-content">${meaningWithBreaks}</div>`;
    }
    
    if (!article.english && !article.meaning && article.content) {
        // 将文本按换行符分割成句子
        const sentences = article.content.split(/\n+/);
        // 为每个句子创建<p>标签
        const contentWithBreaks = sentences.map(sentence => {
            if (!sentence.trim()) return '';
            return `<p>${sentence}</p>`;
        }).join('');
        contentHtml += `<div class="content">${contentWithBreaks}</div>`;
    }
    
    contentHtml += `</div>`;
    contentContainer.innerHTML = contentHtml;
    
    attachWordClickEvents();
}

function makeWordsClickable(text) {
    if (!text) return '';
    // 将文本按换行符分割成句子
    const sentences = text.split(/\n+/);
    let wordIndex = 0;
    // 为每个句子创建<p>标签，并为每个单词添加可点击事件
    return sentences.map(sentence => {
        if (!sentence.trim()) return '';
        const clickableText = sentence.replace(/([a-zA-Z]+(?:['-][a-zA-Z]+)*)/g, (match) => {
            const html = `<span class="clickable-word" data-word="${match}" data-index="${wordIndex}">${match}</span>`;
            wordIndex++;
            return html;
        });
        return `<p>${clickableText}</p>`;
    }).join('');
}

function attachWordClickEvents() {
    const clickableWords = document.querySelectorAll('.clickable-word');
    clickableWords.forEach(word => {
        word.addEventListener('click', handleWordClick);
    });
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
    if (typeof words !== 'undefined' && words.length > 0) {
        const localWord = words.find(w => w.word.toLowerCase() === lowerWord);
        if (localWord && localWord.meaning) {
            console.log(`✅ 本地翻译（单词表）: ${word} -> ${localWord.meaning}`);
            return localWord.meaning;
        }
    }
    
    // ⭐ 第三优先级：返回提示
    console.log(`⚠️ 本地无翻译: ${word}`);
    return '缺少释义';
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
    
    const lowerWord = word.toLowerCase();
    const matches = [];
    
    allWords.forEach((wordObj, index) => {
        if (wordObj.word.toLowerCase() === lowerWord && index < allTranslations.length) {
            matches.push({
                index: wordObj.globalIndex,
                lineIndex: wordObj.lineIndex,
                indexInLine: wordObj.indexInLine,
                translation: allTranslations[index].translation
            });
        }
    });
    
    return matches;
}

// 显示单词翻译 - 在单词正下方显示
function showWordTranslation(wordElement, translation) {
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

// 处理单词点击事件 - 支持切换显示/隐藏，各单词状态独立
function handleWordClick(e) {
    e.stopPropagation();
    const wordElement = e.target;
    const word = wordElement.dataset.word;
    const wordIndex = parseInt(wordElement.dataset.index); // 获取单词的位置索引
    
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
    const translation = getLocalTranslation(word, wordIndex); // 传入位置索引
    showWordTranslation(wordElement, translation);
}

function speakWord(word) {
    if (!word) return;
    
    console.log("🚀 播放单词：", word);
    
    window.speechSynthesis.cancel();
    
    const msg = new SpeechSynthesisUtterance();
    msg.text = word;
    msg.lang = 'zh-CN';
    msg.rate = 0.8;
    msg.pitch = 1;

    function speak() {
        window.speechSynthesis.speak(msg);
        console.log("✅ 正在播放……");
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
        speak();
    } else {
        window.speechSynthesis.onvoiceschanged = speak;
    }
}

// 加载单词表数据
async function loadWords() {
    try {
        const response = await fetch('words.json');
        words = await response.json();
        console.log(`✅ 成功加载单词表，共 ${words.length} 个单词`);
    } catch (error) {
        console.error('加载单词表失败:', error);
        words = [];
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadLocalExcel();
    loadWords(); // 同时加载单词表
});
