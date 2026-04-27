// API配置页面脚本

// 翻译配置
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('配置页面加载完成');
    
    // 初始化API配置
    initApiConfig();
    
    // 从localStorage加载配置
    loadConfigFromStorage();
});

// 初始化API配置
function initApiConfig() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const configPanels = document.querySelectorAll('.config-panel');
    const saveBtn = document.getElementById('save-config');
    const testBtn = document.getElementById('test-api');
    
    // 切换标签页
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            // 更新按钮状态
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 更新面板显示
            configPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(`${tab}-config`).classList.add('active');
            
            // 更新配置提供者
            translationConfig.provider = tab;
        });
    });
    
    // 保存配置
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            saveApiConfig();
        });
    }
    
    // 测试API连接
    if (testBtn) {
        testBtn.addEventListener('click', async function() {
            await testApiConnection();
        });
    }
}

// 测试API连接
async function testApiConnection() {
    const config = getCurrentConfig();
    
    if (!config.valid) {
        alert(config.message);
        return;
    }
    
    const testBtn = document.getElementById('test-api');
    const originalText = testBtn.textContent;
    testBtn.disabled = true;
    testBtn.textContent = '测试中...';
    
    try {
        console.log('开始测试API连接...');
        const result = await translateText('eagle');
        
        console.log(`✓ API连接成功！翻译结果: "eagle" → "${result}"`);
        showConfigStatus(`✓ 测试成功！eagle → ${result}`, 'success');
        
        testBtn.textContent = '测试成功';
        setTimeout(() => {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
        }, 3000);
        
    } catch (error) {
        console.error('✗ API连接失败:', error);
        showConfigStatus(`✗ 测试失败: ${error.message}`, 'error');
        
        testBtn.textContent = '测试失败';
        setTimeout(() => {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
        }, 3000);
    }
}

// 保存API配置
function saveApiConfig() {
    const provider = translationConfig.provider;
    
    if (provider === 'baidu') {
        translationConfig.baidu.appid = document.getElementById('baidu-appid').value.trim();
        translationConfig.baidu.key = document.getElementById('baidu-key').value.trim();
        
        if (!translationConfig.baidu.appid || !translationConfig.baidu.key) {
            showConfigStatus('请填写完整的百度翻译配置', 'error');
            return;
        }
    } else if (provider === 'youdao') {
        translationConfig.youdao.appkey = document.getElementById('youdao-appkey').value.trim();
        translationConfig.youdao.key = document.getElementById('youdao-key').value.trim();
        
        if (!translationConfig.youdao.appkey || !translationConfig.youdao.key) {
            showConfigStatus('请填写完整的有道翻译配置', 'error');
            return;
        }
    }
    
    // 保存到localStorage
    localStorage.setItem('translationConfig', JSON.stringify(translationConfig));
    showConfigStatus('配置保存成功！', 'success');
}

// 显示配置状态
function showConfigStatus(message, type) {
    const statusEl = document.getElementById('config-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = type;
        
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = '';
        }, 3000);
    }
}

// 从localStorage加载配置
function loadConfigFromStorage() {
    const saved = localStorage.getItem('translationConfig');
    if (saved) {
        try {
            translationConfig = JSON.parse(saved);
            
            // 填充表单
            document.getElementById('baidu-appid').value = translationConfig.baidu.appid || '';
            document.getElementById('baidu-key').value = translationConfig.baidu.key || '';
            document.getElementById('youdao-appkey').value = translationConfig.youdao.appkey || '';
            document.getElementById('youdao-key').value = translationConfig.youdao.key || '';
            
            // 设置当前选中的provider对应的tab为激活状态
            const tabBtns = document.querySelectorAll('.tab-btn');
            const configPanels = document.querySelectorAll('.config-panel');
            
            tabBtns.forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-tab') === translationConfig.provider) {
                    btn.classList.add('active');
                }
            });
            
            configPanels.forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(`${translationConfig.provider}-config`).classList.add('active');
            
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }
}

// 获取当前有效的配置
function getCurrentConfig() {
    if (translationConfig.provider === 'baidu') {
        if (!translationConfig.baidu.appid || !translationConfig.baidu.key) {
            return { valid: false, message: '请先配置百度翻译API' };
        }
        return { 
            valid: true, 
            provider: 'baidu',
            appid: translationConfig.baidu.appid,
            key: translationConfig.baidu.key
        };
    } else {
        if (!translationConfig.youdao.appkey || !translationConfig.youdao.key) {
            return { valid: false, message: '请先配置有道翻译API' };
        }
        return { 
            valid: true, 
            provider: 'youdao',
            appkey: translationConfig.youdao.appkey,
            key: translationConfig.youdao.key
        };
    }
}

// 翻译文本（主备方案）- 用于测试
async function translateText(text) {
    const config = getCurrentConfig();
    
    if (!config.valid) {
        throw new Error('翻译配置无效');
    }
    
    // 尝试主方案
    try {
        if (config.provider === 'baidu') {
            return await translateWithBaidu(text, config.appid, config.key);
        } else {
            return await translateWithYoudao(text, config.appkey, config.key);
        }
    } catch (error) {
        console.warn(`${config.provider}翻译失败，尝试备用方案...`);
        
        // 主方案失败，尝试备用方案
        if (config.provider === 'baidu') {
            // 百度失败，尝试有道
            if (translationConfig.youdao.appkey && translationConfig.youdao.key) {
                return await translateWithYoudao(text, translationConfig.youdao.appkey, translationConfig.youdao.key);
            }
        } else {
            // 有道失败，尝试百度
            if (translationConfig.baidu.appid && translationConfig.baidu.key) {
                return await translateWithBaidu(text, translationConfig.baidu.appid, translationConfig.baidu.key);
            }
        }
        
        throw new Error('主备翻译方案均失败');
    }
}

// 百度翻译API（通过本地代理服务器）
async function translateWithBaidu(text, appid, key) {
    const proxyUrl = 'http://localhost:5000/api/translate/baidu';
    
    try {
        console.log('通过本地代理调用百度翻译API...');
        
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
        
        console.log('✓ 百度翻译API连接成功');
        return data.translation;
        
    } catch (error) {
        console.error('百度翻译API调用失败:', error);
        throw error;
    }
}

// 有道翻译API（通过本地代理服务器）
async function translateWithYoudao(text, appkey, key) {
    const proxyUrl = 'http://localhost:5000/api/translate/youdao';
    
    try {
        console.log('通过本地代理调用有道翻译API...');
        
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
        
        console.log('✓ 有道翻译API连接成功');
        return data.translation;
        
    } catch (error) {
        console.error('有道翻译API调用失败:', error);
        throw error;
    }
}
