let articles = [];
let originalArticles = []; // 存储原始文章数据
let currentSelectedArticle = null;
let words = []; // 存储单词数据用于翻译查询

// ⭐ 文章列表分页配置
let currentArticleListPage = 1;
const ITEMS_PER_PAGE = 8; // 每页显示的文章数量
let totalArticleListPages = 1;

// ⭐ 文章内容分页功能
let currentArticlePage = 1;
let totalArticlePages = 1;
const ARTICLE_CONTENT_HEIGHT_LIMIT = 800; // 内容高度限制(像素)

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
        
        originalArticles = [...articles]; // 保存原始数据
        
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
        originalArticles = [...articles];
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
        originalArticles = [...articles];
        renderArticles();
    }
}

// 渲染文章列表
function renderArticles(dataToRender = articles) {
    const container = document.getElementById('normalWordContainer');
    container.innerHTML = '';
    
    if (dataToRender.length === 0) {
        container.innerHTML = '<div class="no-data">没有符合条件的文章</div>';
        hideArticleListPagination();
        return;
    }
    
    // 计算总页数
    totalArticleListPages = Math.ceil(dataToRender.length / ITEMS_PER_PAGE);
    
    // 确保当前页在有效范围内
    if (currentArticleListPage > totalArticleListPages) {
        currentArticleListPage = totalArticleListPages;
    }
    if (currentArticleListPage < 1) {
        currentArticleListPage = 1;
    }
    
    // 计算当前页要显示的文章
    const start = (currentArticleListPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageArticles = dataToRender.slice(start, end);
    
    // 渲染当前页的文章
    pageArticles.forEach(article => {
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
        
        articleCard.addEventListener('click', (e) => {
            // 防止点击复选框和编辑按钮时触发文章内容显示
            if (!e.target.closest('.check-box') && !e.target.closest('.edit-btn')) {
                showArticleContent(article);
            }
        });
        
        container.appendChild(articleCard);
    });
    
    // 显示分页控件
    showArticleListPagination();
}

// 渲染分页控件
function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    
    // 如果只有一页或没有数据，隐藏分页
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = '';
    
    // 首页按钮
    const firstPageBtn = createPageButton('首页', 1);
    paginationContainer.appendChild(firstPageBtn);
    
    // 上一页按钮
    const prevPageBtn = createPageButton('上一页', currentArticleListPage - 1);
    prevPageBtn.disabled = currentArticleListPage === 1;
    paginationContainer.appendChild(prevPageBtn);
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentArticleListPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;
    
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 省略号（如果需要）
    if (startPage > 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
    }
    
    // 添加页码按钮
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPageButton(i.toString(), i);
        if (i === currentArticleListPage) {
            pageBtn.classList.add('active');
        }
        paginationContainer.appendChild(pageBtn);
    }
    
    // 省略号（如果需要）
    if (endPage < totalPages) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
    }
    
    // 下一页按钮
    const nextPageBtn = createPageButton('下一页', currentArticleListPage + 1);
    nextPageBtn.disabled = currentArticleListPage === totalPages;
    paginationContainer.appendChild(nextPageBtn);
    
    // 尾页按钮
    const lastPageBtn = createPageButton('尾页', totalPages);
    paginationContainer.appendChild(lastPageBtn);
}

// 创建分页按钮
function createPageButton(text, pageNum) {
    const button = document.createElement('button');
    button.className = 'pagination-btn';
    button.textContent = text;
    button.dataset.page = pageNum;
    
    button.addEventListener('click', () => {
        goToPage(pageNum);
    });
    
    return button;
}

// 跳转到指定页
function goToPage(pageNum) {
    const totalPages = Math.ceil(articles.length / ITEMS_PER_PAGE);
    if (pageNum < 1 || pageNum > totalPages || pageNum === currentArticleListPage) {
        return;
    }
    
    currentArticleListPage = pageNum;
    renderArticles();
}

