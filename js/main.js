const API_BASE_URL = 'http://localhost:5000/api/words';
let words = [];
let currentEditId = null;
let currentTooltipWord = null;

// 模拟数据，用于测试语言筛选功能
const mockWords = [
    { id: 1, word: 'apple', kill: false, grade: '8上', unit: '1', pos: 'n.', meaning: '苹果' },
    { id: 2, word: 'banana', kill: false, grade: '8上', unit: '1', pos: 'n.', meaning: '香蕉' },
    { id: 3, word: 'cat', kill: true, grade: '8上', unit: '2', pos: 'n.', meaning: '猫' },
    { id: 4, word: 'dog', kill: true, grade: '8上', unit: '2', pos: 'n.', meaning: '狗' },
    { id: 5, word: 'elephant', kill: false, grade: '8上', unit: '3', pos: 'n.', meaning: '大象' },
    { id: 6, word: 'fish', kill: false, grade: '8上', unit: '3', pos: 'n.', meaning: '鱼' },
    { id: 7, word: 'grape', kill: true, grade: '8上', unit: '4', pos: 'n.', meaning: '葡萄' },
    { id: 8, word: 'house', kill: true, grade: '8上', unit: '4', pos: 'n.', meaning: '房子' },
    { id: 9, word: 'ice cream', kill: false, grade: '8上', unit: '5', pos: 'n.', meaning: '冰淇淋' },
    { id: 10, word: 'jacket', kill: false, grade: '8上', unit: '5', pos: 'n.', meaning: '夹克衫' }
];

// 使用Web Speech API播放单词发音 - 优化版本
function speakWord(word) {
    if (!word) return;
    
    console.log("🚀 播放单词：", word);
    
    // 先清空之前的语音
    window.speechSynthesis.cancel();
    
    const msg = new SpeechSynthesisUtterance();
    msg.text = word;
    msg.lang = 'en-US'; // 设置为美式英语
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

async function loadWords() {
    try {
        const response = await fetch(API_BASE_URL);
        words = await response.json();
        populatePosFilter();
        applyFilters();
        updateStats();
        initDragAndDrop();
    } catch (error) {
        console.error('加载单词失败:', error);
        // 使用模拟数据进行测试
        words = mockWords;
        populatePosFilter();
        applyFilters();
        updateStats();
        initDragAndDrop();
    }
}

function populatePosFilter() {
    const posSet = new Set();
    words.forEach(word => {
        if (word.pos) {
            // 处理多种分隔符：顿号、斜杠、逗号
            const posList = word.pos.split(/[、\/，,]+/).map(p => p.trim());
            posList.forEach(pos => {
                if (pos) posSet.add(pos);
            });
        }
    });
    
    const posFilter = document.getElementById('posFilter');
    posFilter.innerHTML = '<option value="">无</option>';
    
    Array.from(posSet).sort().forEach(pos => {
        const option = document.createElement('option');
        option.value = pos;
        option.textContent = pos;
        posFilter.appendChild(option);
    });
}

function applyFilters() {
    const gradeFilter = document.getElementById('gradeFilter').value;
    const unitFilter = document.getElementById('unitFilter').value;
    const languageFilter = document.getElementById('languageFilter').value;
    const posFilter = document.getElementById('posFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    
    let filteredWords = [...words];
    
    if (gradeFilter) {
        filteredWords = filteredWords.filter(word => word.grade === gradeFilter);
    }
    
    if (unitFilter) {
        filteredWords = filteredWords.filter(word => {
            // 处理unit类型不匹配的问题，将两者都转换为字符串进行比较
            return String(word.unit) === unitFilter;
        });
    }
    
    if (posFilter) {
        filteredWords = filteredWords.filter(word => {
            if (!word.pos) return false;
            // 处理多种分隔符：顿号、斜杠、逗号
            const posList = word.pos.split(/[、\/，,]+/).map(p => p.trim());
            return posList.includes(posFilter);
        });
    }
    
    // 排序
    if (sortFilter === 'az') {
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortFilter === 'random') {
        // 随机排序
        filteredWords.sort(() => Math.random() - 0.5);
    } else {
        filteredWords.sort((a, b) => a.id - b.id);
    }
    
    // 去重逻辑
    const seenWords = new Set();
    filteredWords = filteredWords.filter(word => {
        const wordKey = word.word.toLowerCase();
        if (seenWords.has(wordKey)) {
            return false;
        }
        seenWords.add(wordKey);
        return true;
    });
    
    renderWords(filteredWords, languageFilter);
    updateStats(filteredWords);
    initDragAndDrop();
}

function initDragAndDrop() {
    const wordCards = document.querySelectorAll('.word-card');
    wordCards.forEach(card => {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('click', handleWordClick);
    });
    
    const wordSections = document.querySelectorAll('.word-section');
    wordSections.forEach(section => {
        section.addEventListener('dragover', handleDragOver);
        section.addEventListener('drop', handleDrop);
    });
    
    // 点击空白处隐藏浮动框
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.word-card') && !e.target.closest('.word-tooltip')) {
            hideWordTooltip();
        }
    });
}

