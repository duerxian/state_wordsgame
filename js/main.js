let words = [];
let currentTooltipWord = null;

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

// 从JSON文件加载单词数据
async function loadWords() {
    try {
        const response = await fetch('words.json');
        words = await response.json();
        console.log("✅ 成功加载单词数据，共 " + words.length + " 个单词");
        populatePosFilter();
        applyFilters();
        updateStats();
        initDragAndDrop();
    } catch (error) {
        console.error('加载单词失败:', error);
        // 使用内置的模拟数据
        words = [
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
        console.log("⚠️ 使用内置模拟数据，共 " + words.length + " 个单词");
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
            return String(word.unit) === unitFilter;
        });
    }
    
    if (posFilter) {
        filteredWords = filteredWords.filter(word => {
            if (!word.pos) return false;
            const posList = word.pos.split(/[、\/，,]+/).map(p => p.trim());
            return posList.includes(posFilter);
        });
    }
    
    if (sortFilter === 'az') {
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortFilter === 'random') {
        filteredWords.sort(() => Math.random() - 0.5);
    } else {
        filteredWords.sort((a, b) => a.id - b.id);
    }
    
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
        card.addEventListener('touchstart', handleTouchStart, { passive: false });
        card.addEventListener('touchmove', handleTouchMove, { passive: false });
        card.addEventListener('touchend', handleTouchEnd, { passive: false });
    });
    
    const wordSections = document.querySelectorAll('.word-section');
    wordSections.forEach(section => {
        section.addEventListener('dragover', handleDragOver);
        section.addEventListener('drop', handleDrop);
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.word-card') && !e.target.closest('.word-tooltip')) {
            hideWordTooltip();
        }
    });
}

let draggedWord = null;
let dragMouseX = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchMoveX = 0;
let isTouchDragging = false;
let preventClick = false;

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
    saveToLocalStorage();
}

function handleTouchStart(e) {
    if (e.target.closest('.check-box')) {
        return; // 如果点击的是复选框，不处理拖动
    }
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchMoveX = touch.clientX;
    isTouchDragging = false;
    draggedWord = {
        id: parseInt(this.dataset.id),
        element: this
    };
    this.style.opacity = '0.7';
    this.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out';
}

function handleTouchMove(e) {
    if (!draggedWord) return;
    e.preventDefault();
    const touch = e.touches[0];
    touchMoveX = touch.clientX;
    
    if (!isTouchDragging) {
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        if (deltaX > 15 || deltaY > 15) {
            isTouchDragging = true;
        }
    }
    
    if (isTouchDragging && draggedWord && draggedWord.element) {
        const translateX = touch.clientX - touchStartX;
        const translateY = touch.clientY - touchStartY;
        draggedWord.element.style.transform = `translate(${translateX}px, ${translateY}px)`;
        draggedWord.element.style.zIndex = '1000';
        draggedWord.element.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    }
}

function handleTouchEnd(e) {
    if (!draggedWord) return;
    e.preventDefault();
    
    if (isTouchDragging) {
        preventClick = true;
        setTimeout(() => {
            preventClick = false;
        }, 300);
    }
    
    if (draggedWord && draggedWord.element) {
        draggedWord.element.style.opacity = '1';
        draggedWord.element.style.transform = '';
        draggedWord.element.style.zIndex = '';
        draggedWord.element.style.boxShadow = '';
    }
    
    if (isTouchDragging && draggedWord) {
        const wordIndex = words.findIndex(w => w.id === draggedWord.id);
        if (wordIndex !== -1) {
            const screenWidth = window.innerWidth;
            const isRightSide = touchMoveX > screenWidth / 2;
            
            words[wordIndex].kill = isRightSide;
            
            applyFilters();
            initDragAndDrop();
            saveToLocalStorage();
        }
    }
    
    draggedWord = null;
    isTouchDragging = false;
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('wordsgame_words', JSON.stringify(words));
        console.log("💾 数据已保存到本地存储");
    } catch (e) {
        console.error("保存失败:", e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('wordsgame_words');
        if (saved) {
            words = JSON.parse(saved);
            console.log("📂 从本地存储加载了数据");
            return true;
        }
    } catch (e) {
        console.error("加载失败:", e);
    }
    return false;
}

