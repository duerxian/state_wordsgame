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
        filteredWords = filteredWords.filter(word => word.unit === unitFilter);
    }
    
    if (posFilter) {
        filteredWords = filteredWords.filter(word => {
            if (!word.pos) return false;
            // 处理多种分隔符：顿号、斜杠、逗号
            const posList = word.pos.split(/[、\/，,]+/).map(p => p.trim());
            return posList.includes(posFilter);
        });
    }
    
    if (sortFilter === 'az') {
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
    } else {
        filteredWords.sort((a, b) => a.id - b.id);
    }
    
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
                displayText = meaning ? `${word.word}：${meaning}` : word.word;
            }
            const wordWrapClass = languageFilter === 'meaning' ? ' word-wrap' : '';
            return `
                <div class="word-card" data-id="${word.id}">
                    <span class="word-text${wordWrapClass}">${displayText}</span>
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
                displayText = meaning ? `${word.word}：${meaning}` : word.word;
            }
            const wordWrapClass = languageFilter === 'meaning' ? ' word-wrap' : '';
            return `
                <div class="word-card kill-word" data-id="${word.id}">
                    <span class="word-text${wordWrapClass}">${displayText}</span>
                </div>
            `;
        }).join('');
    }
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
            filteredResults = filteredResults.filter(word => word.unit === unitFilter);
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
        } else {
            filteredResults.sort((a, b) => a.id - b.id);
        }
        
        renderWords(filteredResults, languageFilter);
        updateStats(filteredResults);
        initDragAndDrop();
    } catch (error) {
        console.error('搜索失败:', error);
    }
}

function showAddModal() {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = '添加单词';
    document.getElementById('wordInput').value = '';
    document.getElementById('modal').style.display = 'block';
    document.getElementById('wordInput').focus();
}

function editWord(id) {
    const word = words.find(w => w.id === id);
    if (!word) return;
    
    currentEditId = id;
    document.getElementById('modalTitle').textContent = '编辑单词';
    document.getElementById('wordInput').value = word.word;
    document.getElementById('modal').style.display = 'block';
    document.getElementById('wordInput').focus();
}

async function saveWord() {
    const wordText = document.getElementById('wordInput').value.trim();
    
    if (!wordText) {
        alert('请输入单词内容');
        return;
    }
    
    try {
        if (currentEditId) {
            const response = await fetch(`${API_BASE_URL}/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: wordText })
            });
            
            if (response.ok) {
                const updatedWord = await response.json();
                const index = words.findIndex(w => w.id === currentEditId);
                if (index !== -1) {
                    words[index] = updatedWord;
                }
            }
        } else {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: wordText })
            });
            
            if (response.ok) {
                const newWord = await response.json();
                words.push(newWord);
            }
        }
        
        closeModal();
        renderWords(words);
        updateStats();
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败，请重试');
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
}

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}

document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveWord();
    }
});

function handleWordClick(e) {
    e.stopPropagation();
    const card = this;
    const wordId = parseInt(card.dataset.id);
    const word = words.find(w => w.id === wordId);
    if (!word) return;
    
    // 获取单词框的位置
    const rect = card.getBoundingClientRect();
    // 显示浮动框，左对齐单词框，间距8像素
    showWordTooltip(word, rect.left, rect.bottom + 8);
    currentTooltipWord = word;
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

loadWords();
