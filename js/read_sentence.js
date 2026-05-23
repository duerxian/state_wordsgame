/**
 * 朗读功能模块
 * 便于在多个页面复用
 */

class ReadSentence {
    constructor(options = {}) {
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
        this.voices = [];
        this.displayVoices = [];
        // 状态：idle空闲 / playing朗读中 / paused已暂停
        this.readState = 'idle';
        // 配置项
        this.rate = options.rate || 0.8;
        this.voiceIndex = options.voiceIndex || 0;
        // 回调函数
        this.onStateChange = options.onStateChange || (() => {});
        this.onEnd = options.onEnd || (() => {});
        this.onError = options.onError || (() => {});
        // DOM元素引用
        this.elements = {
            voiceSelect: null,
            rateControl: null,
            rateText: null
        };
    }

    /**
     * 初始化语音列表，优先显示高质量语音，如果没有则显示所有可用语音
     */
    loadVoices() {
        if (!this.synth) return;
        
        this.voices = this.synth.getVoices();
        
        // 优先筛选高质量语音
        let filtered = this.voices.filter(v => 
            v.name.includes('Microsoft') || 
            v.name.includes('Chrome OS US English') ||
            v.name.includes('Google US English') ||
            v.name.includes('(Natural)')
        );
        
        // 如果筛选结果为空，显示所有可用语音
        if (filtered.length === 0) {
            filtered = this.voices;
        }
        
        // 优先显示英文语音
        const englishVoices = filtered.filter(v => v.lang.startsWith('en'));
        const otherVoices = filtered.filter(v => !v.lang.startsWith('en'));
        this.displayVoices = [...englishVoices, ...otherVoices];
        
        return this.displayVoices;
    }