function applyFilters() {
    const gradeFilter = document.getElementById('gradeFilter').value;
    const unitFilter = document.getElementById('unitFilter').value;
    const languageFilter = document.getElementById('languageFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    const killFilter = document.getElementById('killFilter').value;
    const checkFilter = document.getElementById('checkFilter').value;
    
    let filteredArticles = [...originalArticles];
    
    // 年级筛选
    if (gradeFilter) {
        filteredArticles = filteredArticles.filter(article => article.grade === gradeFilter);
    }
    
    // 单元筛选
    if (unitFilter) {
        filteredArticles = filteredArticles.filter(article => String(article.unit) === unitFilter);
    }
    
    // Kill状态筛选
    if (killFilter === 'kill') {
        filteredArticles = filteredArticles.filter(article => article.kill === true);
    } else if (killFilter === 'no-kill') {
        filteredArticles = filteredArticles.filter(article => article.kill !== true);
    }
    
    // Check状态筛选
    if (checkFilter === 'checked') {
        filteredArticles = filteredArticles.filter(article => article.check === 1 || article.check === true);
    } else if (checkFilter === 'unchecked') {
        filteredArticles = filteredArticles.filter(article => article.check !== 1 && article.check !== true);
    }
    
    // 排序
    if (sortFilter === 'az') {
        filteredArticles.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortFilter === 'random') {
        filteredArticles.sort(() => Math.random() - 0.5);
    }
    
    articles = filteredArticles;
    currentArticleListPage = 1; // 筛选后回到第一页
    renderArticles(filteredArticles);
}

function searchSentences() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!query) {
        applyFilters();
        return;
    }
    
    const results = originalArticles.filter(article => {
        const title = (article.title || '').toLowerCase();
        const english = (article.english || '').toLowerCase();
        const meaning = (article.meaning || '').toLowerCase();
        const content = (article.content || '').toLowerCase();
        
        return title.includes(query) || 
               english.includes(query) || 
               meaning.includes(query) || 
               content.includes(query);
    });
    
    articles = results;
    currentArticleListPage = 1; // 搜索后回到第一页
    renderArticles(results);
}

function showArticleContent(article) {
    currentSelectedArticle = article;
    currentArticlePage = 1; // 查看新文章时回到第一页
    renderArticleContentPage(article);
}

// 渲染文章内容分页
function renderArticleContentPage(article) {
    const contentContainer = document.getElementById('killWordContainer');
    
    // 准备所有内容段落 - 按段落分割，保留中英文对应关系
    let allParagraphs = [];
    
    // 处理英文和中文内容，确保段落对应
    if (article.english && article.meaning) {
        const englishParagraphs = article.english.split(/\n+/).filter(p => p.trim());
        const chineseParagraphs = article.meaning.split(/\n+/).filter(p => p.trim());
        
        // 配对中英文段落
        const maxLength = Math.max(englishParagraphs.length, chineseParagraphs.length);
        for (let i = 0; i < maxLength; i++) {
            if (i < englishParagraphs.length) {
                allParagraphs.push({
                    type: 'english',
                    content: englishParagraphs[i]
                });
            }
            if (i < chineseParagraphs.length) {
                allParagraphs.push({
                    type: 'chinese',
                    content: chineseParagraphs[i]
                });
            }
        }
    } else if (article.english) {
        // 只有英文内容
        const englishParagraphs = article.english.split(/\n+/).filter(p => p.trim());
        englishParagraphs.forEach(p => {
            allParagraphs.push({
                type: 'english',
                content: p
            });
        });
    } else if (article.meaning) {
        // 只有中文内容
        const chineseParagraphs = article.meaning.split(/\n+/).filter(p => p.trim());
        chineseParagraphs.forEach(p => {
            allParagraphs.push({
                type: 'chinese',
                content: p
            });
        });
    } else if (article.content) {
        // 只有普通内容
        const contentParagraphs = article.content.split(/\n+/).filter(p => p.trim());
        contentParagraphs.forEach(p => {
            allParagraphs.push({
                type: 'content',
                content: p
            });
        });
    }
    
        // 渲染内容 - 维护全局单词索引
        let contentHtml = `<div class="article-content"><h3>${article.title || ''}</h3>`;
        let globalWordIndex = 0;
        
        allParagraphs.forEach(paragraph => {
            if (paragraph.type === 'english') {
                const result = makeWordsClickable(paragraph.content, globalWordIndex);
                contentHtml += `<div class="english-content">${result.html}</div>`;
                globalWordIndex = result.nextIndex;
            } else if (paragraph.type === 'chinese') {
                contentHtml += `<div class="chinese-content"><p>${paragraph.content}</p></div>`;
            } else {
                contentHtml += `<div class="content"><p>${paragraph.content}</p></div>`;
            }
        });
    
    // 添加朗读控制按钮
    contentHtml += `
        <div class="voice-control-container">
            <button class="read-btn" onclick="toggleRead()">朗读 🔊</button>
        </div>`;
    
    contentHtml += `</div>`;
    contentContainer.innerHTML = contentHtml;
    
    attachWordClickEvents();
    
    // 延迟检查,确保DOM已完全渲染
    setTimeout(() => {
        checkAndInitPagination();
    }, 100);
}



