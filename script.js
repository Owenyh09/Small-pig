class FocusTimer {
    constructor() {
        this.timer = null;
        this.timeLeft = 0;
        this.isRunning = false;
        this.isFocusTime = true;
        this.todayFocus = 0;
        this.totalFocus = 0;
        this.focusHistory = [];
        this.achievements = {
            firstFocus: { name: '第一次专注', completed: false, icon: '🎯' },
            focusMaster: { name: '专注大师', completed: false, requirement: 100, icon: '👑' },
            marathon: { name: '马拉松', completed: false, requirement: 60, icon: '🏃' },
            earlyBird: { name: '早起的鸟儿', completed: false, icon: '🌅' },
            nightOwl: { name: '夜猫子', completed: false, icon: '🌙' },
            weekendWarrior: { name: '周末战士', completed: false, icon: '🏆' },
            consistency: { name: '持之以恒', completed: false, requirement: 7, icon: '📅' }
        };
        this.themes = {
            pink: {
                primary: '#ff69b4',
                secondary: '#ffb6c1',
                accent: '#ffc0cb',
                text: '#333',
                background: '#fff5f7',
                card: '#fff'
            },
            blue: {
                primary: '#3498db',
                secondary: '#2980b9',
                accent: '#2c3e50',
                text: '#2c3e50',
                background: '#f5f6fa',
                card: '#fff'
            },
            green: {
                primary: '#2ecc71',
                secondary: '#27ae60',
                accent: '#16a085',
                text: '#2c3e50',
                background: '#f1f9f4',
                card: '#fff'
            }
        };
        this.currentTheme = 'pink';
        this.isPaused = false;
        this.pauseTime = 0;

        this.pigStatus = {
            hunger: 100,
            happiness: 100,
            lastFed: Date.now(),
            lastInteraction: Date.now()
        };

        this.isFullscreen = false;
        this.actualFocusTime = 0;  // 记录实际专注时间

        this.initElements();
        this.loadData();
        this.initEventListeners();
        this.initThemeSelector();
        this.updateAchievements();
        this.initCharts();
        this.updateDailyStats();
        this.updateAnalytics();
        this.initServiceWorker();
        this.initPigInteraction();
        this.startPigStatusLoop();
        this.loadPigStatus();
    }

    initElements() {
        this.minutesDisplay = document.getElementById('minutes');
        this.secondsDisplay = document.getElementById('seconds');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.focusTimeInput = document.getElementById('focusTime');
        this.breakTimeInput = document.getElementById('breakTime');
        this.todayFocusDisplay = document.getElementById('todayFocus');
        this.totalFocusDisplay = document.getElementById('totalFocus');
        this.achievementList = document.getElementById('achievementList');
        this.pig = document.querySelector('.pig');
        this.eyes = document.querySelectorAll('.eye');
        this.snout = document.querySelector('.snout');
        this.bestTimeDisplay = document.getElementById('bestTime');
        this.avgDurationDisplay = document.getElementById('avgDuration');
        this.maxDurationDisplay = document.getElementById('maxDuration');
        this.streakDaysDisplay = document.getElementById('streakDays');
        this.fullscreenBtn = document.createElement('button');
        this.fullscreenBtn.id = 'fullscreenBtn';
        this.fullscreenBtn.className = 'control-btn';
        this.fullscreenBtn.innerHTML = '全屏专注';
        document.querySelector('.controls').appendChild(this.fullscreenBtn);
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        }
    }

    loadData() {
        const savedData = localStorage.getItem('focusData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.todayFocus = data.todayFocus || 0;
            this.totalFocus = data.totalFocus || 0;
            this.achievements = data.achievements || this.achievements;
            this.focusHistory = data.focusHistory || [];
        }
        
        // 加载保存的主题
        const savedTheme = localStorage.getItem('focusTimerTheme');
        if (savedTheme && this.themes[savedTheme]) {
            this.setTheme(savedTheme);
        }
        
        this.updateStats();
    }

    saveData() {
        const data = {
            todayFocus: this.todayFocus,
            totalFocus: this.totalFocus,
            achievements: this.achievements,
            focusHistory: this.focusHistory
        };
        localStorage.setItem('focusData', JSON.stringify(data));
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        
        // 检测页面切换
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning && this.isFocusTime && !this.isPaused) {
                this.handleDistraction();
            }
        });

        // 添加鼠标移动动画
        document.addEventListener('mousemove', (e) => {
            if (this.isRunning) {
                this.animatePig(e);
            }
        });

        // 添加触摸事件支持
        document.addEventListener('touchmove', (e) => {
            if (this.isRunning) {
                const touch = e.touches[0];
                this.animatePig({
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
            }
        });

        // 添加键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleTimer();
            }
        });

        // 添加全屏按钮事件
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // 监听全屏变化
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.fullscreenBtn.innerHTML = this.isFullscreen ? '退出全屏' : '全屏专注';
        });
    }

    initThemeSelector() {
        const themes = [
            { name: 'pink', label: '粉色主题' },
            { name: 'blue', label: '蓝色主题' },
            { name: 'green', label: '绿色主题' }
        ];

        const themeSelector = document.createElement('div');
        themeSelector.className = 'theme-selector';
        themeSelector.style.position = 'fixed';
        themeSelector.style.top = '20px';
        themeSelector.style.right = '20px';
        themeSelector.style.display = 'flex';
        themeSelector.style.gap = '10px';
        themeSelector.style.background = 'rgba(255, 255, 255, 0.9)';
        themeSelector.style.padding = '10px';
        themeSelector.style.borderRadius = '20px';
        themeSelector.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';

        themes.forEach(theme => {
            const option = document.createElement('div');
            option.className = `theme-option theme-${theme.name}`;
            option.title = theme.label;
            option.onclick = () => this.setTheme(theme.name);
            themeSelector.appendChild(option);
        });

        document.body.appendChild(themeSelector);
    }

    setTheme(themeName) {
        this.currentTheme = themeName;
        const themeColors = this.themes[themeName];
        
        document.documentElement.setAttribute('data-theme', themeName);
        document.documentElement.style.setProperty('--primary-color', themeColors.primary);
        document.documentElement.style.setProperty('--secondary-color', themeColors.secondary);
        document.documentElement.style.setProperty('--accent-color', themeColors.accent);
        document.documentElement.style.setProperty('--text-color', themeColors.text);
        document.documentElement.style.setProperty('--background-color', themeColors.background);
        document.documentElement.style.setProperty('--card-bg', themeColors.card);
        
        // 更新主题选择器的活动状态
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
            if (option.classList.contains(`theme-${themeName}`)) {
                option.classList.add('active');
            }
        });
        
        // 保存主题选择
        localStorage.setItem('focusTimerTheme', themeName);
    }

    animatePig(e) {
        const rect = this.pig.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 优化眼睛跟随效果
        this.eyes.forEach(eye => {
            const eyeRect = eye.getBoundingClientRect();
            const angle = Math.atan2(y - eyeRect.top, x - eyeRect.left);
            const distance = Math.min(5, Math.sqrt(Math.pow(x - eyeRect.left, 2) + Math.pow(y - eyeRect.top, 2)));
            
            eye.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
        });

        // 优化鼻子动画
        const snoutRect = this.snout.getBoundingClientRect();
        const snoutX = e.clientX - snoutRect.left;
        const snoutY = e.clientY - snoutRect.top;
        const snoutDistance = Math.sqrt(Math.pow(snoutX, 2) + Math.pow(snoutY, 2));
        
        if (snoutDistance < 30) {
            this.snout.style.transform = `translateX(-50%) scale(1.1)`;
        } else {
            this.snout.style.transform = `translateX(-50%) scale(1)`;
        }
    }

    toggleTimer() {
        if (this.isRunning) {
            if (this.isPaused) {
                this.resumeTimer();
            } else {
                this.pauseTimer();
            }
        } else {
            this.startTimer();
        }
    }

    pauseTimer() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            clearInterval(this.timer);
            this.startBtn.textContent = '继续';
            this.pig.classList.remove('active');
            
            // 记录已完成的专注时间
            if (this.isFocusTime) {
                const focusMinutes = Math.floor(this.actualFocusTime / 60);
                if (focusMinutes > 0) {
                    this.todayFocus += focusMinutes;
                    this.totalFocus += focusMinutes;
                    this.recordFocusSession(focusMinutes);
                    this.updateStats();
                    this.checkAchievements();
                    this.saveData();
                    this.updateCharts();
                }
            }
        }
    }

    resumeTimer() {
        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            this.startBtn.textContent = '暂停';
            this.pig.classList.add('active');
            this.timer = setInterval(() => {
                if (!document.hidden) {  // 只在页面可见时计时
                    this.timeLeft--;
                    this.updateDisplay();
                    if (this.timeLeft <= 0) {
                        this.completeSession();
                    }
                }
            }, 1000);
        }
    }

    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.startBtn.textContent = '暂停';
            this.timeLeft = this.isFocusTime ? 
                parseInt(this.focusTimeInput.value) * 60 : 
                parseInt(this.breakTimeInput.value) * 60;
            
            this.startTime = Date.now();  // 记录开始时间
            this.actualFocusTime = 0;  // 重置实际专注时间
            
            this.pig.classList.add('active');
            
            this.timer = setInterval(() => {
                if (!document.hidden && !this.isPaused) {
                    this.timeLeft--;
                    this.updateDisplay();
                    
                    // 更新实际专注时间
                    if (this.isFocusTime) {
                        this.actualFocusTime = Math.floor((Date.now() - this.startTime) / 1000);
                    }
                    
                    if (this.timeLeft <= 0) {
                        this.completeSession();
                    }
                }
            }, 1000);

            if (Notification.permission !== "granted" && Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        }
    }

    resetTimer() {
        this.pauseTimer();
        this.isFocusTime = true;
        this.timeLeft = parseInt(this.focusTimeInput.value) * 60;
        this.updateDisplay();
        this.startBtn.textContent = '开始专注';
        this.pig.classList.remove('active');
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        this.secondsDisplay.textContent = seconds.toString().padStart(2, '0');
    }

    completeSession() {
        clearInterval(this.timer);
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.isFocusTime) {
            // 使用实际专注时间而不是设定时间
            const focusMinutes = Math.floor(this.actualFocusTime / 60);
            if (focusMinutes > 0) {
                this.todayFocus += focusMinutes;
                this.totalFocus += focusMinutes;
                this.recordFocusSession(focusMinutes);
                this.updateStats();
                this.checkAchievements();
                this.saveData();
                this.updateCharts();
                this.updateAnalytics();
            }
            
            this.playSound();
            this.showNotification('专注时间结束！该休息了');
            
            this.isFocusTime = false;
            this.timeLeft = parseInt(this.breakTimeInput.value) * 60;
        } else {
            this.showNotification('休息时间结束！继续专注');
            
            this.isFocusTime = true;
            this.timeLeft = parseInt(this.focusTimeInput.value) * 60;
        }
        
        this.startBtn.textContent = '开始' + (this.isFocusTime ? '专注' : '休息');
        this.pig.classList.remove('active');
        this.updateDisplay();
    }

    recordFocusSession(minutes) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // 查找今天是否已有记录
        const todaySession = this.focusHistory.find(session => session.date === today);
        
        if (todaySession) {
            // 更新今天的记录
            todaySession.duration += minutes;
        } else {
            // 创建新记录
            this.focusHistory.push({
                date: today,
                duration: minutes
            });
        }
        
        // 保持最近30天的记录
        if (this.focusHistory.length > 30) {
            this.focusHistory = this.focusHistory.slice(-30);
        }
        
        this.saveData();
        this.updateCharts();
    }

    updateDailyStats() {
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = this.focusHistory.filter(session => session.date === today);
        const totalToday = todaySessions.reduce((sum, session) => sum + session.duration, 0);
        this.todayFocusDisplay.textContent = totalToday;
    }

    updateAnalytics() {
        // 计算最佳专注时段
        const hourStats = {};
        this.focusHistory.forEach(session => {
            if (!hourStats[session.hour]) {
                hourStats[session.hour] = 0;
            }
            hourStats[session.hour] += session.duration;
        });

        let bestHour = Object.entries(hourStats).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        this.bestTimeDisplay.textContent = `${bestHour}:00`;

        // 计算平均专注时长
        const avgDuration = this.focusHistory.length > 0 ? 
            Math.round(this.totalFocus / this.focusHistory.length) : 0;
        this.avgDurationDisplay.textContent = `${avgDuration}分钟`;

        // 计算最长专注记录
        const maxDuration = this.focusHistory.length > 0 ? 
            Math.max(...this.focusHistory.map(session => session.duration)) : 0;
        this.maxDurationDisplay.textContent = `${maxDuration}分钟`;

        // 计算连续专注天数
        const dates = [...new Set(this.focusHistory.map(session => session.date))].sort();
        let streak = 1;
        let currentStreak = 1;
        
        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i-1]);
            const currDate = new Date(dates[i]);
            const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                currentStreak++;
                streak = Math.max(streak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
        
        this.streakDaysDisplay.textContent = `${streak}天`;
    }

    initCharts() {
        this.ctx = document.getElementById('focusChart');
        
        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '每日专注时间',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '分钟'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '日期'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    updateCharts() {
        const dailyData = {};
        this.focusHistory.forEach(session => {
            if (!dailyData[session.date]) {
                dailyData[session.date] = 0;
            }
            dailyData[session.date] += session.duration;
        });

        const sortedDates = Object.keys(dailyData).sort();
        this.chart.data.labels = sortedDates;
        this.chart.data.datasets[0].data = sortedDates.map(date => dailyData[date]);
        this.chart.update();
    }

    handleDistraction() {
        if (this.isRunning && !this.isPaused) {
            this.pauseTimer();
            this.pigStatus.happiness = Math.max(0, this.pigStatus.happiness - 15);
            this.savePigStatus();
            
            const pig = document.querySelector('.pig');
            pig.classList.add('sad');
            this.showPigStatus('不要分心啦...');
            
            // 尝试将窗口置顶
            this.focusWindow();
            
            setTimeout(() => {
                pig.classList.remove('sad');
            }, 2000);
        }
    }

    showNotification(message) {
        if (Notification.permission === "granted") {
            new Notification("小猪专注提醒", {
                body: message,
                icon: "pig-icon.png",
                vibrate: [200, 100, 200]
            });
        }
    }

    updateStats() {
        this.todayFocusDisplay.textContent = this.todayFocus;
        this.totalFocusDisplay.textContent = this.totalFocus;
    }

    checkAchievements() {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();

        // 检查第一次专注成就
        if (!this.achievements.firstFocus.completed) {
            this.achievements.firstFocus.completed = true;
        }

        // 检查专注大师成就
        if (!this.achievements.focusMaster.completed && 
            this.totalFocus >= this.achievements.focusMaster.requirement) {
            this.achievements.focusMaster.completed = true;
        }

        // 检查马拉松成就
        if (!this.achievements.marathon.completed && 
            this.todayFocus >= this.achievements.marathon.requirement) {
            this.achievements.marathon.completed = true;
        }

        // 检查早起成就
        if (!this.achievements.earlyBird.completed && hour >= 5 && hour < 8) {
            this.achievements.earlyBird.completed = true;
        }

        // 检查夜猫子成就
        if (!this.achievements.nightOwl.completed && hour >= 22) {
            this.achievements.nightOwl.completed = true;
        }

        // 检查周末战士成就
        if (!this.achievements.weekendWarrior.completed && (dayOfWeek === 0 || dayOfWeek === 6)) {
            this.achievements.weekendWarrior.completed = true;
        }

        // 检查持之以恒成就
        if (!this.achievements.consistency.completed) {
            const dates = [...new Set(this.focusHistory.map(session => session.date))];
            if (dates.length >= this.achievements.consistency.requirement) {
                this.achievements.consistency.completed = true;
            }
        }

        this.updateAchievements();
    }

    updateAchievements() {
        this.achievementList.innerHTML = '';
        Object.entries(this.achievements).forEach(([key, achievement]) => {
            const div = document.createElement('div');
            div.className = `achievement ${achievement.completed ? '' : 'locked'}`;
            div.innerHTML = `
                <h3>${achievement.icon} ${achievement.name}</h3>
                ${achievement.requirement ? 
                    `<p>要求: ${achievement.requirement}${achievement.name.includes('天') ? '天' : '分钟'}</p>` : ''}
                <p>${achievement.completed ? '已完成' : '未完成'}</p>
            `;
            this.achievementList.appendChild(div);
        });
    }

    playSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        audio.play();
    }

    initPigInteraction() {
        const foodItems = document.querySelectorAll('.food-item');
        const pig = document.querySelector('.pig');
        const pigStatus = document.querySelector('.pig-status');

        // 为每个食物项添加点击事件
        foodItems.forEach(item => {
            // 添加触摸事件支持
            item.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const clone = item.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.zIndex = '1000';
                clone.style.pointerEvents = 'none';
                clone.style.width = '40px';
                clone.style.height = '40px';
                document.body.appendChild(clone);

                const moveFood = (moveEvent) => {
                    const touch = moveEvent.touches[0];
                    clone.style.left = (touch.clientX - item.offsetWidth / 2) + 'px';
                    clone.style.top = (touch.clientY - item.offsetHeight / 2) + 'px';

                    // 检查是否在小猪上方
                    const pigRect = pig.getBoundingClientRect();
                    if (touch.clientX >= pigRect.left && 
                        touch.clientX <= pigRect.right && 
                        touch.clientY >= pigRect.top && 
                        touch.clientY <= pigRect.bottom) {
                        pig.classList.add('eating');
                    } else {
                        pig.classList.remove('eating');
                    }
                };

                const releaseFood = (endEvent) => {
                    const touch = endEvent.changedTouches[0];
                    document.removeEventListener('touchmove', moveFood);
                    document.removeEventListener('touchend', releaseFood);
                    
                    // 检查是否在小猪上方释放
                    const pigRect = pig.getBoundingClientRect();
                    if (touch.clientX >= pigRect.left && 
                        touch.clientX <= pigRect.right && 
                        touch.clientY >= pigRect.top && 
                        touch.clientY <= pigRect.bottom) {
                        this.feedPig(item.dataset.food);
                    }
                    
                    document.body.removeChild(clone);
                    pig.classList.remove('eating');
                };

                document.addEventListener('touchmove', moveFood);
                document.addEventListener('touchend', releaseFood);
            });

            // 保留原有的鼠标事件
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const clone = item.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.zIndex = '1000';
                clone.style.pointerEvents = 'none';
                clone.style.width = '40px';
                clone.style.height = '40px';
                document.body.appendChild(clone);

                const moveFood = (moveEvent) => {
                    clone.style.left = (moveEvent.clientX - item.offsetWidth / 2) + 'px';
                    clone.style.top = (moveEvent.clientY - item.offsetHeight / 2) + 'px';

                    // 检查是否在小猪上方
                    const pigRect = pig.getBoundingClientRect();
                    if (moveEvent.clientX >= pigRect.left && 
                        moveEvent.clientX <= pigRect.right && 
                        moveEvent.clientY >= pigRect.top && 
                        moveEvent.clientY <= pigRect.bottom) {
                        pig.classList.add('eating');
                    } else {
                        pig.classList.remove('eating');
                    }
                };

                const releaseFood = (upEvent) => {
                    document.removeEventListener('mousemove', moveFood);
                    document.removeEventListener('mouseup', releaseFood);
                    
                    // 检查是否在小猪上方释放
                    const pigRect = pig.getBoundingClientRect();
                    if (upEvent.clientX >= pigRect.left && 
                        upEvent.clientX <= pigRect.right && 
                        upEvent.clientY >= pigRect.top && 
                        upEvent.clientY <= pigRect.bottom) {
                        this.feedPig(item.dataset.food);
                    }
                    
                    document.body.removeChild(clone);
                    pig.classList.remove('eating');
                };

                document.addEventListener('mousemove', moveFood);
                document.addEventListener('mouseup', releaseFood);
            });
        });

        // 添加触摸事件处理
        pig.addEventListener('touchstart', (e) => {
            e.preventDefault();
            pig.classList.add('eating');
        });

        pig.addEventListener('touchend', (e) => {
            e.preventDefault();
            pig.classList.remove('eating');
        });

        // 点击小猪
        pig.addEventListener('click', () => {
            this.showPigStatus();
            pig.classList.add('happy');
            this.pigStatus.happiness = Math.min(100, this.pigStatus.happiness + 10);
            this.pigStatus.lastInteraction = Date.now();
            this.savePigStatus();
            this.showHeart();
            setTimeout(() => pig.classList.remove('happy'), 1000);
        });
    }

    feedPig(food) {
        const pig = document.querySelector('.pig');
        const pigStatus = document.querySelector('.pig-status');
        
        // 不同食物的效果
        const foods = {
            apple: { hunger: 20, happiness: 15, message: '苹果真好吃！', emoji: '🍎' },
            carrot: { hunger: 15, happiness: 10, message: '胡萝卜很健康~', emoji: '🥕' },
            cookie: { hunger: 25, happiness: 20, message: '饼干太美味了！', emoji: '🍪' }
        };

        const effect = foods[food];
        if (effect) {
            // 添加食物动画
            const foodAnim = document.querySelector('.food-animation');
            foodAnim.textContent = effect.emoji;
            foodAnim.classList.add('animate');
            
            pig.classList.add('eating');
            this.showPigStatus(effect.message);

            this.pigStatus.hunger = Math.min(100, this.pigStatus.hunger + effect.hunger);
            this.pigStatus.happiness = Math.min(100, this.pigStatus.happiness + effect.happiness);
            this.pigStatus.lastFed = Date.now();
            this.pigStatus.lastInteraction = Date.now();

            // 添加心形动画
            if (this.pigStatus.hunger >= 80 || this.pigStatus.happiness >= 80) {
                this.showHeart();
            }

            setTimeout(() => {
                pig.classList.remove('eating');
                foodAnim.classList.remove('animate');
            }, 2000);

            this.savePigStatus();
        }
    }

    showHeart() {
        const heart = document.querySelector('.heart');
        heart.classList.remove('animate');
        void heart.offsetWidth; // 触发重绘
        heart.classList.add('animate');
    }

    showPigStatus(customMessage) {
        const pigStatus = document.querySelector('.pig-status');
        let message = customMessage;

        if (!message) {
            if (this.pigStatus.hunger < 30) {
                message = '好饿啊...';
            } else if (this.pigStatus.happiness < 30) {
                message = '想要关注...';
            } else if (this.pigStatus.hunger >= 100 && this.pigStatus.happiness >= 100) {
                message = '太幸福了！';
            } else {
                message = '心情不错~';
            }
        }

        pigStatus.textContent = message;
        pigStatus.classList.add('show');
        setTimeout(() => pigStatus.classList.remove('show'), 2000);
    }

    loadPigStatus() {
        const savedStatus = localStorage.getItem('pigStatus');
        if (savedStatus) {
            this.pigStatus = { ...this.pigStatus, ...JSON.parse(savedStatus) };
        }
    }

    savePigStatus() {
        localStorage.setItem('pigStatus', JSON.stringify(this.pigStatus));
    }

    startPigStatusLoop() {
        setInterval(() => {
            const now = Date.now();
            const minutesPassed = (now - this.pigStatus.lastFed) / (1000 * 60);
            const interactionPassed = (now - this.pigStatus.lastInteraction) / (1000 * 60);
            
            // 饥饿度和幸福度随时间降低
            this.pigStatus.hunger = Math.max(0, this.pigStatus.hunger - (minutesPassed * 0.5));
            this.pigStatus.happiness = Math.max(0, this.pigStatus.happiness - (interactionPassed * 0.3));

            // 状态过低时显示提醒
            if (this.pigStatus.hunger < 30 || this.pigStatus.happiness < 30) {
                const pig = document.querySelector('.pig');
                pig.classList.add('sad');
                this.showPigStatus();
                setTimeout(() => pig.classList.remove('sad'), 2000);
            }

            this.savePigStatus();
        }, 60000); // 每分钟检查一次
    }

    initPigMovement() {
        const pig = document.querySelector('.pig');
        
        // 监听鼠标进入小猪
        pig.addEventListener('mouseenter', () => {
            pig.style.transition = 'transform 0.3s ease';
            pig.style.transform = 'scale(1.1)';
            this.showPigStatus('你好啊！');
        });

        // 监听鼠标离开小猪
        pig.addEventListener('mouseleave', () => {
            pig.style.transition = 'transform 0.3s ease';
            pig.style.transform = 'scale(1)';
        });

        // 添加轻微的呼吸动画
        const breathe = () => {
            if (!document.hidden && !this.isPaused) {
                const breatheAmount = Math.sin(Date.now() / 1000) * 0.03 + 1; // 轻微的呼吸效果
                pig.style.transform = `scale(${breatheAmount})`;
            }
            requestAnimationFrame(breathe);
        };

        breathe();
    }

    initPageMonitor() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.handleDistraction();
                // 尝试将窗口置顶
                this.focusWindow();
            }
        });

        // 监听窗口失去焦点
        window.addEventListener('blur', () => {
            if (this.isRunning) {
                this.handleDistraction();
                this.focusWindow();
            }
        });
    }

    focusWindow() {
        // 显示通知
        this.showNotification('快回来继续学习吧！');
        
        try {
            window.focus();
            if (window.opener) {
                window.close();
            }
        } catch (e) {
            console.log('无法自动切换窗口，需要用户手动操作');
        }
        
        const pig = document.querySelector('.pig');
        pig.classList.add('sad');
        this.showPigStatus('不要分心啦，快回来学习！');
        
        setTimeout(() => {
            pig.classList.remove('sad');
        }, 3000);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('全屏请求被拒绝：', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// 初始化计时器
document.addEventListener('DOMContentLoaded', () => {
    new FocusTimer();
    initThemeSelector();
    const savedTheme = localStorage.getItem('selectedTheme') || 'pink';
    setTheme(savedTheme);
}); 