    /**
     * 将语音列表填充到select元素，并设置默认选中合适的英文语音
     */
    populateVoiceSelect(selectElement) {
        if (!selectElement) return;
        
        selectElement.innerHTML = '';
        const voices = this.loadVoices();
        
        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            // 简化名字显示
            let simpleName = voice.name;
            simpleName = simpleName.replace(/Microsoft\s*/i, '');
            simpleName = simpleName.replace(/Google\s*/i, '');
            simpleName = simpleName.replace(/Chrome OS\s*/i, '');
            simpleName = simpleName.replace(/\s*[-–].*/, '');
            simpleName = simpleName.trim();
            option.textContent = `${simpleName} (${voice.lang})`;
            selectElement.appendChild(option);
        });
        
        // 按优先级选择默认语音
        let defaultIndex = 0;
        
        // 1. 优先找 US English 8
        const usEnglish8Index = voices.findIndex(v => 
            v.name.includes('US English 8') && v.lang === 'en-US'
        );
        if (usEnglish8Index !== -1) {
            defaultIndex = usEnglish8Index;
        } else {
            // 2. 找 David
            const davidIndex = voices.findIndex(v => 
                v.name.includes('David') && v.lang === 'en-US'
            );
            if (davidIndex !== -1) {
                defaultIndex = davidIndex;
            } else {
                // 3. 找任意 en-US 语音
                const enUsIndex = voices.findIndex(v => v.lang === 'en-US');
                if (enUsIndex !== -1) {
                    defaultIndex = enUsIndex;
                } else {
                    // 4. 找任意英文语音
                    const enIndex = voices.findIndex(v => v.lang.startsWith('en'));
                    if (enIndex !== -1) {
                        defaultIndex = enIndex;
                    }
                    // 5. 否则使用第一个
                }
            }
        }
        
        selectElement.value = defaultIndex;
        this.voiceIndex = defaultIndex;
        this.elements.voiceSelect = selectElement;
    }

    /**
     * 将文本分割成句子（按标点符号分割）
     */
    splitIntoSentences(text) {
        if (!text) return [];
        
        let sentences = [];
        
        // 先按行分割
        const lines = text.split(/\n+/).map(line => line.trim()).filter(line => line);
        
        lines.forEach(line => {
            // 按标点符号分割句子
            // 中文标点：。！？；：，
            // 英文标点：.!?;:,
            const sentenceEndings = /([。！？；：，.!?;:,])/g;
            
            // 在标点处添加特殊标记
            let processedLine = line.replace(sentenceEndings, '$1⏎');
            
            // 按换行符分割
            const lineSentences = processedLine.split('⏎').map(s => s.trim()).filter(s => s);
            
            sentences = sentences.concat(lineSentences);
        });
        
        return sentences;
    }

    /**
     * 朗读文本（逐句朗读，带自然停顿）
     */
    speak(text, options = {}) {
        if (!this.synth || !text) return;
        
        // 取消之前的朗读
        this.synth.cancel();
        
        const rate = options.rate || this.rate;
        const voiceIndex = options.voiceIndex !== undefined ? options.voiceIndex : this.voiceIndex;
        
        // 分割成句子
        const sentences = this.splitIntoSentences(text);
        
        // 调试日志
        console.log('📢 朗读文本，分割后的句子:', sentences);
        
        // 如果没有句子，直接返回
        if (sentences.length === 0) {
            return;
        }
        
        let currentIndex = 0;
        let shouldStop = false;
        
        // 定义朗读下一句的函数
        const speakNext = () => {
            console.log(`📢 准备朗读第 ${currentIndex + 1}/${sentences.length} 句`);
            
            // 检查是否应该停止
            if (shouldStop || currentIndex >= sentences.length || this.readState !== 'playing') {
                console.log('📢 停止朗读');
                this.readState = 'idle';
                this.onStateChange('idle');
                this.onEnd();
                return;
            }
            
            const sentence = sentences[currentIndex];
            const u = new SpeechSynthesisUtterance(sentence);
            this.currentUtterance = u;
            
            u.rate = rate;
            u.pitch = 1;
            
            if (this.displayVoices[voiceIndex]) {
                u.voice = this.displayVoices[voiceIndex];
                u.lang = this.displayVoices[voiceIndex].lang;
            } else {
                u.lang = /[\u4e00-\u9fa5]/.test(sentence) ? 'zh-CN' : 'en-US';
            }
            
            u.onstart = () => {
                console.log(`📢 开始朗读: "${sentence}"`);
            };
            
            u.onend = () => {
                console.log(`📢 完成朗读: "${sentence}"`);
                
                // 再次检查是否应该停止
                if (shouldStop || this.readState !== 'playing') {
                    this.readState = 'idle';
                    this.onStateChange('idle');
                    return;
                }
                
                currentIndex++;
                
                // 检查是否读完了所有句子
                if (currentIndex >= sentences.length) {
                    console.log('📢 所有句子朗读完成');
                    this.readState = 'idle';
                    this.onStateChange('idle');
                    this.onEnd();
                    return;
                }
                
                // 根据句子结尾的标点决定停顿时间
                const lastChar = sentence.slice(-1);
                let pauseTime = 300; // 默认停顿
                
                if (/[。！？.!?]/.test(lastChar)) {
                    pauseTime = 600; // 句末标点，停顿稍长
                } else if (/[，,；;：:]/.test(lastChar)) {
                    pauseTime = 200// 逗号、分号等，停顿较短
                }
                
                console.log(`📢 句子结尾字符: "${lastChar}"，停顿 ${pauseTime}ms 后朗读下一句`);
                
                // 继续下一句
                setTimeout(speakNext, pauseTime);
            };
            
            u.onerror = (event) => {
                console.error('📢 朗读错误:', event);
                shouldStop = true;
                this.readState = 'idle';
                this.onStateChange('idle');
                this.onError();
            };
            
            this.synth.speak(u);
        };
        
        // 保存原始的 stop 方法
        const originalStop = this.stop.bind(this);
        
        // 重写 stop 方法，确保也停止内部循环
        this.stop = () => {
            console.log('📢 调用 stop 方法');
            shouldStop = true;
            originalStop();
        };
        
        // 开始朗读
        this.readState = 'playing';
        this.onStateChange('playing');
        speakNext();
    }

    /**
     * 从容器元素中读取文本并朗读
     */
    speakFromContainer(containerElement, options = {}) {
        if (!containerElement) return;
        
        let texts = [];
        
        // 首先尝试找到文章内容容器
        const articleContent = containerElement.querySelector('.article-content');
        if (articleContent) {
            // 从文章内容容器中获取所有段落
            const paragraphs = articleContent.querySelectorAll('p, .sentence-line');
            if (paragraphs.length > 0) {
                paragraphs.forEach(p => {
                    const text = p.textContent.trim();
                    if (text && !text.includes('暂无内容') && !text.includes('暂无英文') && !text.includes('暂无中文')) {
                        texts.push(text);
                    }
                });
            } else {
                // 如果没有段落，直接获取文章内容
                const text = articleContent.textContent.trim();
                if (text && !text.includes('暂无内容') && !text.includes('暂无英文') && !text.includes('暂无中文')) {
                    texts.push(text);
                }
            }
        } else {
            // 尝试获取当前页所有可见的文本内容
            const pageElements = containerElement.querySelectorAll('p, div, span, .sentence-line, .english-content, .chinese-content');
            
            pageElements.forEach(el => {
                // 跳过按钮、输入框、标题等非内容元素
                if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || 
                    el.classList.contains('nav') || el.classList.contains('controls') || 
                    el.classList.contains('filter-controls') || el.classList.contains('stats') ||
                    el.classList.contains('page-controls')) {
                    return;
                }
                
                const text = el.textContent.trim();
                if (text && !text.includes('暂无内容') && !text.includes('暂无英文') && !text.includes('暂无中文') && text.length > 10) {
                    texts.push(text);
                }
            });
            
            // 如果还是没找到，直接获取整个容器的文本
            if (texts.length === 0) {
                const fullText = containerElement.textContent.trim();
                if (fullText && !fullText.includes('暂无内容') && !fullText.includes('暂无英文') && !fullText.includes('暂无中文')) {
                    texts.push(fullText);
                }
            }
        }
        
        const content = texts.join('\n\n');
        
        this.speak(content, options);
    }

    /**
     * 暂停朗读
     */
    pause() {
        if (this.synth && this.readState === 'playing') {
            this.synth.pause();
            this.readState = 'paused';
            this.onStateChange('paused');
        }
    }

    /**
     * 继续朗读
     */
    resume() {
        if (this.synth && this.readState === 'paused') {
            this.synth.resume();
            this.readState = 'playing';
            this.onStateChange('playing');
        }
    }

    /**
     * 停止朗读
     */
    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.readState = 'idle';
            this.onStateChange('idle');
        }
    }

    /**
     * 切换朗读/暂停/继续
     */
    toggle(textOrContainer, options = {}) {
        if (!this.synth) return;

        if (this.readState === 'playing') {
            this.pause();
            return;
        }

        if (this.readState === 'paused') {
            this.resume();
            return;
        }

        if (typeof textOrContainer === 'string') {
            this.speak(textOrContainer, options);
        } else if (textOrContainer instanceof HTMLElement) {
            this.speakFromContainer(textOrContainer, options);
        }
    }

    /**
     * 设置语速
     */
    setRate(rate) {
        this.rate = rate;
        if (this.readState === 'playing' || this.readState === 'paused') {
            // 重新开始朗读以应用新语速
            // 注意：这里需要调用者保存文本内容
        }
    }

    /**
     * 设置音色索引
     */
    setVoiceIndex(index) {
        this.voiceIndex = index;
        if (this.readState === 'playing' || this.readState === 'paused') {
            // 重新开始朗读以应用新音色
        }
    }

    /**
     * 初始化语音控制面板
     */
    initVoiceControls(voiceSelectId, rateControlId, rateTextId) {
        if (!('speechSynthesis' in window)) return;
        
        const voicePanel = document.getElementById(voiceSelectId)?.parentElement;
        if (voicePanel) {
            voicePanel.style.display = 'flex';
        }
        
        this.synth.onvoiceschanged = () => {
            const voiceSelect = document.getElementById(voiceSelectId);
            if (voiceSelect) {
                this.populateVoiceSelect(voiceSelect);
            }
        };
        
        const voiceSelect = document.getElementById(voiceSelectId);
        if (voiceSelect) {
            this.populateVoiceSelect(voiceSelect);
        }
        
        const rateControl = document.getElementById(rateControlId);
        const rateText = document.getElementById(rateTextId);
        
        if (rateControl && rateText) {
            this.elements.rateControl = rateControl;
            this.elements.rateText = rateText;
            
            // 设置默认值
            rateControl.value = this.rate;
            rateText.textContent = this.rate + 'x';
            
            rateControl.addEventListener('input', () => {
                this.rate = parseFloat(rateControl.value);
                rateText.textContent = rateControl.value + 'x';
            });
        }
        
        if (voiceSelect) {
            voiceSelect.addEventListener('change', () => {
                this.voiceIndex = parseInt(voiceSelect.value);
            });
        }
    }

    /**
     * 获取当前状态
     */
    getState() {
        return this.readState;
    }

    /**
     * 获取按钮文本
     */
    getButtonText() {
        return this.readState === 'playing' ? '暂停 ⏸️' : '朗读 🔊';
    }
}

// 导出为全局变量
window.ReadSentence = ReadSentence;