function resetToJson() {
    if (confirm('确定要重置数据吗？这将清除所有本地修改，重新从8上-下单词表.xlsx加载数据。')) {
        localStorage.removeItem('wordsgame_words');
        loadLocalExcel().then(() => {
            // 如果Excel加载失败，使用默认数据
            if (words.length === 0) {
                loadWords();
            }
            alert('数据已重置！');
        });
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
                const meaning = word.meaning || word['中文释义'] || word['释义'] || '';
                displayText = meaning ? meaning : word.word;
            }
            const wordWrapClass = languageFilter === 'meaning' ? ' word-wrap' : '';
            return `
            <div class="word-card ${word.check ? 'checked-word' : ''}" data-id="${word.id}">
                <span class="word-text${wordWrapClass}">${displayText}</span>
                <input type="checkbox" class="check-box" onchange="toggleCheck(${word.id})" ${word.check ? 'checked' : ''}>
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
                const meaning = word.meaning || word['中文释义'] || word['释义'] || '';
                displayText = meaning ? meaning : word.word;
            }
            const wordWrapClass = languageFilter === 'meaning' ? ' word-wrap' : '';
            return `
            <div class="word-card kill-word ${word.check ? 'checked-word' : ''}" data-id="${word.id}">
                <span class="word-text${wordWrapClass}">${displayText}</span>
                <input type="checkbox" class="check-box" onchange="toggleCheck(${word.id})" ${word.check ? 'checked' : ''}>
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

function searchWords() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!query) {
        applyFilters();
        return;
    }
    
    const results = words.filter(word => {
        return word.word.toLowerCase().includes(query) ||
               (word.meaning && word.meaning.toLowerCase().includes(query)) ||
               (word.example && word.example.toLowerCase().includes(query)) ||
               (word.related && word.related.toLowerCase().includes(query));
    });
    
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

function handleWordClick(e) {
    e.stopPropagation();
    if (preventClick) {
        preventClick = false;
        return;
    }
    if (e.target.closest('.check-box')) {
        return;
    }
    const card = this;
    const wordId = parseInt(card.dataset.id);
    const word = words.find(w => w.id === wordId);
    if (!word) return;
    
    speakWord(word.word);
    
    card.classList.add('speaking');
    setTimeout(() => {
        card.classList.remove('speaking');
    }, 1000);
    
    const rect = card.getBoundingClientRect();
    showWordTooltip(word, rect.left, rect.bottom + 8);
    currentTooltipWord = word;
}

function toggleCheck(id) {
    const wordIndex = words.findIndex(w => w.id === id);
    if (wordIndex === -1) return;
    
    words[wordIndex].check = !words[wordIndex].check;
    
    applyFilters();
    saveToLocalStorage();
}

function showWordTooltip(word, x, y) {
    const tooltip = document.getElementById('wordTooltip');
    document.getElementById('tooltip-meaning').textContent = word.meaning || '无';
    document.getElementById('tooltip-pos').textContent = word.pos || '无';
    document.getElementById('tooltip-phonetic').textContent = word.phonetic || '无';
    document.getElementById('tooltip-example').textContent = word.example || '无';
    document.getElementById('tooltip-related').textContent = word.related || '无';
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.style.display = 'block';
}

function hideWordTooltip() {
    const tooltip = document.getElementById('wordTooltip');
    tooltip.style.display = 'none';
    currentTooltipWord = null;
}

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(words);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "单词表");
    XLSX.writeFile(wb, "wordsgame.xlsx");
    alert("导出成功！");
}

