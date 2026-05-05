let words = [];
let matchedPairs = new Set();
let lastClickedWord = null;
let currentLanguage = 'english';
let timerInterval = null;
let startTime = 0;
let isTimerRunning = false;

function speakWord(word) {
    if (!word) return;
    
    console.log("🚀 播放单词：", word);
    
    window.speechSynthesis.cancel();
    
    const msg = new SpeechSynthesisUtterance();
    msg.text = word;
    msg.lang = 'en-US';
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

function updateStats(filteredWords) {
    const totalWords = filteredWords.length;
    const normalWords = filteredWords.length;
    const killWords = 0;
    
    const totalWordsElement = document.getElementById('totalWords');
    if (totalWordsElement) {
        totalWordsElement.textContent = totalWords;
    }
    
    const normalWordsElement = document.getElementById('normalWords');
    if (normalWordsElement) {
        normalWordsElement.textContent = normalWords;
    }
    
    const killWordsElement = document.getElementById('killWords');
    if (killWordsElement) {
        killWordsElement.textContent = killWords;
    }
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours.toString().padStart(2, '0')} : ${(minutes % 60).toString().padStart(2, '0')} : ${(seconds % 60).toString().padStart(2, '0')}`;
}

function updateTimer() {
    if (isTimerRunning) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const timeElement = document.querySelector('.stats span:nth-child(3) strong');
        if (timeElement) {
            timeElement.textContent = formatTime(elapsedTime);
        }
    }
}

function startTimer() {
    if (!isTimerRunning) {
        startTime = Date.now();
        isTimerRunning = true;
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    }
}

function stopTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
    }
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
        
        console.log('✅ 本地Excel文件加载成功！');
        
    } catch (error) {
        console.error('❌ 加载本地Excel文件失败:', error);
        // 如果加载失败，使用默认数据
        console.log('⚠️ 加载本地Excel文件失败，使用默认数据');
    }
}

async function loadWords() {
    try {
        const response = await fetch('words.json');
        words = await response.json();
        console.log("✅ 成功加载单词数据，共 " + words.length + " 个单词");
    } catch (error) {
        console.error('加载单词失败:', error);
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
            { id: 10, word: 'jacket', kill: false, grade: '8上', unit: '5', pos: 'n.', meaning: '夹克' }
        ];
        console.log("⚠️ 使用内置模拟数据，共 " + words.length + " 个单词");
    }
}

async function initGame() {
    matchedPairs.clear();
    lastClickedWord = null;
    
    await loadLocalExcel();
    
    // 如果Excel加载失败，使用默认数据
    if (words.length === 0) {
        await loadWords();
    }
    
    const killFilter = document.getElementById('posFilter').value;
    
    let normalWords = [...words];
    
    if (killFilter === 'unkilled') {
        normalWords = normalWords.filter(word => !word.kill);
    } else if (killFilter === 'killed') {
        normalWords = normalWords.filter(word => word.kill);
    }
    
    const seenWords = new Set();
    normalWords = normalWords.filter(word => {
        const wordKey = word.word.toLowerCase();
        if (seenWords.has(wordKey)) {
            return false;
        }
        seenWords.add(wordKey);
        return true;
    });
    
    const shuffledMeanings = [...normalWords].sort(() => Math.random() - 0.5);
    
    renderWords(normalWords, shuffledMeanings);
    initClickEvents();
    updateStats(normalWords);
    
    const startButton = document.querySelector('.stats button');
    if (startButton) {
        startButton.addEventListener('click', () => {
            if (isTimerRunning) {
                stopTimer();
                startButton.textContent = '开始计时';
                startButton.style.backgroundColor = '';
            } else {
                startTimer();
                startButton.textContent = '结束计时';
                startButton.style.backgroundColor = '#ffcc44';
            }
        });
    }
}

function renderWords(englishWords, meaningWords) {
    const englishContainer = document.getElementById('normalWordContainer');
    const meaningContainer = document.getElementById('killWordContainer');
    
    englishContainer.innerHTML = '';
    meaningContainer.innerHTML = '';
    
    if (currentLanguage === 'english') {
        englishWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.type = 'english';
            wordCard.textContent = word.word;
            englishContainer.appendChild(wordCard);
        });
        
        meaningWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.type = 'meaning';
            wordCard.textContent = word.meaning;
            meaningContainer.appendChild(wordCard);
        });
    } else {
        englishWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.type = 'meaning';
            wordCard.textContent = word.meaning;
            englishContainer.appendChild(wordCard);
        });
        
        meaningWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.type = 'english';
            wordCard.textContent = word.word;
            meaningContainer.appendChild(wordCard);
        });
    }
}

function initClickEvents() {
    const wordCards = document.querySelectorAll('.word-card');
    
    wordCards.forEach(card => {
        card.addEventListener('click', handleWordClick);
    });
}

function handleWordClick(event) {
    const clickedCard = event.target;
    const clickedId = parseInt(clickedCard.dataset.id);
    const clickedType = clickedCard.dataset.type;
    
    if (matchedPairs.has(clickedId)) {
        return;
    }
    
    const wordObj = words.find(w => w.id === clickedId);
    if (wordObj && wordObj.word) {
        speakWord(wordObj.word);
        
        clickedCard.classList.add('speaking');
        setTimeout(() => {
            clickedCard.classList.remove('speaking');
        }, 1000);
    }
    
    if (!lastClickedWord) {
        lastClickedWord = { id: clickedId, type: clickedType, element: clickedCard };
        clickedCard.style.backgroundColor = '#e3f2fd';
        return;
    }
    
    if (lastClickedWord.type === clickedType) {
        lastClickedWord.element.style.backgroundColor = '';
        lastClickedWord = { id: clickedId, type: clickedType, element: clickedCard };
        clickedCard.style.backgroundColor = '#e3f2fd';
        return;
    }
    
    if (lastClickedWord.id === clickedId) {
        lastClickedWord.element.style.backgroundColor = '#c8e6c9';
        clickedCard.style.backgroundColor = '#c8e6c9';
        matchedPairs.add(clickedId);
        
        const gradeFilter = document.getElementById('gradeFilter').value;
        const unitFilter = document.getElementById('unitFilter').value;
        const killFilter = document.getElementById('posFilter').value;
        
        let filteredWords = [...words];
        
        if (killFilter === 'unkilled') {
            filteredWords = filteredWords.filter(word => !word.kill);
        } else if (killFilter === 'killed') {
            filteredWords = filteredWords.filter(word => word.kill);
        }
        
        if (gradeFilter) {
            filteredWords = filteredWords.filter(word => word.grade === gradeFilter);
        }
        
        if (unitFilter) {
            filteredWords = filteredWords.filter(word => String(word.unit) === unitFilter);
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
        
        if (matchedPairs.size === filteredWords.length) {
            setTimeout(() => {
                if (gradeFilter && unitFilter) {
                    const currentUnit = parseInt(unitFilter);
                    const nextUnit = currentUnit + 1;
                    
                    const nextUnitExists = words.some(word => word.grade === gradeFilter && word.unit === nextUnit.toString());
                    
                    if (nextUnitExists) {
                        stopTimer();
                        document.getElementById('unitFilter').value = nextUnit.toString();
                        applyFilters();
                    } else {
                        stopTimer();
                        alert('恭喜，本单元结束！');
                    }
                } else {
                    stopTimer();
                    alert('恭喜！全对了！');
                }
            }, 500);
        }
    } else {
        lastClickedWord.element.style.backgroundColor = '#ffcdd2';
        clickedCard.style.backgroundColor = '#ffcdd2';
        
        setTimeout(() => {
            lastClickedWord.element.style.backgroundColor = '';
            clickedCard.style.backgroundColor = '';
        }, 1000);
    }
    
    lastClickedWord = null;
}

function applyFilters() {
    console.log('=== applyFilters 被调用 ===');
    
    matchedPairs.clear();
    lastClickedWord = null;
    
    const gradeFilter = document.getElementById('gradeFilter').value;
    const unitFilter = document.getElementById('unitFilter').value;
    const killFilter = document.getElementById('posFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    const languageFilter = document.getElementById('languageFilter').value;
    
    currentLanguage = languageFilter;
    
    let filteredWords = [...words];
    
    if (killFilter === 'unkilled') {
        filteredWords = filteredWords.filter(word => !word.kill);
    } else if (killFilter === 'killed') {
        filteredWords = filteredWords.filter(word => word.kill);
    }
    
    if (gradeFilter) {
        filteredWords = filteredWords.filter(word => word.grade === gradeFilter);
    }
    
    if (unitFilter) {
        filteredWords = filteredWords.filter(word => String(word.unit) === unitFilter);
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
    
    updateStats(filteredWords);
    
    console.log('去重后 filteredWords.length:', filteredWords.length);
    console.log('=== applyFilters 结束 ===\n');
    
    if (filteredWords.length > 0) {
        renderWords(filteredWords, [...filteredWords].sort(() => Math.random() - 0.5));
        initClickEvents();
    } else {
        document.getElementById('normalWordContainer').innerHTML = '<div class="loading">没有符合条件的单词</div>';
        document.getElementById('killWordContainer').innerHTML = '';
    }
}

window.addEventListener('DOMContentLoaded', function() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                console.log('✅ 语音引擎已就绪');
            };
        }
    }
    
    console.log('🎮 单词连连看游戏已加载');
    initGame();
});