// 检查并初始化分页
function checkAndInitPagination() {
    const contentContainer = document.getElementById('killWordContainer');
    if (!contentContainer) return;
    
    // 获取内容区域的实际渲染高度
    const contentHeight = contentContainer.scrollHeight;
    
    console.log(`📏 内容区域高度: ${contentHeight}px, 限制: ${ARTICLE_CONTENT_HEIGHT_LIMIT}px`);
    
    // 如果高度超过限制,启用分页
    if (contentHeight > ARTICLE_CONTENT_HEIGHT_LIMIT) {
        initArticlePagination();
    } else {
        // 隐藏分页控件
        hidePagination();
    }
}

// 初始化文章分页
function initArticlePagination() {
    const contentContainer = document.getElementById('killWordContainer');
    if (!contentContainer) return;
    
    const articleContent = contentContainer.querySelector('.article-content');
    if (!articleContent) return;
    
    // 获取所有段落元素
    const paragraphs = Array.from(articleContent.querySelectorAll('.english-content, .chinese-content, .content'));
    
    if (paragraphs.length === 0) {
        hidePagination();
        return;
    }
    
    // 计算每页可以显示多少个段落
    const containerHeight = ARTICLE_CONTENT_HEIGHT_LIMIT;
    const paragraphHeight = paragraphs[0].offsetHeight || 30; // 默认每个段落30px
    const paragraphsPerPage = Math.floor(containerHeight / paragraphHeight);
    
    if (paragraphsPerPage <= 0) {
        hidePagination();
        return;
    }
    
    // 计算总页数
    totalArticlePages = Math.ceil(paragraphs.length / paragraphsPerPage);
    currentArticlePage = 1;
    
    console.log(`📄 分页信息 - 总段落数: ${paragraphs.length}, 每页显示: ${paragraphsPerPage}, 总页数: ${totalArticlePages}`);
    
    // 存储段落数据供后续使用
    window.articleParagraphs = paragraphs;
    window.paragraphsPerPage = paragraphsPerPage;
    
    // 渲染第一页
    renderArticlePage(currentArticlePage);
    
    // 显示分页控件
    showPagination();
}

// 渲染指定页的文章内容
function renderArticlePage(pageNum) {
    if (!window.articleParagraphs || !window.paragraphsPerPage) return;
    
    const start = (pageNum - 1) * window.paragraphsPerPage;
    const end = start + window.paragraphsPerPage;
    const pageParagraphs = window.articleParagraphs.slice(start, end);
    
    const contentContainer = document.getElementById('killWordContainer');
    const articleContent = contentContainer.querySelector('.article-content');
    
    if (!articleContent) return;
    
    // 保留标题,只替换内容部分
    const title = articleContent.querySelector('h3');
    const voiceControl = articleContent.querySelector('.voice-control-container');
    
    // 创建新的内容容器
    const newContent = document.createElement('div');
    
    // 添加当前页的段落
    pageParagraphs.forEach(p => {
        newContent.appendChild(p.cloneNode(true));
    });
    
    // 清空现有内容,添加标题和新内容
    articleContent.innerHTML = '';
    articleContent.appendChild(title);
    
    // 添加新内容
    while (newContent.firstChild) {
        articleContent.appendChild(newContent.firstChild);
    }
    
    // 添加朗读控制按钮
    articleContent.appendChild(voiceControl);
    
    // 重新绑定单词点击事件
    attachWordClickEvents();
    
    // 更新分页UI
    updateArticlePaginationUI();
}

// 显示分页控件
function showPagination() {
    const pagination = document.getElementById('articlePagination');
    if (pagination) {
        pagination.style.display = 'flex';
        
        // 设置输入框的最大值
        const pageInput = document.getElementById('articlePageInput');
        if (pageInput) {
            pageInput.max = totalArticlePages;
        }
    }
}

// 隐藏分页控件
function hidePagination() {
    const pagination = document.getElementById('articlePagination');
    if (pagination) {
        pagination.style.display = 'none';
    }
}

