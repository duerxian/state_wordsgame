// 气球游戏逻辑
const API_BASE_URL = 'http://localhost:5000/api/words';
let words = [];
let currentWordIndex = 0;
let score = 0;
let penalty = 0;
let timerInterval = null;
let startTime = 0;
let isTimerRunning = false;

// 初始化游戏
async function initGame() {
    try {
        const response = await fetch(`${API_BASE_URL}`);
        words = await response.json();
        
        // 初始化游戏元素
        initCannon();
        initBalloons();
        initControls();
    } catch (error) {
        console.error('初始化游戏失败:', error);
    }
}

// 初始化大炮
function initCannon() {
    const cannon = document.getElementById('cannon');
    let isDragging = false;
    let startX = 0;
    
    cannon.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - startX;
            const container = document.getElementById('game-container');
            const containerWidth = container.offsetWidth;
            const cannonWidth = cannon.offsetWidth;
            
            // 计算大炮的新位置
            let newLeft = cannon.offsetLeft + deltaX;
            newLeft = Math.max(0, Math.min(containerWidth - cannonWidth, newLeft));
            
            cannon.style.left = newLeft + 'px';
            startX = e.clientX;
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// 初始化气球
function initBalloons() {
    // 生成气球逻辑
}

// 初始化控制按钮
function initControls() {
    const recordBtn = document.getElementById('record-btn');
    const timerBtn = document.getElementById('timer-btn');
    const scoreBtn = document.getElementById('score-btn');
    const penaltyBtn = document.getElementById('penalty-btn');
    
    recordBtn.addEventListener('click', showRecord);
    timerBtn.addEventListener('click', toggleTimer);
    scoreBtn.addEventListener('click', showScore);
    penaltyBtn.addEventListener('click', showPenalty);
}

// 显示记录
function showRecord() {
    alert(`当前记录：得分 ${score}，扣分 ${penalty}`);
}

// 切换计时器
function toggleTimer() {
    if (isTimerRunning) {
        stopTimer();
        document.getElementById('timer-btn').textContent = '开始计时';
    } else {
        startTimer();
        document.getElementById('timer-btn').textContent = '停止计时';
    }
}

// 开始计时
function startTimer() {
    startTime = Date.now();
    isTimerRunning = true;
    timerInterval = setInterval(updateTimer, 1000);
}

// 停止计时
function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
}

// 更新计时器
function updateTimer() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const seconds = Math.floor(elapsedTime / 1000);
    document.getElementById('timer-btn').textContent = `时间：${seconds}秒`;
}

// 显示得分
function showScore() {
    alert(`当前得分：${score}`);
}

// 显示扣分
function showPenalty() {
    alert(`当前扣分：${penalty}`);
}

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', initGame);