let draggedWord = null;
let dragMouseX = 0;

function handleDragStart(e) {
    draggedWord = {
        id: parseInt(this.dataset.id),
        element: this
    };
    this.style.opacity = '0.5';
}

function handleDragEnd(e) {
    if (draggedWord && draggedWord.element) {
        draggedWord.element.style.opacity = '1';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    dragMouseX = e.clientX;
}

function handleDrop(e) {
    e.preventDefault();
    
    if (!draggedWord) return;
    
    const wordIndex = words.findIndex(w => w.id === draggedWord.id);
    if (wordIndex === -1) return;
    
    const screenWidth = window.innerWidth;
    const isRightSide = dragMouseX > screenWidth / 2;
    
    words[wordIndex].kill = isRightSide;
    
    applyFilters();
    draggedWord.element.style.opacity = '1';
    draggedWord = null;
    initDragAndDrop();
}

async function saveChanges() {
    if (!confirm('确定要保存所有更改吗？这将更新Excel文件。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/save-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: words })
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

function renderWords(wordList, languageFilter = 'english') {
    console.log('renderWords called with languageFilter:', languageFilter);
    console.log('First word meaning:', wordList.length > 0 ? wordList[0].meaning : 'No words');
    
    const normalContainer = document.getElementById('normalWordContainer');
    const killContainer = document.getElementById('killWordContainer');
    
    const normalWords = wordList.filter(word => !word.kill);
    const killWords = wordList.filter(word => word.kill);
    
    if (normalWords.length === 0) {
        normalContainer.innerHTML = '<div class="no-data">没有普通单词</div>';
    } else {
        normalContainer.innerHTML = normalWords.map(word => {
            let displayText = word.word;
            if (languageFilter === 'meaning') {
                // 尝试不同的释义字段名
                const meaning = word.meaning || word['中文释义'] || word['释义'] || '';
                displayText = meaning ? `${meaning}` : word.word;
            }
            const wordWrapClass = languageFilter === 'meaning' ? ' word-wrap' : '';
            return `
            <div class="word-card ${word.check ? 'checked-word' : ''}" data-id="${word.id}">
                <span class="word-text${wordWrapClass}">${displayText}</span>
                <input type="checkbox" class="check-box" onchange="toggleCheck(${word.id})" ${word.check ? 'checked' : ''}>
                <div class="edit-btn" onclick="editWord(${word.id})" title="编辑单词">✏️</div>
            </div>
        `;
        }).join('');
    }
    
    if (killWords.length === 0) {
        killContainer.innerHTML = '<div class="no-data">没有特殊单词</div>';
    } else {
        killContainer.innerHTML = killWords.map(word => {
            let displayText = word.word;
            if (languageFilter === 'meaning') {
                // 尝试不同的释义字段名
                const meaning = word.meaning || word['中文释义'] || word['释义'] || '';
                displayText = meaning ? `${meaning}` : word.word;
            }
            const wordWrapClass = languageFilter === 'meaning' ? ' word-wrap' : '';
            return `
            <div class="word-card kill-word ${word.check ? 'checked-word' : ''}" data-id="${word.id}">
                <span class="word-text${wordWrapClass}">${displayText}</span>
                <input type="checkbox" class="check-box" onchange="toggleCheck(${word.id})" ${word.check ? 'checked' : ''}>
                <div class="edit-btn" onclick="editWord(${word.id})" title="编辑单词">✏️</div>
            </div>
        `;
        }).join('');
    }
    updateKillWordStyle();
}

function updateStats(filteredWords = words) {
    document.getElementById('totalWords').textContent = filteredWords.length;
    document.getElementById('normalWords').textContent = filteredWords.filter(word => !word.kill).length;
    document.getElementById('killWords').textContent = filteredWords.filter(word => word.kill).length;
}

async function searchWords() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        applyFilters();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const results = await response.json();
        
        const gradeFilter = document.getElementById('gradeFilter').value;
        const unitFilter = document.getElementById('unitFilter').value;
        const languageFilter = document.getElementById('languageFilter').value;
        const posFilter = document.getElementById('posFilter').value;
        const sortFilter = document.getElementById('sortFilter').value;
        
        let filteredResults = [...results];
        
        if (gradeFilter) {
            filteredResults = filteredResults.filter(word => word.grade === gradeFilter);
        }
        
        if (unitFilter) {
            filteredResults = filteredResults.filter(word => {
                // 处理unit类型不匹配的问题，将两者都转换为字符串进行比较
                return String(word.unit) === unitFilter;
            });
        }
        
        if (posFilter) {
            filteredResults = filteredResults.filter(word => {
                if (!word.pos) return false;
                // 处理多种分隔符：顿号、斜杠、逗号
                const posList = word.pos.split(/[、\/，,]+/).map(p => p.trim());
                return posList.includes(posFilter);
            });
        }
        
        if (sortFilter === 'az') {
            filteredResults.sort((a, b) => a.word.localeCompare(b.word));
        } else if (sortFilter === 'random') {
            // 随机排序
            filteredResults.sort(() => Math.random() - 0.5);
        } else {
            filteredResults.sort((a, b) => a.id - b.id);
        }
        
        renderWords(filteredResults, languageFilter);
        updateStats(filteredResults);
        initDragAndDrop();
    } catch (error) {
        console.error('搜索失败:', error);
        // 本地搜索备选方案
        const lowerQuery = query.toLowerCase();
        const localResults = words.filter(word => {
            return word.word.toLowerCase().includes(lowerQuery) ||
                   (word.meaning && word.meaning.toLowerCase().includes(lowerQuery)) ||
                   (word.example && word.example.toLowerCase().includes(lowerQuery)) ||
                   (word.related && word.related.toLowerCase().includes(lowerQuery));
        });
        
        const gradeFilter = document.getElementById('gradeFilter').value;
        const unitFilter = document.getElementById('unitFilter').value;
        const languageFilter = document.getElementById('languageFilter').value;
        const posFilter = document.getElementById('posFilter').value;
        const sortFilter = document.getElementById('sortFilter').value;
        
        let filteredResults = [...localResults];
        
        if (gradeFilter) {
            filteredResults = filteredResults.filter(word => word.grade === gradeFilter);
        }
        
        if (unitFilter) {
            filteredResults = filteredResults.filter(word => {
                return String(word.unit) === unitFilter;
            });
        }
        
        if (posFilter) {
            filteredResults = filteredResults.filter(word => {
                if (!word.pos) return false;
                const posList = word.pos.split(/[、\/，,]+/).map(p => p.trim());
                return posList.includes(posFilter);
            });
        }
        
        if (sortFilter === 'az') {
            filteredResults.sort((a, b) => a.word.localeCompare(b.word));
        } else if (sortFilter === 'random') {
            filteredResults.sort(() => Math.random() - 0.5);
        } else {
            filteredResults.sort((a, b) => a.id - b.id);
        }
        
        renderWords(filteredResults, languageFilter);
        updateStats(filteredResults);
        initDragAndDrop();
    }
}

function showAddModal() {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = '添加单词';
    document.getElementById('wordInput').value = '';
    document.getElementById('gradeInput').value = '7上';
    document.getElementById('unitInput').value = '1';
    document.getElementById('meaningInput').value = '';
    document.getElementById('posInput').value = '';
    document.getElementById('phoneticInput').value = '';
    document.getElementById('exampleInput').value = '';
    document.getElementById('relatedInput').value = '';
    document.getElementById('modal').style.display = 'block';
    document.getElementById('wordInput').focus();
}

function editWord(id) {
    const word = words.find(w => w.id === id);
    if (!word) return;
    
    currentEditId = id;
    document.getElementById('modalTitle').textContent = '编辑单词';
    document.getElementById('wordInput').value = word.word;
    document.getElementById('gradeInput').value = word.grade || '7上';
    document.getElementById('unitInput').value = word.unit || '1';
    document.getElementById('meaningInput').value = word.meaning || '';
    document.getElementById('posInput').value = word.pos || '';
    document.getElementById('phoneticInput').value = word.phonetic || '';
    document.getElementById('exampleInput').value = word.example || '';
    document.getElementById('relatedInput').value = word.related || '';
    document.getElementById('modal').style.display = 'block';
    document.getElementById('wordInput').focus();
}

async function saveWord() {
    const wordText = document.getElementById('wordInput').value.trim();
    const grade = document.getElementById('gradeInput').value;
    const unit = document.getElementById('unitInput').value;
    const meaning = document.getElementById('meaningInput').value.trim();
    const pos = document.getElementById('posInput').value.trim();
    const phonetic = document.getElementById('phoneticInput').value.trim();
    const example = document.getElementById('exampleInput').value.trim();
    const related = document.getElementById('relatedInput').value.trim();
    
    if (!wordText) {
        alert('请输入单词内容');
        return;
    }
    
    try {
        if (currentEditId) {
            const response = await fetch(`${API_BASE_URL}/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    word: wordText,
                    grade: grade,
                    unit: unit,
                    meaning: meaning,
                    pos: pos,
                    phonetic: phonetic,
                    example: example,
                    related: related
                })
            });
            
            if (response.ok) {
                const updatedWord = await response.json();
                const index = words.findIndex(w => w.id === currentEditId);
                if (index !== -1) {
                    words[index] = updatedWord;
                }
                if (confirm('修改成功！')) {
                    closeModal();
                    applyFilters(); // 应用当前筛选条件
                    updateStats();
                }
            }
        } else {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    word: wordText,
                    grade: grade,
                    unit: unit,
                    meaning: meaning,
                    pos: pos,
                    phonetic: phonetic,
                    example: example,
                    related: related
                })
            });
            
            if (response.ok) {
                const newWord = await response.json();
                words.push(newWord);
                if (confirm('添加成功！')) {
                    closeModal();
                    applyFilters(); // 应用当前筛选条件
                    updateStats();
                }
            } else if (response.status === 400) {
                const error = await response.json();
                alert(error.error);
                return;
            }
        }
    } catch (error) {
        console.error('保存失败:', error);
    }
}

async function deleteWord(id) {
    if (!confirm('确定要删除这个单词吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            words = words.filter(w => w.id !== id);
            renderWords(words);
            updateStats();
        }
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，请重试');
    }
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    currentEditId = null;
}

// 阻止点击空白区域关闭对话框
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        e.stopPropagation();
    }
});

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    // 不允许点击空白区域关闭对话框
}

document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveWord();
    }
});

function handleWordClick(e) {
    e.stopPropagation();
    if (e.target.closest('.edit-btn') || e.target.closest('.check-box')) {
        return;
    }
    const card = this;
    const wordId = parseInt(card.dataset.id);
    const word = words.find(w => w.id === wordId);
    if (!word) return;
    
    // 播放发音并添加视觉反馈
    speakWord(word.word);
    
    // 添加发音时的视觉反馈
    card.classList.add('speaking');
    setTimeout(() => {
        card.classList.remove('speaking');
    }, 1000);
    
    // 获取单词框的位置
    const rect = card.getBoundingClientRect();
    // 显示浮动框，左对齐单词框，间距8像素
    showWordTooltip(word, rect.left, rect.bottom + 8);
    currentTooltipWord = word;
}

function toggleCheck(id) {
    const wordIndex = words.findIndex(w => w.id === id);
    if (wordIndex === -1) return;
    
    // 切换内存状态
    const newCheckValue = !words[wordIndex].check;
    words[wordIndex].check = newCheckValue;
    
    // 立即更新UI，给用户即时反馈
    applyFilters(); 
    
    // 异步保存到服务器
    fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check: newCheckValue ? 1 : 0 })
    })
    .then(response => {
        if (!response.ok) {
            console.error('保存check状态失败');
            // 可选：如果失败，回滚状态
            // words[wordIndex].check = !newCheckValue;
            // applyFilters();
        }
    })
    .catch(error => {
        console.error('保存check状态网络错误:', error);
    });
}

function showWordTooltip(word, x, y) {
    const tooltip = document.getElementById('wordTooltip');
    document.getElementById('tooltip-meaning').textContent = word.meaning || '无';
    document.getElementById('tooltip-pos').textContent = word.pos || '无';
    document.getElementById('tooltip-phonetic').textContent = word.phonetic || '无';
    document.getElementById('tooltip-example').textContent = word.example || '无';
    document.getElementById('tooltip-related').textContent = word.related || '无';
    
    // 设置浮动框位置紧贴单词框下方
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.style.display = 'block';
}

function hideWordTooltip() {
    const tooltip = document.getElementById('wordTooltip');
    tooltip.style.display = 'none';
    currentTooltipWord = null;
}

function updateKillWordStyle() {
    const bgColor = document.getElementById('killBgColor').value;
    const textColor = document.getElementById('killTextColor').value;
    
    // 动态更新已斩单词的样式
    const killCards = document.querySelectorAll('.word-card.kill-word');
    killCards.forEach(card => {
        card.style.backgroundColor = bgColor;
        card.style.color = textColor;
    });
}

// 页面加载完成后初始化语音引擎
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
    
    console.log('📄 主页已加载');
});

loadWords();