// 更新分页UI
function updateArticlePaginationUI() {
    const pageNumbersContainer = document.getElementById('articlePageNumbers');
    if (!pageNumbersContainer) return;
    
    let html = '';
    
    // 根据总页数决定显示方式
    if (totalArticlePages <= 7) {
        // 页数少,全部显示
        for (let i = 1; i <= totalArticlePages; i++) {
            html += `<button onclick="goArticlePage(${i})" class="${i === currentArticlePage ? 'active' : ''}">${i}</button>`;
        }
    } else {
        // 页数多,智能省略显示
        if (currentArticlePage <= 3) {
            // 当前页在前面
            for (let i = 1; i <= 4; i++) {
                html += `<button onclick="goArticlePage(${i})" class="${i === currentArticlePage ? 'active' : ''}">${i}</button>`;
            }
            html += `<span class="ellipsis">...</span>`;
            html += `<button onclick="goArticlePage(${totalArticlePages})">${totalArticlePages}</button>`;
        } else if (currentArticlePage >= totalArticlePages - 2) {
            // 当前页在后面
            html += `<button onclick="goArticlePage(1)">1</button>`;
            html += `<span class="ellipsis">...</span>`;
            for (let i = totalArticlePages - 3; i <= totalArticlePages; i++) {
                html += `<button onclick="goArticlePage(${i})" class="${i === currentArticlePage ? 'active' : ''}">${i}</button>`;
            }
        } else {
            // 当前页在中间
            html += `<button onclick="goArticlePage(1)">1</button>`;
            html += `<span class="ellipsis">...</span>`;
            for (let i = currentArticlePage - 1; i <= currentArticlePage + 1; i++) {
                html += `<button onclick="goArticlePage(${i})" class="${i === currentArticlePage ? 'active' : ''}">${i}</button>`;
            }
            html += `<span class="ellipsis">...</span>`;
            html += `<button onclick="goArticlePage(${totalArticlePages})">${totalArticlePages}</button>`;
        }
    }
    
    pageNumbersContainer.innerHTML = html;
}

// 跳转到指定页
function goArticlePage(pageNum) {
    if (pageNum < 1 || pageNum > totalArticlePages) return;
    
    // 翻页时停止朗读
    if (reader) {
        reader.stop();
        updateReadButton();
    }
    
    currentArticlePage = pageNum;
    renderArticlePage(currentArticlePage);
}

// 通过输入框跳转
function jumpToArticlePage() {
    const pageInput = document.getElementById('articlePageInput');
    if (!pageInput) return;
    
    const pageNum = parseInt(pageInput.value);
    if (isNaN(pageNum)) return;
    
    goArticlePage(pageNum);
    
    // 清空输入框
    pageInput.value = '';
}

// 监听回车键跳转
document.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
        const pageInput = document.getElementById('articlePageInput');
        if (pageInput && document.activeElement === pageInput) {
            jumpToArticlePage();
        }
    }
});

// 获取文章总段落数
function getTotalParagraphs(article) {
    let count = 0;
    
    if (article.english) {
        count += article.english.split(/\n+/).filter(p => p.trim()).length;
    }
    
    if (article.meaning) {
        count += article.meaning.split(/\n+/).filter(p => p.trim()).length;
    }
    
    if (!article.english && !article.meaning && article.content) {
        count += article.content.split(/\n+/).filter(p => p.trim()).length;
    }
    
    return count;
}