function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📥 开始导入Excel文件:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            console.log('📊 Excel解析结果:', jsonData);
            console.log('📊 第一条数据:', jsonData[0]);
            
            if (jsonData.length === 0) {
                alert('Excel文件中没有数据！');
                return;
            }
            
            // 获取所有可用的列名
            if (jsonData[0]) {
                console.log('📋 可用列名:', Object.keys(jsonData[0]));
            }
            
            if (confirm(`成功导入 ${jsonData.length} 个单词，是否替换当前数据？`)) {
                words = jsonData.map((word, index) => {
                    // 智能查找列名 - 不区分大小写，包含关键词即可
                    const getValue = (keywords) => {
                        for (const key in word) {
                            const keyLower = key.toLowerCase();
                            for (const keyword of keywords) {
                                if (keyLower.includes(keyword.toLowerCase())) {
                                    return word[key];
                                }
                            }
                        }
                        return '';
                    };
                    
                    // 尝试获取单词
                    let wordValue = getValue(['word', '单词', '英文', 'english']);
                    // 如果没找到，尝试查找包含"英文"或"word"的列
                    if (!wordValue) {
                        for (const key in word) {
                            if (key.includes('英文') || key.toLowerCase().includes('word')) {
                                wordValue = word[key];
                                break;
                            }
                        }
                    }
                    
                    // 尝试获取释义
                    let meaningValue = getValue(['meaning', '释义', '中文', '中文释义']);
                    // 如果没找到，尝试查找包含"中文"或"meaning"或"释义"的列
                    if (!meaningValue) {
                        for (const key in word) {
                            if (key.includes('中文') || key.toLowerCase().includes('meaning') || key.includes('释义')) {
                                meaningValue = word[key];
                                break;
                            }
                        }
                    }
                    
                    // 尝试获取其他字段
                    const gradeValue = getValue(['grade', '年级']);
                    const unitValue = getValue(['unit', '单元']);
                    const posValue = getValue(['pos', '词性']);
                    const phoneticValue = getValue(['phonetic', '音标']);
                    const exampleValue = getValue(['example', '例句']);
                    const relatedValue = getValue(['related', '联想词']);
                    
                    // 获取kill状态
                    let killValue = false;
                    for (const key in word) {
                        if (key.toLowerCase().includes('kill') || key.includes('已斩')) {
                            const val = word[key];
                            killValue = val === true || val === 'true' || val === 1 || val === '已斩' || val === '已斩杀';
                            break;
                        }
                    }
                    
                    console.log(`🔍 处理第${index+1}条: word="${wordValue}", meaning="${meaningValue}"`);
                    
                    return {
                        id: index + 1,
                        word: wordValue || '',
                        kill: killValue,
                        check: false,
                        grade: gradeValue || '',
                        unit: unitValue || '',
                        pos: posValue || '',
                        meaning: meaningValue || '',
                        phonetic: phoneticValue || '',
                        example: exampleValue || '',
                        related: relatedValue || ''
                    };
                }).filter(w => w.word);
                
                console.log('✅ 处理后的数据:', words);
                console.log('✅ 单词数量:', words.length);
                
                if (words.length === 0) {
                    alert('导入失败：没有找到有效的单词数据！请检查Excel文件的列名是否正确。');
                    return;
                }
                
                populatePosFilter();
                applyFilters();
                updateStats();
                saveToLocalStorage();
                alert(`导入成功！共导入 ${words.length} 个单词。`);
            }
        } catch (error) {
            console.error('❌ 导入失败:', error);
            alert('导入失败：' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// 加载本地Excel文件
async function loadLocalExcel() {
    try {
        console.log('📂 开始加载本地Excel文件: 8上-下单词表.xlsx');
        
        // 使用fetch获取本地Excel文件
        const response = await fetch('8上-下单词表.xlsx');
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
        
        // 转换为单词格式
        words = jsonData.map((word, index) => {
            // 智能查找列名
            const getValue = (keywords) => {
                for (const key in word) {
                    const keyLower = key.toLowerCase();
                    for (const keyword of keywords) {
                        if (keyLower.includes(keyword.toLowerCase())) {
                            return word[key];
                        }
                    }
                }
                return '';
            };
            
            // 尝试获取单词
            let wordValue = getValue(['word', '单词', '英文', 'english']);
            if (!wordValue) {
                for (const key in word) {
                    if (key.includes('英文') || key.toLowerCase().includes('word')) {
                        wordValue = word[key];
                        break;
                    }
                }
            }
            
            // 尝试获取释义
            let meaningValue = getValue(['meaning', '释义', '中文', '中文释义']);
            if (!meaningValue) {
                for (const key in word) {
                    if (key.includes('中文') || key.toLowerCase().includes('meaning') || key.includes('释义')) {
                        meaningValue = word[key];
                        break;
                    }
                }
            }
            
            // 尝试获取其他字段
            const gradeValue = getValue(['grade', '年级']);
            const unitValue = getValue(['unit', '单元']);
            const posValue = getValue(['pos', '词性']);
            const phoneticValue = getValue(['phonetic', '音标']);
            const exampleValue = getValue(['example', '例句']);
            const relatedValue = getValue(['related', '联想词']);
            
            // 获取kill状态
            let killValue = false;
            for (const key in word) {
                if (key.toLowerCase().includes('kill') || key.includes('已斩')) {
                    const val = word[key];
                    killValue = val === true || val === 'true' || val === 1 || val === '已斩' || val === '已斩杀';
                    break;
                }
            }
            
            return {
                id: index + 1,
                word: wordValue || '',
                kill: killValue,
                check: false,
                grade: gradeValue || '',
                unit: unitValue || '',
                pos: posValue || '',
                meaning: meaningValue || '',
                phonetic: phoneticValue || '',
                example: exampleValue || '',
                related: relatedValue || ''
            };
        }).filter(w => w.word);
        
        console.log('✅ 处理后的数据:', words);
        console.log('✅ 单词数量:', words.length);
        
        if (words.length === 0) {
            console.log('⚠️ 没有找到有效的单词数据，使用默认数据');
            return;
        }
        
        // 更新页面
        populatePosFilter();
        applyFilters();
        updateStats();
        initDragAndDrop();
        saveToLocalStorage(); // 保存Excel数据到本地存储
        console.log('✅ 本地Excel文件加载成功！');
        
    } catch (error) {
        console.error('❌ 加载本地Excel文件失败:', error);
        // 如果加载失败，使用默认数据
        console.log('⚠️ 加载本地Excel文件失败，使用默认数据');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                console.log('✅ 语音引擎已就绪');
            };
        }
    }
    
    console.log('📂 主页已加载');
    
    // 优先加载Excel，如果失败再回退到words.json
    console.log('🚀 优先加载Excel文件');
    loadLocalExcel().then(() => {
        if (words.length === 0) {
            console.log('📄 Excel加载失败，回退到words.json');
            loadWords();
        }
    }).catch(() => {
        console.log('📄 Excel加载异常，回退到words.json');
        loadWords();
    });
});

if (typeof words === 'undefined' || words.length === 0) {
    loadWords();
}