function makeWordsClickable(text, startIndex = 0) {
    if (!text) return { html: '', nextIndex: startIndex };
    // 将文本按换行符分割成句子
    const sentences = text.split(/\n+/);
    let wordIndex = startIndex;
    const html = sentences.map(sentence => {
        if (!sentence.trim()) return '';
        const clickableText = sentence.replace(/([a-zA-Z]+(?:['-][a-zA-Z]+)*)/g, (match) => {
            const html = `<span class="clickable-word" data-word="${match}" data-index="${wordIndex}">${match}</span>`;
            wordIndex++;
            return html;
        });
        return `<p>${clickableText}</p>`;
    }).join('');
    return { html, nextIndex: wordIndex };
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

// 创建朗读实例
let reader;

// 初始化朗读功能
function initReader() {
    reader = new ReadSentence({
        rate: 0.8,
        onStateChange: () => {
            updateReadButton();
        },
        onEnd: () => {
            updateReadButton();
        },
        onError: () => {
            updateReadButton();
        }
    });
    
    // 初始化语音控制面板
    reader.initVoiceControls('voiceSelect', 'rateControl', 'rateText');
    
    // 语速和音色变化时重新朗读
    document.getElementById('rateControl').addEventListener('input', () => {
        if (reader.getState() === 'playing' || reader.getState() === 'paused') {
            restartReading();
        }
    });
    
    document.getElementById('voiceSelect').addEventListener('change', () => {
        if (reader.getState() === 'playing' || reader.getState() === 'paused') {
            restartReading();
        }
    });
}

// 重新开始朗读（使用新配置）
function restartReading() {
    const contentContainer = document.getElementById('killWordContainer');
    if (contentContainer && reader) {
        reader.stop();
        setTimeout(() => {
            reader.speakFromContainer(contentContainer);
        }, 50);
    }
}

// 更新朗读按钮文本
function updateReadButton() {
    const readBtn = document.querySelector('.read-btn');
    if (readBtn && reader) {
        readBtn.textContent = reader.getButtonText();
    }
}

// 切换朗读/暂停
function toggleRead() {
    const contentContainer = document.getElementById('killWordContainer');
    if (contentContainer && reader) {
        reader.toggle(contentContainer);
    }
}

// ⭐ 文章列表分页功能

// 显示文章列表分页控件
function showArticleListPagination() {
    const pagination = document.getElementById('articleListPagination');
    if (pagination) {
        pagination.style.display = 'flex';
        
        // 设置输入框的最大值
        const pageInput = document.getElementById('articleListPageInput');
        if (pageInput) {
            pageInput.max = totalArticleListPages;
        }
        
        // 更新分页UI
        updateArticleListPaginationUI();
    }
}

// 隐藏文章列表分页控件
function hideArticleListPagination() {
    const pagination = document.getElementById('articleListPagination');
    if (pagination) {
        pagination.style.display = 'none';
    }
}

// 更新文章列表分页UI
function updateArticleListPaginationUI() {
    const pageNumbersContainer = document.getElementById('articleListPageNumbers');
    if (!pageNumbersContainer) return;
    
    let html = '';
    
    // 根据总页数决定显示方式
    if (totalArticleListPages <= 7) {
        // 页数少,全部显示
        for (let i = 1; i <= totalArticleListPages; i++) {
            html += `<button onclick="goArticleListPage(${i})" class="${i === currentArticleListPage ? 'active' : ''}">${i}</button>`;
        }
    } else {
        // 页数多,智能省略显示
        if (currentArticleListPage <= 3) {
            // 当前页在前面
            for (let i = 1; i <= 4; i++) {
                html += `<button onclick="goArticleListPage(${i})" class="${i === currentArticleListPage ? 'active' : ''}">${i}</button>`;
            }
            html += `<span class="ellipsis">...</span>`;
            html += `<button onclick="goArticleListPage(${totalArticleListPages})">${totalArticleListPages}</button>`;
        } else if (currentArticleListPage >= totalArticleListPages - 2) {
            // 当前页在后面
            html += `<button onclick="goArticleListPage(1)">1</button>`;
            html += `<span class="ellipsis">...</span>`;
            for (let i = totalArticleListPages - 3; i <= totalArticleListPages; i++) {
                html += `<button onclick="goArticleListPage(${i})" class="${i === currentArticleListPage ? 'active' : ''}">${i}</button>`;
            }
        } else {
            // 当前页在中间
            html += `<button onclick="goArticleListPage(1)">1</button>`;
            html += `<span class="ellipsis">...</span>`;
            for (let i = currentArticleListPage - 1; i <= currentArticleListPage + 1; i++) {
                html += `<button onclick="goArticleListPage(${i})" class="${i === currentArticleListPage ? 'active' : ''}">${i}</button>`;
            }
            html += `<span class="ellipsis">...</span>`;
            html += `<button onclick="goArticleListPage(${totalArticleListPages})">${totalArticleListPages}</button>`;
        }
    }
    
    pageNumbersContainer.innerHTML = html;
}

// 跳转到指定页
function goArticleListPage(pageNum) {
    if (pageNum < 1 || pageNum > totalArticleListPages) return;
    
    currentArticleListPage = pageNum;
    renderArticles(articles);
}

// 通过输入框跳转
function jumpToArticleListPage() {
    const pageInput = document.getElementById('articleListPageInput');
    if (!pageInput) return;
    
    const pageNum = parseInt(pageInput.value);
    if (isNaN(pageNum)) return;
    
    goArticleListPage(pageNum);
    
    // 清空输入框
    pageInput.value = '';
}

// 监听回车键跳转
document.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
        const pageInput = document.getElementById('articleListPageInput');
        if (pageInput && document.activeElement === pageInput) {
            jumpToArticleListPage();
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    loadLocalExcel();
    loadWords(); // 同时加载单词表
    initReader();
});
