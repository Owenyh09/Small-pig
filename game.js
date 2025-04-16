// 基础配置
const config = {
    canvas: {
        width: window.innerWidth - 40,  // 自适应窗口宽度
        height: window.innerHeight - 40  // 自适应窗口高度
    },
    game: {
        maxZombies: 100,
        maxBullets: 100,
        fpsLimit: 60
    }
};

// 初始化画布
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = config.canvas.width;
canvas.height = config.canvas.height;

// 游戏状态
let game = {
    score: 0,
    highScore: localStorage.getItem('highScore') || 0,
    lastScore: 0,
    level: 1,
    isOver: false,
    killCount: 0,
    zombieSpawnRate: 0.005,
    killsToUpgrade: 30,
    bossSpawned: false,
    screenShake: {
        active: false,
        intensity: 0,
        duration: 0,
        startTime: 0,
        offsetX: 0,
        offsetY: 0
    },
    damageEffect: { active: false, opacity: 0 },
    autoAim: {
        enabled: false,
        scoreMultiplier: 0.8  // 启用自动瞄准时的得分倍率
    },
    shareText: {
        title: '僵尸射击游戏',
        desc: '快来挑战我的分数!',
        imgUrl: 'path/to/share/image.png' // 添加分享图片
    },
    control: {
        mode: 'mouse',  // 'mouse' 或 'keyboard'
        lastMoveDirection: { x: 1, y: 0 },  // 记录最后移动方向
        autoShootTimer: null
    }
};

// 玩家对象
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 3,
    health: 100,
    maxHealth: 100,
    healAmount: 20,
    killsToHeal: 15,
    bullets: [],
    damage: 8,
    fireRate: 2.5,
    lastShot: 0,
    melee: undefined, // 移除近战属性
    dash: {
        active: false,
        cooldown: 3000,    // 冷却时间(ms)
        duration: 300,     // 持续时间(ms)
        distance: 300,     // 增加基础位移距离（原200）
        lastUse: 0,
        timeTrail: [],     // 记录历史位置
        maxTrailLength: 180,
        trailInterval: 50,
        lastTrailTime: 0,
        ghostImages: [],
        maxGhostImages: 5,
        invincible: true,
        upgradeBoost: {
            cooldownReduction: 200,
            distanceGrowth: 30,  // 增加每级位移距离提升（原20）
            trailLength: 60,
            speedGrowth: 0.2
        }
    },
    bulletCount: 1,
    bulletSpread: 0.2,
    bulletGrowth: 1,
};

// 粒子系统
const particles = {
    list: [],
    maxParticles: 200,  // 增加最大粒子数
    
    create(x, y, color, type, options = {}) {
        if (this.list.length >= this.maxParticles) return;
        
        const baseParticle = {
            x, y,
            color,
            type,
            life: 1,
            decay: Math.random() * 0.02 + 0.02,
            velocity: {
                x: (Math.random() - 0.5) * 4,
                y: (Math.random() - 0.5) * 4
            },
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            size: options.size || 3,
            alpha: 1
        };

        switch(type) {
            case 'hit':
                baseParticle.decay = Math.random() * 0.05 + 0.05;
                baseParticle.size = Math.random() * 4 + 2;
                break;
            case 'death':
                baseParticle.decay = Math.random() * 0.02 + 0.02;
                baseParticle.size = Math.random() * 6 + 4;
                baseParticle.velocity = {
                    x: (Math.random() - 0.5) * 8,
                    y: (Math.random() - 0.5) * 8
                };
                break;
            case 'trail':
                baseParticle.decay = Math.random() * 0.1 + 0.1;
                baseParticle.size = Math.random() * 3 + 1;
                break;
            case 'upgrade':
                baseParticle.decay = Math.random() * 0.01 + 0.01;
                baseParticle.size = options.size || 6;
                baseParticle.velocity = {
                    x: (Math.random() - 0.5) * 2,
                    y: (Math.random() - 0.5) * 2 - 2  // 向上飘动
                };
                break;
            case 'muzzle':
                baseParticle.decay = Math.random() * 0.1 + 0.1;
                baseParticle.size = Math.random() * 3 + 2;
                baseParticle.velocity = {
                    x: (Math.random() - 0.5) * 6,
                    y: (Math.random() - 0.5) * 6
                };
                break;
            case 'heal':
                baseParticle.decay = Math.random() * 0.02 + 0.02;
                baseParticle.size = Math.random() * 4 + 2;
                baseParticle.velocity = {
                    x: (Math.random() - 0.5) * 2,
                    y: -Math.random() * 2 - 1
                };
                break;
            case 'explosion':
                baseParticle.decay = Math.random() * 0.05 + 0.05;
                baseParticle.size = Math.random() * 6 + 4;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * (options.speed || 8) + (Math.random() - 0.5) * 4,
                    y: Math.sin(options.angle) * (options.speed || 8) + (Math.random() - 0.5) * 4
                };
                break;
            case 'meleeWave':
                baseParticle.decay = Math.random() * 0.1 + 0.1;
                baseParticle.size = Math.random() * 4 + 2;
                const range = options.range || 100;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * range * 0.1,
                    y: Math.sin(options.angle) * range * 0.1
                };
                break;
            case 'energyGather':
                baseParticle.decay = Math.random() * 0.1 + 0.1;
                baseParticle.size = Math.random() * 3 + 2;
                baseParticle.velocity = {
                    x: -Math.cos(options.angle) * 3,
                    y: -Math.sin(options.angle) * 3
                };
                break;
            case 'energyBurst':
                baseParticle.decay = Math.random() * 0.08 + 0.05;
                baseParticle.size = Math.random() * 4 + 3;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                break;
            case 'shockwave':
                baseParticle.decay = Math.random() * 0.05 + 0.05;
                baseParticle.size = Math.random() * 5 + 3;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                break;
            case 'muzzleFlash':
                baseParticle.decay = Math.random() * 0.2 + 0.1;
                baseParticle.size = Math.random() * 4 + 2;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * (Math.random() * 3 + 2),
                    y: Math.sin(options.angle) * (Math.random() * 3 + 2)
                };
                break;
            case 'energyRing':
                baseParticle.decay = 0.1;
                baseParticle.size = options.size;
                baseParticle.velocity = { x: 0, y: 0 };
                baseParticle.isRing = true;
                break;
            case 'explosionRing':
                baseParticle.decay = 0.05;
                baseParticle.size = options.size;
                baseParticle.velocity = { x: 0, y: 0 };
                baseParticle.isRing = true;
                break;
            case 'explosionDebris':
                baseParticle.decay = Math.random() * 0.05 + 0.02;
                baseParticle.size = Math.random() * 4 + 2;
                const debrisAngle = Math.random() * Math.PI * 2;
                baseParticle.velocity = {
                    x: Math.cos(debrisAngle) * options.speed,
                    y: Math.sin(debrisAngle) * options.speed
                };
                break;
            case 'splitEffect':
                baseParticle.decay = Math.random() * 0.1 + 0.05;
                baseParticle.size = Math.random() * 3 + 2;
                const splitAngle = Math.random() * Math.PI * 2;
                baseParticle.velocity = {
                    x: Math.cos(splitAngle) * options.speed,
                    y: Math.sin(splitAngle) * options.speed
                };
                break;
            case 'playerHit':
                baseParticle.decay = Math.random() * 0.1 + 0.1;
                baseParticle.size = Math.random() * 4 + 2;
                baseParticle.velocity = {
                    x: (Math.random() - 0.5) * options.speed,
                    y: (Math.random() - 0.5) * options.speed
                };
                break;
            case 'blood':
                baseParticle.decay = Math.random() * 0.03 + 0.02;
                baseParticle.size = Math.random() * 3 + 2;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                break;
            case 'spark':
                baseParticle.decay = Math.random() * 0.2 + 0.1;
                baseParticle.size = Math.random() * 2 + 1;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                break;
            case 'teleport':
                baseParticle.decay = Math.random() * 0.15 + 0.1;
                baseParticle.size = options.size;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                break;
            case 'teleportRing':
                baseParticle.decay = options.decay;
                baseParticle.size = options.size;
                baseParticle.velocity = { x: 0, y: 0 };
                baseParticle.isRing = true;
                break;
            case 'teleportSpark':
                baseParticle.decay = Math.random() * 0.2 + 0.1;
                baseParticle.size = Math.random() * 2 + 1;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                break;
            case 'charge':
                baseParticle.decay = Math.random() * 0.1 + 0.1;
                baseParticle.size = options.size;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                break;
            case 'armorBreak':
                baseParticle.decay = Math.random() * 0.08 + 0.05;
                baseParticle.size = options.size;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                baseParticle.rotation = Math.random() * Math.PI * 2;
                break;
            case 'healAura':
                baseParticle.decay = 0.05;
                baseParticle.size = options.size;
                baseParticle.velocity = { x: 0, y: 0 };
                baseParticle.isRing = true;
                baseParticle.alpha = 0.3;
                break;
            case 'summonRing':
                baseParticle.decay = 0.08;
                baseParticle.size = options.size;
                baseParticle.velocity = { x: 0, y: 0 };
                baseParticle.isRing = true;
                baseParticle.rotation = Math.random() * Math.PI * 2;
                break;
            case 'summonEnergy':
                baseParticle.decay = Math.random() * 0.1 + 0.05;
                baseParticle.size = Math.random() * 3 + 2;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                break;
            case 'levelUp':
                baseParticle.decay = Math.random() * 0.02 + 0.01;
                baseParticle.size = Math.random() * 8 + 4;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed - 2 // 向上飘动
                };
                baseParticle.glow = true;
                break;
            
            case 'powerUp':
                baseParticle.decay = Math.random() * 0.05 + 0.02;
                baseParticle.size = Math.random() * 5 + 3;
                baseParticle.velocity = {
                    x: (Math.random() - 0.5) * 3,
                    y: (Math.random() - 0.5) * 3
                };
                baseParticle.glow = true;
                baseParticle.pulse = true;
                break;
            
            case 'shieldPulse':
                baseParticle.decay = 0.03;
                baseParticle.size = options.size;
                baseParticle.velocity = { x: 0, y: 0 };
                baseParticle.isRing = true;
                baseParticle.pulse = true;
                baseParticle.alpha = 0.4;
                break;
            case 'bossEnergy':
                baseParticle.decay = Math.random() * 0.03 + 0.02;
                baseParticle.size = options.size;
                baseParticle.velocity = {
                    x: Math.cos(options.angle) * options.speed,
                    y: Math.sin(options.angle) * options.speed
                };
                baseParticle.glow = true;
                baseParticle.pulse = true;
                break;
            
            case 'bossRing':
                baseParticle.decay = options.decay;
                baseParticle.size = options.size;
                baseParticle.velocity = { x: 0, y: 0 };
                baseParticle.isRing = true;
                baseParticle.pulse = true;
                baseParticle.alpha = 0.6;
                break;
            
            case 'shockwave':
                baseParticle.decay = options.decay;
                baseParticle.size = options.size;
                baseParticle.velocity = { x: 0, y: 0 };
                baseParticle.isRing = true;
                baseParticle.alpha = 0.4;
                baseParticle.glow = true;
                break;
        }

        this.list.push(baseParticle);
    },
    
    update() {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const p = this.list[i];
            p.life -= p.decay;
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.rotation += p.rotationSpeed;
            p.velocity.x *= 0.98;
            p.velocity.y *= 0.98;
            
            if (p.life <= 0) {
                this.list.splice(i, 1);
            }
        }
    },
    
    draw(ctx) {
        ctx.save();
        for (const p of this.list) {
            ctx.globalAlpha = p.life * (p.alpha || 1);
            
            // 添加发光效果
            if (p.glow) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = visualEffects.glowIntensity;
            }
            
            // 脉冲效果
            if (p.pulse) {
                const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.2;
                ctx.scale(pulseScale, pulseScale);
            }
            
            // 根据类型绘制不同形状
            if (p.isRing) {
                this.drawRing(ctx, p);
            } else {
                this.drawParticle(ctx, p);
            }
            
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    },

    drawHitParticle(ctx, p) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加光晕效果
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
    },

    drawDeathParticle(ctx, p) {
        // 绘制星形粒子
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const x = Math.cos(angle) * p.size;
            const y = Math.sin(angle) * p.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    },

    drawTrailParticle(ctx, p) {
        ctx.globalAlpha = p.life * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
    },

    drawUpgradeParticle(ctx, p) {
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        
        // 绘制星形
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * p.size;
            const y = Math.sin(angle) * p.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // 添加发光效果
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
    },

    drawParticle(ctx, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // 所有粒子都使用简单的圆形
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        // 添加发光效果
        if (p.glow) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
        }
        
        ctx.fill();
        ctx.restore();
    },

    drawRing(ctx, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        // 绘制主环
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        
        // 添加发光效果
        if (p.glow) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
        }
        
        // 添加渐变
        const gradient = ctx.createRadialGradient(0, 0, p.size * 0.8, 0, 0, p.size * 1.2);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = gradient;
        
        ctx.stroke();
        ctx.restore();
    }
};

// 添加视觉效果配置
const visualEffects = {
    colors: {
        heal: '#2ecc71',
        damage: '#e74c3c',
        upgrade: '#f1c40f',
        energy: '#3498db',
        magic: '#9b59b6'
    },
    glowIntensity: 15,
    trailLength: 15
};

// 僵尸类型
const zombieTypes = {
    normal: { 
        color: '#2ecc71', 
        speed: 0.6,
        health: 12,
        damage: 0.2,
        radius: 20, 
        points: 10 
    },
    fast: { 
        color: '#e74c3c', 
        speed: 1.4,
        health: 8,
        damage: 0.2,
        radius: 15, 
        points: 15 
    },
    tank: { 
        color: '#8e44ad', 
        speed: 0.4,
        health: 35,
        damage: 0.3,
        radius: 30, 
        points: 25 
    },
    explosive: {
        color: '#e67e22',
        speed: 0.8,
        health: 6,
        damage: 0.4,
        radius: 18,
        points: 20,
        explosionRadius: 80,
        explosionDamage: 30
    },
    split: {
        color: '#3498db',
        speed: 0.7,
        health: 12,
        damage: 0.2,
        radius: 25,
        points: 30,
        splitCount: 3
    },
    giant: {
        color: '#7f8c8d',
        speed: 0.3,
        health: 50,
        damage: 0.5,
        radius: 40,
        points: 50,
        stunResistance: true
    },
    teleporter: {
        color: '#9b59b6',
        speed: 1.0,
        health: 15,
        damage: 0.3,
        radius: 20,
        points: 35,
        teleportCooldown: 3000,
        teleportRange: 200
    },
    spawner: {
        color: '#27ae60',
        speed: 0.4,
        health: 30,
        damage: 0.2,
        radius: 25,
        points: 40,
        spawnCooldown: 5000,
        spawnCount: 2
    },
    berserker: {
        color: '#c0392b',
        speed: 0.8,
        health: 20,
        damage: 0.3,
        radius: 22,
        points: 45,
        rageThreshold: 0.5,
        rageSpeedMultiplier: 1.8,
        rageDamageMultiplier: 1.5
    },
    boss: {
        color: '#f1c40f',
        speed: 0.5,
        health: 200,
        damage: 1.0,
        radius: 50,
        points: 100,
        abilities: ['spawn', 'teleport', 'shockwave'],
        abilityCooldown: 8000
    },
    necromancer: {
        color: '#8e44ad',
        speed: 0.5,
        health: 40,
        damage: 0.2,
        radius: 25,
        points: 45,
        reviveCooldown: 6000,
        reviveRange: 150
    },
    swarm: {
        color: '#27ae60',
        speed: 1.2,
        health: 5,
        damage: 0.1,
        radius: 12,
        points: 5,
        packBonus: 0.2
    },
    titan: {
        color: '#7f8c8d',
        speed: 0.25,
        health: 400,
        damage: 2.0,
        radius: 60,
        points: 200,
        resistanceMultiplier: 0.5,
        groundSmashCooldown: 10000
    },
    plague: {
        color: '#2ecc71',
        speed: 0.7,
        health: 30,
        damage: 0.3,
        radius: 22,
        points: 40,
        poisonDamage: 0.1,
        poisonRadius: 100
    },
    armored: {
        color: '#95a5a6',
        speed: 0.5,
        health: 50,
        damage: 0.3,
        radius: 22,
        points: 35,
        armor: 0.5,
        armorBreakThreshold: 0.3
    },
    charger: {
        color: '#d35400',
        speed: 0.7,
        health: 25,
        damage: 0.4,
        radius: 20,
        points: 30,
        chargeCooldown: 5000,
        chargeSpeed: 3,
        chargeDistance: 300
    },
    healer: {
        color: '#27ae60',
        speed: 0.4,
        health: 20,
        damage: 0.1,
        radius: 18,
        points: 40,
        healRadius: 100,
        healAmount: 0.5,
        healInterval: 1000
    },
    summoner: {
        color: '#8e44ad',
        speed: 0.3,
        health: 45,
        damage: 0.2,
        radius: 25,
        points: 50,
        summonCooldown: 8000,
        summonCount: 3,
        summonTypes: ['normal', 'fast']
    },
    shielder: {
        color: '#3498db',
        speed: 0.4,
        health: 60,
        damage: 0.2,
        radius: 28,
        points: 45,
        shieldRadius: 80,
        damageReduction: 0.7
    },
    // 13级解锁 - 死亡收割者
    reaper: {
        color: '#8e44ad',  // 深紫色
        speed: 0.6,
        health: 300,
        damage: 1.5,
        radius: 45,
        points: 150,
        abilities: ['teleport', 'deathAura', 'soulHarvest'],
        abilityCooldown: 6000,
        auraRadius: 120,
        auraDamage: 0.3,
        harvestHeal: 30
    },
    // 14级解锁 - 天启骑士
    apocalypse: {
        color: '#c0392b',  // 深红色
        speed: 0.7,
        health: 350,
        damage: 2.0,
        radius: 48,
        points: 180,
        abilities: ['charge', 'fireStorm', 'earthquake'],
        abilityCooldown: 7000,
        chargeSpeed: 4,
        chargeDistance: 400,
        fireballCount: 8,
        earthquakeRadius: 200
    },
    // 15级解锁 - 虚空统领
    voidlord: {
        color: '#2c3e50',  // 深蓝色
        speed: 0.5,
        health: 400,
        damage: 2.5,
        radius: 50,
        points: 200,
        abilities: ['voidPortal', 'darkMatter', 'dimensionRift'],
        abilityCooldown: 8000,
        portalCount: 3,
        voidDamage: 0.4,
        riftPullForce: 0.8
    }
};

// 游戏状态
let zombies = [];
const keys = { w: false, s: false, a: false, d: false };
const mouse = { x: 0, y: 0 };

// 添加激活码状态
let cheatMode = {
    active: false,
    inputActive: false,
    currentInput: '',
    codes: {
        'owen': {
            description: '自定义等级',
            action: () => {
                const level = prompt('请输入想要的等级 (1-15):');
                if (level && !isNaN(level)) {
                    const newLevel = Math.min(15, Math.max(1, parseInt(level)));
                    const oldLevel = game.level;
                    game.level = newLevel;
                    
                    // 计算血量提升
                    let totalHealthIncrease = 0;
                    for (let i = oldLevel + 1; i <= newLevel; i++) {
                        totalHealthIncrease += 20; // 基础增加20点
                        if (i >= 10) {
                            totalHealthIncrease += 10; // 10级后额外增加10点
                        }
                    }
                    
                    // 应用血量提升
                    player.maxHealth = 100 + totalHealthIncrease; // 100是初始血量
                    player.health = player.maxHealth; // 满血
                    
                    // 应用等级提升带来的所有加成
                    for (let i = oldLevel + 1; i <= newLevel; i++) {
                        // 升级属性
                        player.damage += i >= 10 ? 6 : 4;
                        player.fireRate += i >= 10 ? 1.5 : 1.0;
                        
                        // 升级身法技能
                        player.dash.cooldown = Math.max(800, 
                            player.dash.cooldown - player.dash.upgradeBoost.cooldownReduction - (i >= 10 ? 100 : 0));
                        player.dash.distance += player.dash.upgradeBoost.distanceGrowth;
                        player.dash.speedBoost += player.dash.upgradeBoost.speedGrowth;
                        
                        // 每两级增加一发子弹
                        if (i % 2 === 0) {
                            player.bulletCount += player.bulletGrowth;
                        }
                    }
                    
                    showMessage(`等级已修改为: ${newLevel}\n` +
                               `生命值已提升至: ${player.maxHealth}\n` +
                               `所有属性已相应提升！`);
                    createLevelUpEffect();
                }
            }
        },
        'autoaim': {
            description: '切换自动瞄准',
            action: () => {
                game.autoAim.enabled = !game.autoAim.enabled;
                showMessage(`自动瞄准已${game.autoAim.enabled ? '开启' : '关闭'}\n` +
                           `${game.autoAim.enabled ? '得分将减少20%' : '得分恢复正常'}`);
            }
        }
    }
};

// 修改事件监听器
function setupEventListeners() {
    document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        keys[key] = true;
        
        // 切换控制模式
        if (key === 't') {
            game.control.mode = game.control.mode === 'mouse' ? 'keyboard' : 'mouse';
            showMessage(`已切换至${game.control.mode === 'mouse' ? '鼠标' : '键盘'}控制模式`);
            
            // 切换自动射击
            if (game.control.mode === 'keyboard') {
                if (!game.control.autoShootTimer) {
                    game.control.autoShootTimer = setInterval(() => {
                        if (!game.isOver) shoot();
                    }, 1000 / player.fireRate);
                }
            } else {
                if (game.control.autoShootTimer) {
                    clearInterval(game.control.autoShootTimer);
                    game.control.autoShootTimer = null;
                }
            }
        }
        
        // 现有的按键处理
        switch(key) {
            case ' ':
            case 'j':
                e.preventDefault();
                if (game.control.mode === 'mouse') shoot();
                break;
            case 'k':
            case 'shift':
                e.preventDefault();
                performDash();
                break;
            case 'escape':  // ESC键处理
                e.preventDefault();
                if (cheatMode.inputActive) {
                    cheatMode.inputActive = false;
                    cheatMode.currentInput = '';
                } else {
                    cheatMode.inputActive = true;
                    cheatMode.currentInput = '';
                    showMessage('请输入激活码');
                }
                break;
        }
        
        // 激活码处理
        if (cheatMode.inputActive) {
            if (e.key === 'Enter') {
                checkCheatCode(cheatMode.currentInput.toLowerCase());
                cheatMode.inputActive = false;
                cheatMode.currentInput = '';
            } else if (e.key === 'Backspace') {
                cheatMode.currentInput = cheatMode.currentInput.slice(0, -1);
            } else if (e.key.length === 1) {
                cheatMode.currentInput += e.key;
            }
        }
    });

    document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
    
    // 修改鼠标事件监听
    canvas.addEventListener('mousemove', e => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mousedown', e => {
        e.preventDefault();  // 阻止所有默认鼠标行为
        if (e.button === 0) {  // 左键射击
            shoot();
        } else if (e.button === 2) {  // 右键瞬移
            performDash();
        }
    });
    
    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();  // 阻止右键菜单
    });
    
    canvas.addEventListener('click', e => {
        e.preventDefault();
        if (game.isOver) {
            resetGame();
        }
    });
    
    // 添加触摸事件支持
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouse.x = touch.clientX - rect.left;
        mouse.y = touch.clientY - rect.top;
        
        if (e.touches.length === 1) {  // 单指触摸射击
            shoot();
        } else if (e.touches.length === 2) {  // 双指触摸瞬移
            performDash();
        }
    });
    
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouse.x = touch.clientX - rect.left;
        mouse.y = touch.clientY - rect.top;
    });
}

// 游戏主循环
function gameLoop() {
    if (!game.isOver) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// 更新游戏状态
function update() {
    updatePlayer();
    updateBullets();
    updateZombies();
    updateScreenShake();  // 确保震动更新被调用
    particles.update();
    damageNumbers.update();
    spawnZombies();
    cleanup();
}

// 绘制游戏画面
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    // 应用震动偏移
    if (game.screenShake.active) {
        ctx.translate(
            game.screenShake.offsetX,
            game.screenShake.offsetY
        );
    }
    
    drawGrid();
    drawBullets();
    drawZombies();
    particles.draw(ctx);
    drawPlayer();
    drawEffects();
    drawUI();
    damageNumbers.draw(ctx);
    
    ctx.restore();
}

// 玩家相关函数
function updatePlayer() {
    // 记录历史位置
    const now = Date.now();
    if (now - player.dash.lastTrailTime >= player.dash.trailInterval) {
        player.dash.timeTrail.unshift({
            x: player.x,
            y: player.y,
            health: player.health,
            time: now
        });
        
        // 限制历史记录长度
        if (player.dash.timeTrail.length > player.dash.maxTrailLength) {
            player.dash.timeTrail.pop();
        }
        player.dash.lastTrailTime = now;
    }
    
    // 计算移动方向
    let dx = 0;
    let dy = 0;
    
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    
    // 如果有移动输入，更新最后移动方向
    if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        game.control.lastMoveDirection = {
            x: dx / length,
            y: dy / length
        };
    }
    
    // 更新玩家位置
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    
    // 边界检查
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    
    // 在键盘模式下，更新鼠标位置为移动方向
    if (game.control.mode === 'keyboard') {
        const aimDistance = 100; // 瞄准距离
        mouse.x = player.x + game.control.lastMoveDirection.x * aimDistance;
        mouse.y = player.y + game.control.lastMoveDirection.y * aimDistance;
    }
    
    // 自动瞄准逻辑
    if (game.autoAim.enabled && zombies.length > 0) {
        // 找到最近的僵尸
        let nearestZombie = null;
        let minDistance = Infinity;
        
        for (const zombie of zombies) {
            const dx = zombie.x - player.x;
            const dy = zombie.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestZombie = zombie;
            }
        }
        
        // 更新鼠标位置指向最近的僵尸
        if (nearestZombie) {
            mouse.x = nearestZombie.x;
            mouse.y = nearestZombie.y;
        }
    }
}

// 修改子弹配置
function shoot() {
    const now = Date.now();
    if (now - player.lastShot >= 1000 / player.fireRate) {
        let angle;
        
        if (game.control.mode === 'keyboard') {
            angle = Math.atan2(
                game.control.lastMoveDirection.y,
                game.control.lastMoveDirection.x
            );
        } else {
            angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        }
        
        const baseAngle = angle;
        for (let i = 0; i < player.bulletCount; i++) {
            const spread = (i - (player.bulletCount - 1) / 2) * player.bulletSpread;
            const bulletAngle = baseAngle + spread;
            
            const bullet = {
                x: player.x,
                y: player.y,
                velocity: {
                    x: Math.cos(bulletAngle) * 12,
                    y: Math.sin(bulletAngle) * 12
                },
                radius: 10, // 更大的子弹尺寸
                damage: player.damage,
                trail: [],
                maxTrailLength: 5, // 大幅缩短轨迹长度
                color: '#ff7675',
                secondaryColor: '#fab1a0',
                glow: true,
                age: 0,
                lifetime: 60
            };
            
            player.bullets.push(bullet);
            
            // 发射特效
            createShootEffect(bullet, bulletAngle);
        }
        
        player.lastShot = now;
        shakeScreen(3, 50);
    }
}

function meleeAttack(e) {
    e.preventDefault();  // 防止右键菜单
    
    const now = Date.now();
    if (now - player.melee.lastUse < player.melee.cooldown) return;
    
    performMeleeAttack();
}

// 修改丧尸属性缩放系统
const zombieScaling = {
    healthMultiplier: 1.12,   // 降低生命值增长（原1.15）
    damageMultiplier: 1.08,   // 降低伤害增长（原1.1）
    speedMultiplier: 1.04,    // 降低速度增长（原1.05）
    bossMultiplier: 1.25,     // 降低Boss加成（原1.3）
    
    getScaledStats(baseStats, level) {
        const scaledStats = { ...baseStats };
        
        // 基础属性缩放
        scaledStats.health *= Math.pow(this.healthMultiplier, level - 1);
        scaledStats.damage *= Math.pow(this.damageMultiplier, level - 1);
        scaledStats.speed *= Math.pow(this.speedMultiplier, level - 1);
        
        // Boss属性调整
        if (baseStats.type === 'boss' || baseStats.type === 'titan') {
            scaledStats.health *= this.bossMultiplier;
            scaledStats.damage *= this.bossMultiplier;
            scaledStats.speed *= 0.8;  // 进一步降低Boss速度（原0.85）
        }
        
        // 10级后的额外加成调整
        if (level > 10) {
            const extraLevels = level - 10;
            scaledStats.health *= (1 + extraLevels * 0.15);   // 降低额外生命加成（原0.2）
            scaledStats.damage *= (1 + extraLevels * 0.12);   // 降低额外伤害加成（原0.15）
            scaledStats.speed = Math.min(scaledStats.speed, baseStats.speed * 1.8); // 降低速度上限（原2）
        }
        
        // 降低速度上限
        scaledStats.speed = Math.min(scaledStats.speed, 2.2); // 降低全局速度上限（原2.5）
        
        return scaledStats;
    }
};

// 修改僵尸生成权重，增加普通僵尸的比例
const zombieProgression = {
    weights: {
        1: {  // 1级权重
            normal: 80,    // 提高普通僵尸比例（原70）
            fast: 20       // 降低快速僵尸比例（原30）
        },
        3: {  // 3级权重
            normal: 60,    // 提高普通僵尸比例（原50）
            fast: 25,      // 降低快速僵尸比例（原30）
            split: 10,     // 降低分裂僵尸比例（原15）
            explosive: 5
        },
        5: {  // 5级权重
            normal: 45,    // 提高普通僵尸比例（原35）
            fast: 20,      // 降低快速僵尸比例（原25）
            split: 15,
            explosive: 8,
            giant: 7,
            teleporter: 3,
            swarm: 2
        },
        8: {  // 8级权重
            normal: 35,    // 提高普通僵尸比例（原25）
            fast: 15,      // 降低快速僵尸比例（原20）
            split: 15,
            explosive: 10,
            giant: 10,
            teleporter: 6,
            swarm: 5,
            spawner: 2,
            berserker: 2
        },
        10: {  // 10级权重
            normal: 30,    // 提高普通僵尸比例（原20）
            fast: 12,      // 降低快速僵尸比例（原15）
            split: 10,
            explosive: 10,
            giant: 10,
            teleporter: 8,
            swarm: 7,
            spawner: 5,
            berserker: 4,
            necromancer: 3,
            plague: 1
        },
        13: {  // 13级权重
            normal: 20,
            fast: 10,
            split: 10,
            explosive: 8,
            giant: 10,
            teleporter: 8,
            swarm: 8,
            spawner: 7,
            berserker: 6,
            necromancer: 4,
            plague: 3,
            titan: 2,
            reaper: 4  // 添加死亡收割者
        },
        14: {  // 14级权重
            normal: 18,
            fast: 10,
            split: 8,
            explosive: 8,
            giant: 10,
            teleporter: 8,
            swarm: 8,
            spawner: 7,
            berserker: 6,
            necromancer: 4,
            plague: 3,
            titan: 2,
            reaper: 4,
            apocalypse: 4  // 添加天启骑士
        },
        15: {  // 15级权重
            normal: 15,
            fast: 8,
            split: 8,
            explosive: 8,
            giant: 8,
            teleporter: 8,
            swarm: 8,
            spawner: 7,
            berserker: 6,
            necromancer: 4,
            plague: 3,
            titan: 2,
            reaper: 4,
            apocalypse: 4,
            voidlord: 7  // 添加虚空统领
        }
    },
    
    // 添加 bossLevels 配置
    bossLevels: {
        boss: 5,    // 每5关出现Boss
        titan: 10   // 每10关出现泰坦
    },
    
    // 生成率调整
    spawnRateBase: 0.004,     // 降低基础生成率（原0.005）
    spawnRateIncrease: 0.0008, // 降低每级增长（原0.001）
    spawnRateMax: 0.015       // 降低最大生成率（原0.02）
};

// 修改僵尸生成函数
function spawnZombie(type) {
    const side = Math.floor(Math.random() * 4);
    const pos = getSpawnPosition(side);
    
    // 获取基础属性
    const baseStats = zombieTypes[type];
    
    // 应用等级缩放
    const scaledStats = zombieScaling.getScaledStats(baseStats, game.level);
    
    // 创建僵尸实例
    const zombie = {
        ...scaledStats,
        x: pos.x,
        y: pos.y,
        type: type,
        currentHealth: scaledStats.health
    };
    
    // 特殊僵尸的额外属性
    switch(type) {
        case 'berserker':
            zombie.enraged = false;
            break;
        case 'armored':
            zombie.hasArmor = true;
            break;
        case 'boss':
            zombie.lastAbility = 0;
            break;
        case 'titan':
            zombie.lastSmash = 0;
            zombie.stunResistance = true;
            break;
    }
    
    zombies.push(zombie);
}

// 修改僵尸生成控制函数
function spawnZombies() {
    // 计算当前生成率
    const currentSpawnRate = Math.min(
        zombieProgression.spawnRateBase + (game.level - 1) * zombieProgression.spawnRateIncrease,
        zombieProgression.spawnRateMax
    );
    
    if (zombies.length >= config.game.maxZombies || Math.random() >= currentSpawnRate) return;

    // Boss关卡检查
    if (game.level % zombieProgression.bossLevels.titan === 0 && !game.bossSpawned) {
        spawnZombie('titan');
        game.bossSpawned = true;
        return;
    } else if (game.level % zombieProgression.bossLevels.boss === 0 && !game.bossSpawned) {
        spawnZombie('boss');
        game.bossSpawned = true;
        return;
    }

    // 获取当前等级的权重配置
    let weights = zombieProgression.weights[1];
    for (const level of Object.keys(zombieProgression.weights).sort((a, b) => b - a)) {
        if (game.level >= parseInt(level)) {
            weights = zombieProgression.weights[level];
            break;
        }
    }

    // 根据权重选择僵尸类型
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedType = 'normal';

    for (const [type, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) {
            selectedType = type;
            break;
        }
    }

    spawnZombie(selectedType);
}

// 修改升级检查函数
function checkUpgrade() {
    if (game.killCount >= game.level * game.killsToUpgrade && game.level < 15) {
        const oldLevel = game.level;  // 保存旧等级
        game.level++;
        game.bossSpawned = false;
        
        // 增加升级加成
        player.damage += 4;  // 提高伤害加成（原3）
        player.fireRate += 1.0;  // 提高射速加成（原0.8）
        
        // 提升最大生命值和当前生命值
        const healthIncrease = 20;  // 每级增加20点生命值
        player.maxHealth += healthIncrease;
        player.health = player.maxHealth;  // 升级时恢复满血
        
        // 升级身法技能
        player.dash.cooldown = Math.max(800,  // 降低最小冷却时间（原1000）
            player.dash.cooldown - player.dash.upgradeBoost.cooldownReduction - (game.level >= 10 ? 100 : 0));
        player.dash.distance += player.dash.upgradeBoost.distanceGrowth;
        player.dash.speedBoost = (player.dash.speedBoost || 0) + player.dash.upgradeBoost.speedGrowth;
        player.dash.maxTrailLength += player.dash.upgradeBoost.trailLength; // 增加历史记录长度
        
        // 每两级增加一发子弹
        if (game.level % 2 === 0) {
            player.bulletCount += player.bulletGrowth;
        }
        
        // 10级后额外加成
        if (game.level >= 10) {
            player.damage += 2;  // 额外伤害加成
            player.fireRate += 0.5;  // 额外射速加成
            player.dash.cooldown = Math.max(800, player.dash.cooldown - 100);  // 额外冷却减少
            player.maxHealth += 10;  // 10级后每级额外增加10点生命值
            player.health = player.maxHealth;  // 更新当前生命值
        }
        
        // 显示升级特效
        showUpgradeEffect();
        
        // 显示升级信息
        let upgradeText = `升级! 等级 ${game.level}\n` +
            `生命值 +${game.level >= 10 ? healthIncrease + 10 : healthIncrease}\n` +
            `伤害 +${game.level >= 10 ? '6' : '4'}\n` +
            `射速 +${game.level >= 10 ? '1.5' : '1.0'}\n` +
            `身法冷却 -${player.dash.upgradeBoost.cooldownReduction + (game.level >= 10 ? 100 : 0)}ms\n` +
            `位移距离 +${player.dash.upgradeBoost.distanceGrowth}\n` +
            `位移速度 +${player.dash.upgradeBoost.speedGrowth.toFixed(1)}`;
            
        if (game.level % 2 === 0) {
            upgradeText += '\n子弹数 +1';
        }
        
        if (game.level === 15) {
            upgradeText += '\n\n已达到最高等级！';
        }
        
        showMessage(upgradeText);
    }
}

// 修改重置游戏函数
function resetGame() {
    // 重置玩家状态
    Object.assign(player, {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 20,
        speed: 4,
        health: 100,
        maxHealth: 100,  // 初始血量设为100
        bullets: [],
        damage: 8,
        fireRate: 2.5,
        lastShot: 0,
        bulletCount: 1,
        bulletSpread: 0.2,
        bulletGrowth: 1,
        melee: undefined, // 移除近战属性
        dash: {          // 重置瞬移属性
            active: false,
            cooldown: 3000,    // 冷却时间(ms)
            duration: 300,     // 持续时间(ms)
            distance: 300,     // 增加基础位移距离
            lastUse: 0,
            timeTrail: [],     // 记录历史位置
            maxTrailLength: 180,
            trailInterval: 50,
            lastTrailTime: 0,
            ghostImages: [],
            maxGhostImages: 5,
            invincible: true,
            upgradeBoost: {
                cooldownReduction: 200,
                distanceGrowth: 30,  // 增加每级位移距离提升
                trailLength: 60,
                speedGrowth: 0.2
            }
        }
    });

    // 重置游戏状态
    zombies = [];
    particles.list = [];
    Object.assign(game, {
        score: 0,
        highScore: localStorage.getItem('highScore') || 0,
        lastScore: 0,
        isOver: false,
        level: 1,
        killCount: 0,
        zombieSpawnRate: 0.005,
        killsToUpgrade: 30,
        bossSpawned: false,
        screenShake: {
            active: false,
            intensity: 0,
            duration: 0,
            startTime: 0,
            offsetX: 0,
            offsetY: 0
        },
        shareText: {
            title: '僵尸射击游戏',
            desc: '快来挑战我的分数!',
            imgUrl: 'path/to/share/image.png' // 添加分享图片
        }
    });
    
    // 移除分享按钮
    const shareBtn = document.getElementById('shareScoreButton');
    if (shareBtn) {
        shareBtn.remove();
    }
    
    // 重置控制相关
    if (game.control.autoShootTimer) {
        clearInterval(game.control.autoShootTimer);
        game.control.autoShootTimer = null;
    }
}

// 绘制网格
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 30;

    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// 优化子弹轨迹效果
function updateBullets() {
    for (let i = player.bullets.length - 1; i >= 0; i--) {
        const bullet = player.bullets[i];
        
        // 更新子弹位置
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;
        
        // 记录轨迹
        bullet.trail.push({ x: bullet.x, y: bullet.y });
        if (bullet.trail.length > bullet.maxTrailLength) {
            bullet.trail.shift();
        }
        
        // 检查子弹是否击中僵尸
        let hitZombie = false;
        for (let j = zombies.length - 1; j >= 0; j--) {
            const zombie = zombies[j];
            const dx = zombie.x - bullet.x;
            const dy = zombie.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < zombie.radius + bullet.radius) {
                hitZombie = true;
                
                // 造成伤害
                if (!zombie.currentHealth) zombie.currentHealth = zombie.health;
                zombie.currentHealth -= bullet.damage;
                
                // 创建更炫酷的爆炸效果
                // 1. 主爆炸粒子
                for (let k = 0; k < 20; k++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 8 + 6;
                    particles.create(
                        bullet.x,
                        bullet.y,
                        k % 2 === 0 ? '#ff7675' : '#fab1a0', // 交替使用两种颜色
                        'particle',
                        {
                            angle: angle,
                            speed: speed,
                            size: Math.random() * bullet.radius * 0.7 + bullet.radius * 0.3,
                            decay: 0.1 + Math.random() * 0.1, // 随机衰减速度
                            glow: true,
                            gravity: -0.1 // 轻微向上飘动
                        }
                    );
                }
                
                // 2. 高速火花
                for (let k = 0; k < 8; k++) {
                    const angle = Math.random() * Math.PI * 2;
                    particles.create(
                        bullet.x,
                        bullet.y,
                        '#ffffff', // 白色火花
                        'particle',
                        {
                            angle: angle,
                            speed: Math.random() * 12 + 8, // 更快的速度
                            size: Math.random() * bullet.radius * 0.3 + bullet.radius * 0.1,
                            decay: 0.2,
                            glow: true,
                            shrink: true // 粒子会逐渐缩小
                        }
                    );
                }
                
                // 3. 碎片效果
                for (let k = 0; k < 6; k++) {
                    const angle = Math.random() * Math.PI * 2;
                    particles.create(
                        bullet.x,
                        bullet.y,
                        '#e17055', // 深色碎片
                        'particle',
                        {
                            angle: angle,
                            speed: Math.random() * 7 + 3,
                            size: Math.random() * bullet.radius * 0.4 + bullet.radius * 0.2,
                            decay: 0.15,
                            glow: false, // 碎片不发光
                            gravity: 0.2, // 向下坠落
                            spin: (Math.random() - 0.5) * 0.3 // 旋转效果
                        }
                    );
                }
                
                // 4. 烟雾效果
                for (let k = 0; k < 4; k++) {
                    particles.create(
                        bullet.x,
                        bullet.y,
                        'rgba(255, 255, 255, 0.3)', // 半透明白色
                        'particle',
                        {
                            angle: Math.random() * Math.PI * 2,
                            speed: Math.random() * 2 + 1,
                            size: bullet.radius * (Math.random() * 1.5 + 1),
                            decay: 0.08,
                            glow: false,
                            expand: true, // 粒子会逐渐扩大
                            gravity: -0.05
                        }
                    );
                }
                
                // 添加屏幕震动
                shakeScreen(3, 40);
                
                if (zombie.currentHealth <= 0) {
                    game.score += zombie.points || 10;
                    game.killCount++;
                    handleZombieDeath(zombie);
                    zombies.splice(j, 1);
                    checkUpgrade();
                }
                break;
            }
        }
        
        // 移除击中的子弹或超出边界的子弹
        if (hitZombie || 
            bullet.x < 0 || 
            bullet.x > canvas.width || 
            bullet.y < 0 || 
            bullet.y > canvas.height) {
            player.bullets.splice(i, 1);
        }
    }
}

// 修改子弹绘制函数
function drawBullets() {
    ctx.save();
    
    for (const bullet of player.bullets) {
        // 绘制短尾迹
        if (bullet.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
            
            for (let i = 1; i < bullet.trail.length; i++) {
                ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
            }
            
            const gradient = ctx.createLinearGradient(
                bullet.trail[0].x, bullet.trail[0].y,
                bullet.x, bullet.y
            );
            gradient.addColorStop(0, 'rgba(255, 118, 117, 0)');
            gradient.addColorStop(1, 'rgba(255, 118, 117, 0.3)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = bullet.radius * 1.2;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        // 子弹本体
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        
        // 发光效果
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 15;
        
        // 渐变填充
        const bulletGradient = ctx.createRadialGradient(
            bullet.x - bullet.radius * 0.3, bullet.y - bullet.radius * 0.3, 0,
            bullet.x, bullet.y, bullet.radius
        );
        bulletGradient.addColorStop(0, '#fff');
        bulletGradient.addColorStop(0.4, bullet.secondaryColor);
        bulletGradient.addColorStop(1, bullet.color);
        
        ctx.fillStyle = bulletGradient;
        ctx.fill();
    }
    
    ctx.restore();
}

// 创建枪口闪光效果
function createMuzzleFlash(x, y, angle) {
    // 中心闪光
    particles.create(x, y, '#fff', 'muzzleFlash', {
        size: 15,
        decay: 0.2,
        glow: true
    });
    
    // 能量环
    particles.create(x, y, '#ff7675', 'energyRing', {
        size: 20,
        decay: 0.15,
        glow: true
    });
    
    // 火花
    for (let i = 0; i < 8; i++) {
        const sparkAngle = angle + (Math.random() - 0.5) * 1;
        particles.create(x, y, '#fab1a0', 'spark', {
            angle: sparkAngle,
            speed: Math.random() * 5 + 3,
            size: Math.random() * 3 + 2,
            decay: 0.1,
            glow: true
        });
    }
}

// 增强击中特效
function createEnhancedHitEffect(bullet, zombie) {
    // 爆炸中心
    particles.create(bullet.x, bullet.y, '#fff', 'explosion', {
        size: bullet.radius * 4,
        decay: 0.2,
        glow: true
    });
    
    // 能量环
    particles.create(bullet.x, bullet.y, bullet.color, 'explosionRing', {
        size: bullet.radius * 6,
        decay: 0.15,
        glow: true
    });
    
    // 爆炸碎片
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        particles.create(bullet.x, bullet.y, bullet.secondaryColor, 'explosionDebris', {
            angle: angle,
            speed: Math.random() * 5 + 3,
            size: Math.random() * 4 + 2,
            decay: 0.15,
            glow: true
        });
    }
    
    // 能量散射
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        particles.create(bullet.x, bullet.y, bullet.color, 'energyBurst', {
            angle: angle,
            speed: Math.random() * 4 + 2,
            size: Math.random() * 3 + 2,
            decay: 0.12,
            glow: true
        });
    }
    
    // 冲击波
    particles.create(bullet.x, bullet.y, bullet.color, 'shockwave', {
        size: bullet.radius * 8,
        decay: 0.2,
        glow: true
    });
    
    shakeScreen(4, 60);
}

// 发射特效
function createShootEffect(bullet, angle) {
    // 枪口闪光
    for (let i = 0; i < 4; i++) {
        particles.create(
            bullet.x,
            bullet.y,
            '#fff',
            'muzzleFlash',
            {
                size: bullet.radius * 1.5,
                decay: 0.2,
                glow: true
            }
        );
    }
    
    // 火花效果
    for (let i = 0; i < 3; i++) {
        const sparkAngle = angle + (Math.random() - 0.5) * 0.5;
        particles.create(
            bullet.x,
            bullet.y,
            bullet.color,
            'spark',
            {
                angle: sparkAngle,
                speed: Math.random() * 4 + 2,
                size: Math.random() * bullet.radius * 0.5 + bullet.radius * 0.3,
                decay: 0.15,
                glow: true
            }
        );
    }
}

// 击中特效
function createHitEffect(bullet, zombie) {
    // 只保留纯粹的爆炸粒子效果
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 4;
        particles.create(
            bullet.x,
            bullet.y,
            bullet.color,
            'particle', // 直接使用 'particle' 类型
            {
                angle: angle,
                speed: speed,
                size: Math.random() * bullet.radius * 0.6 + bullet.radius * 0.3,
                decay: 0.2,
                glow: true
            }
        );
    }
    
    // 添加一些小碎片
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            bullet.x,
            bullet.y,
            bullet.secondaryColor,
            'particle',
            {
                angle: angle,
                speed: Math.random() * 8 + 6,
                size: Math.random() * bullet.radius * 0.3 + bullet.radius * 0.2,
                decay: 0.15,
                glow: true
            }
        );
    }
    
    shakeScreen(3, 40);
}

// 绘制僵尸
function drawZombies() {
    for (const zombie of zombies) {
        ctx.save();
        
        // 绘制僵尸主体
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y, zombie.radius, 0, Math.PI * 2);
        ctx.fillStyle = zombie.color;
        ctx.fill();

        // 绘制血条
        const healthPercent = zombie.currentHealth / zombie.health;
        const barWidth = zombie.radius * 2;
        const barHeight = 4;
        const barX = zombie.x - zombie.radius;
        const barY = zombie.y - zombie.radius - 10;

        // 血条背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // 血条
        ctx.fillStyle = `hsl(${healthPercent * 120}, 100%, 50%)`;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        ctx.restore();
    }
}

// 绘制玩家
function drawPlayer() {
    // 先绘制残影
    drawGhostImages();
    
    ctx.save();
    
    // 绘制玩家主体
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
        player.x, player.y, 0,
        player.x, player.y, player.radius
    );
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(1, '#2980b9');
    ctx.fillStyle = gradient;
    ctx.fill();

    // 绘制玩家朝向
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
        player.x + Math.cos(angle) * (player.radius + 10),
        player.y + Math.sin(angle) * (player.radius + 10)
    );
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

// 绘制UI和特效
function drawUI() {
    // 游戏状态UI
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${game.score}`, 20, 30);
    ctx.fillText(`等级: ${game.level}`, 20, 60);
    ctx.fillText(`生命: ${Math.floor(player.health)}`, 20, 90);
    
    // 添加最高分显示
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`最高分: ${game.highScore}`, 20, 120);
    
    ctx.restore();

    // 游戏结束UI
    if (game.isOver) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', canvas.width/2, canvas.height/2 - 50);
        
        ctx.font = '24px Arial';
        ctx.fillText(`得分: ${game.lastScore}`, canvas.width/2, canvas.height/2);
        if (game.lastScore === game.highScore) {
            ctx.fillStyle = '#f1c40f';
            ctx.fillText('新纪录！', canvas.width/2, canvas.height/2 + 30);
        }
        ctx.fillText('点击重新开始', canvas.width/2, canvas.height/2 + 60);
        ctx.restore();
    }

    // 绘制激活码输入框
    if (cheatMode.inputActive) {
        ctx.save();
        
        // 绘制半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制输入框
        ctx.fillStyle = '#2c3e50';
        const boxWidth = 300;
        const boxHeight = 40;
        const boxX = canvas.width / 2 - boxWidth / 2;
        const boxY = canvas.height / 2 - boxHeight / 2;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // 绘制输入的文本
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            cheatMode.currentInput + (Math.floor(Date.now() / 500) % 2 ? '|' : ''),
            canvas.width / 2,
            canvas.height / 2 + 7
        );
        
        // 绘制提示文本
        ctx.fillStyle = '#95a5a6';
        ctx.font = '16px Arial';
        ctx.fillText('按 ESC 取消', canvas.width / 2, boxY + boxHeight + 25);
        
        ctx.restore();
    }
    
    // 添加操作说明
    if (!game.isOver) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('操作说明:', 10, canvas.height - 70);
        ctx.fillText('移动: WASD', 10, canvas.height - 50);
        ctx.fillText('射击: 左键/空格/J', 10, canvas.height - 30);
        ctx.fillText('瞬移: 右键/Shift/K', 10, canvas.height - 10);
        ctx.restore();
    }
    
    // 添加自动瞄准状态显示
    if (game.autoAim.enabled) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('自动瞄准已开启 (-20%得分)', 10, canvas.height - 90);
        ctx.restore();
    }
}

function drawEffects() {
    // 绘制冲刺特效
    if (player.dash.active) {
        ctx.save();
        
        // 绘制冲刺轨迹
        const gradient = ctx.createRadialGradient(
            player.x, player.y, 0,
            player.x, player.y, player.radius * 2
        );
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.2)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0)');
        
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 绘制能量环
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#3498db';
        ctx.shadowBlur = 10;
        ctx.stroke();
        
        ctx.restore();
    }
}

// 获取僵尸生成位置
function getSpawnPosition(side) {
    switch(side) {
        case 0: return { x: Math.random() * canvas.width, y: -30 };
        case 1: return { x: canvas.width + 30, y: Math.random() * canvas.height };
        case 2: return { x: Math.random() * canvas.width, y: canvas.height + 30 };
        case 3: return { x: -30, y: Math.random() * canvas.height };
    }
}

// 获取僵尸类型
function getZombieType() {
    const rand = Math.random();
    const level = game.level;
    
    // Boss关卡
    if (level % 10 === 0) return 'titan';  // 每10关出现泰坦
    if (level % 5 === 0) return 'boss';    // 每5关出现Boss
    
    // 根据等级解锁不同僵尸
    if (level >= 15 && rand < 0.05) return 'titan';
    if (level >= 12 && rand < 0.1) return 'plague';
    if (level >= 10 && rand < 0.15) return 'necromancer';
    if (level >= 8 && rand < 0.2) return 'boss';
    if (level >= 7 && rand < 0.3) return 'berserker';
    if (level >= 6 && rand < 0.4) return 'spawner';
    if (level >= 5) {
        if (rand < 0.2) return 'teleporter';
        if (rand < 0.4) return 'swarm';
    }
    if (level >= 4 && rand < 0.5) return 'giant';
    if (level >= 3 && rand < 0.6) return 'explosive';
    if (level >= 2 && rand < 0.7) return 'split';
    if (level >= 1 && rand < 0.8) return 'fast';
    return 'normal';
}

// 修改近战攻击执行函数
function performMeleeAttack() {
    shakeScreen(8, 200);
    player.melee.active = true;
    player.melee.lastUse = Date.now();

    // 获取当前范围（基础范围 + 等级加成）
    const currentRange = player.melee.range + (game.level - 1) * player.melee.rangeGrowth;
    
    // 创建初始波纹效果
    createMeleeWave(currentRange);
    
    // 检查所有僵尸
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        const dx = zombie.x - player.x;
        const dy = zombie.y - player.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq <= currentRange * currentRange) {
            // 计算击退方向
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(distSq);
            
            // 造成伤害
            zombie.currentHealth -= player.melee.damage;
            
            // 如果僵尸死亡
            if (zombie.currentHealth <= 0) {
                // 创建爆炸效果
                createZombieExplosion(zombie, angle, dist);
                
                // 击杀僵尸
                zombies.splice(i, 1);
                game.score += zombie.points;
                game.killCount++;
                checkHeal();
                checkUpgrade();
                createZombieDeathEffect(zombie);
            } else {
                // 显示伤害数字
                damageNumbers.create(zombie.x, zombie.y, player.melee.damage, 'damage');
                
                // 击中效果
                createHitEffect(zombie);
            }
        }
    }

    // 设置定时器关闭近战动画
    setTimeout(() => {
        player.melee.active = false;
    }, 300);
}

// 添加近战波纹效果函数
function createMeleeWave(range) {
    // 创建主波纹
    for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        particles.create(
            player.x + Math.cos(angle) * range * 0.8,
            player.y + Math.sin(angle) * range * 0.8,
            '#ffffff',
            'meleeWave',
            { 
                angle: angle,
                range: range
            }
        );
    }

    // 创建能量聚集效果
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * range * 0.3;
        particles.create(
            player.x + Math.cos(angle) * distance,
            player.y + Math.sin(angle) * distance,
            '#ffffff',
            'energyGather',
            { range: range }
        );
    }
}

// 添加僵尸爆炸效果函数
function createZombieExplosion(zombie, angle, distance) {
    // 创建爆炸核心
    for (let i = 0; i < 15; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            zombie.color,
            'explosion',
            {
                angle: angle + (Math.random() - 0.5) * Math.PI,
                speed: Math.random() * 8 + 4
            }
        );
    }

    // 创建能量溢出效果
    for (let i = 0; i < 10; i++) {
        const particleAngle = Math.random() * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#ffffff',
            'energyBurst',
            {
                angle: particleAngle,
                speed: Math.random() * 3 + 2
            }
        );
    }

    // 创建冲击波
    for (let i = 0; i < 8; i++) {
        const shockwaveAngle = (i / 8) * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            zombie.color,
            'shockwave',
            {
                angle: shockwaveAngle,
                speed: 5
            }
        );
    }
}

// 添加击中效果函数
function createHitEffect(zombie) {
    for (let i = 0; i < 8; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            zombie.color,
            'hit',
            {
                speed: Math.random() * 3 + 2
            }
        );
    }
}

// 添加升级特效函数
function showUpgradeEffect() {
    // 创建升级光环粒子
    for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const distance = 50;
        particles.create(
            player.x + Math.cos(angle) * distance,
            player.y + Math.sin(angle) * distance,
            '#f1c40f',  // 金色
            'upgrade',
            { size: 6 }
        );
    }
    
    // 播放升级音效（可选）
    playUpgradeSound();
}

// 游戏结束
function gameOver() {
    game.isOver = true;
    game.lastScore = game.score;
    
    // 更新最高分
    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem('highScore', game.score);
        showMessage('新纪录！');
    }
    
    // 显示分享按钮
    showShareButton();
}

// 添加分享按钮显示函数
function showShareButton() {
    const shareBtn = document.createElement('button');
    shareBtn.id = 'shareScoreButton'; // 添加id
    shareBtn.innerHTML = '分享成绩';
    shareBtn.style.position = 'absolute';
    shareBtn.style.left = '50%';
    shareBtn.style.top = '60%';
    shareBtn.style.transform = 'translate(-50%, -50%)';
    shareBtn.style.padding = '10px 20px';
    shareBtn.style.fontSize = '18px';
    shareBtn.style.backgroundColor = '#3498db';
    shareBtn.style.color = 'white';
    shareBtn.style.border = 'none';
    shareBtn.style.borderRadius = '5px';
    shareBtn.style.cursor = 'pointer';
    shareBtn.style.zIndex = '1000';
    
    shareBtn.onclick = shareScore;
    document.body.appendChild(shareBtn);
}

// 添加分享功能
function shareScore() {
    const shareText = `
    ${game.shareText.title}
    我在游戏中获得了 ${game.lastScore} 分！
    最高记录：${game.highScore} 分
    ${game.shareText.desc}
    `;
    
    // 检查是否支持原生分享API
    if (navigator.share) {
        navigator.share({
            title: game.shareText.title,
            text: shareText,
            url: window.location.href
        }).catch(err => {
            console.log('分享失败:', err);
            fallbackShare(shareText);
        });
    } else {
        fallbackShare(shareText);
    }
}

// 添加后备分享方案
function fallbackShare(shareText) {
    // 创建临时输入框
    const textarea = document.createElement('textarea');
    textarea.value = shareText;
    document.body.appendChild(textarea);
    
    // 选择文本
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    
    // 复制文本
    try {
        document.execCommand('copy');
        showMessage('分享文本已复制到剪贴板');
    } catch (err) {
        console.log('复制失败:', err);
        showMessage('分享失败，请手动复制');
    }
    
    document.body.removeChild(textarea);
}

// 显示消息
function showMessage(text) {
    const msg = document.createElement('div');
    msg.style.position = 'absolute';
    msg.style.top = '50%';
    msg.style.left = '50%';
    msg.style.transform = 'translate(-50%, -50%)';
    msg.style.color = '#f1c40f';  // 金色
    msg.style.fontSize = '24px';
    msg.style.fontWeight = 'bold';
    msg.style.textAlign = 'center';
    msg.style.textShadow = '0 0 10px rgba(241, 196, 15, 0.5)';
    msg.style.transition = 'all 0.3s ease-out';
    msg.style.opacity = '0';
    msg.innerHTML = text.replace(/\n/g, '<br>');
    document.body.appendChild(msg);
    
    // 添加动画效果
    requestAnimationFrame(() => {
        msg.style.opacity = '1';
        msg.style.transform = 'translate(-50%, -60%)';
    });
    
    setTimeout(() => {
        msg.style.opacity = '0';
        msg.style.transform = 'translate(-50%, -70%)';
        setTimeout(() => msg.remove(), 300);
    }, 2000);
}

// 可选：添加升级音效
function playUpgradeSound() {
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';
    audio.volume = 0.3;
    audio.play().catch(() => {});
}

// 添加震动函数
function shakeScreen(intensity, duration) {
    // 如果新的震动更强，则覆盖当前震动
    if (!game.screenShake.active || intensity > game.screenShake.intensity) {
        game.screenShake = {
            active: true,
            intensity,
            duration,
            startTime: Date.now(),
            offsetX: 0,
            offsetY: 0
        };
    }
}

// 更新震动效果
function updateScreenShake() {
    if (!game.screenShake.active) return;
    
    const elapsed = Date.now() - game.screenShake.startTime;
    if (elapsed >= game.screenShake.duration) {
        game.screenShake.active = false;
        game.screenShake.offsetX = 0;
        game.screenShake.offsetY = 0;
        return;
    }
    
    const progress = elapsed / game.screenShake.duration;
    const intensity = game.screenShake.intensity * (1 - progress);
    
    game.screenShake.offsetX = (Math.random() - 0.5) * 2 * intensity;
    game.screenShake.offsetY = (Math.random() - 0.5) * 2 * intensity;
}

// 添加伤害数字类
const damageNumbers = {
    list: [],
    
    create(x, y, amount, type = 'damage') {
        const number = {
            x,
            y,
            amount: Math.round(amount),
            type,
            life: 1,
            velocity: {
                x: (Math.random() - 0.5) * 2,
                y: -3
            }
        };
        this.list.push(number);
    },
    
    update() {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const num = this.list[i];
            num.life -= 0.02;
            num.y += num.velocity.y;
            num.x += num.velocity.x;
            num.velocity.y += 0.1;  // 重力效果
            
            if (num.life <= 0) {
                this.list.splice(i, 1);
            }
        }
    },
    
    draw(ctx) {
        ctx.save();
        for (const num of this.list) {
            ctx.globalAlpha = num.life;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            
            if (num.type === 'damage') {
                ctx.fillStyle = '#e74c3c';
                ctx.strokeStyle = '#c0392b';
            } else if (num.type === 'heal') {
                ctx.fillStyle = '#2ecc71';
                ctx.strokeStyle = '#27ae60';
            }
            
            ctx.strokeText(num.amount, num.x, num.y);
            ctx.fillText(num.amount, num.x, num.y);
        }
        ctx.restore();
    }
};

// 添加回血机制
function checkHeal() {
    if (game.killCount > 0 && game.killCount % player.killsToHeal === 0) {
        healPlayer(player.healAmount);
    }
}

function healPlayer(amount) {
    const oldHealth = player.health;
    player.health = Math.min(player.maxHealth, player.health + amount);
    const healedAmount = player.health - oldHealth;
    
    if (healedAmount > 0) {
        // 显示回血数字
        damageNumbers.create(player.x, player.y - 30, healedAmount, 'heal');
        
        // 添加回血特效
        for (let i = 0; i < 20; i++) {
            particles.create(
                player.x + (Math.random() - 0.5) * 40,
                player.y + (Math.random() - 0.5) * 40,
                '#2ecc71',
                'heal'
            );
        }
    }
}

// 添加射击特效
function createShootEffect(bullet, angle) {
    // 枪口闪光
    for (let i = 0; i < 8; i++) {
        particles.create(
            player.x + Math.cos(angle) * player.radius,
            player.y + Math.sin(angle) * player.radius,
            bullet.color,
            'muzzleFlash',
            { angle: angle }
        );
    }
    
    // 能量波纹
    for (let i = 0; i < 3; i++) {
        particles.create(
            player.x,
            player.y,
            bullet.color,
            'energyRing',
            { size: player.radius * (1 + i * 0.2) }
        );
    }
}

// 修改僵尸死亡效果
function createZombieDeathEffect(zombie) {
    // 爆炸粒子效果
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 4;
        const size = Math.random() * 4 + 2;
        
        // 主要碎片
        particles.create(
            zombie.x,
            zombie.y,
            zombie.color,
            'death',
            {
                angle: angle,
                speed: speed,
                size: size,
                glow: true,
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                }
            }
        );
        
        // 额外的白色火花
        if (i % 3 === 0) {
            particles.create(
                zombie.x,
                zombie.y,
                '#ffffff',
                'spark',
                {
                    angle: angle + Math.random() * 0.5,
                    speed: speed * 1.2,
                    size: size * 0.5,
                    glow: true,
                    velocity: {
                        x: Math.cos(angle) * speed * 1.2,
                        y: Math.sin(angle) * speed * 1.2
                    }
                }
            );
        }
    }

    // 只保留爆炸型僵尸的特殊效果
    if (zombie.type === 'explosive') {
        // 额外的爆炸粒子
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 8;
            particles.create(
                zombie.x,
                zombie.y,
                '#e67e22',
                'explosionDebris',
                {
                    angle: angle,
                    speed: speed,
                    size: Math.random() * 5 + 3,
                    glow: true,
                    velocity: {
                        x: Math.cos(angle) * speed,
                        y: Math.sin(angle) * speed
                    }
                }
            );
        }

        // 额外的火花效果
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 6;
            particles.create(
                zombie.x,
                zombie.y,
                '#ffffff',
                'spark',
                {
                    angle: angle,
                    speed: speed,
                    size: Math.random() * 3 + 1,
                    glow: true,
                    velocity: {
                        x: Math.cos(angle) * speed,
                        y: Math.sin(angle) * speed
                    }
                }
            );
        }

        shakeScreen(12, 300);
    } else {
        // 普通僵尸的震动效果
        shakeScreen(zombie.radius * 0.2, 150);
    }
}

// 添加玩家受伤效果
function createPlayerHitEffect() {
    // 受伤闪烁
    for (let i = 0; i < 20; i++) {
        particles.create(
            player.x + (Math.random() - 0.5) * player.radius * 2,
            player.y + (Math.random() - 0.5) * player.radius * 2,
            '#e74c3c',
            'playerHit',
            { speed: Math.random() * 5 + 2 }
        );
    }
    
    // 血液飞溅
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            player.x,
            player.y,
            '#c0392b',
            'blood',
            {
                angle: angle,
                speed: Math.random() * 4 + 2
            }
        );
    }
}

// 添加僵尸特殊能力更新函数
function updateZombieAbilities(zombie) {
    const now = Date.now();
    
    switch(zombie.type) {
        case 'teleporter':
            if (!zombie.lastTeleport || now - zombie.lastTeleport >= zombieTypes.teleporter.teleportCooldown) {
                if (Math.random() < 0.1) {  // 10%几率触发传送
                    // 消失特效
                    createTeleportEffect(zombie, false);
                    
                    // 计算新位置
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * zombieTypes.teleporter.teleportRange;
                    zombie.x += Math.cos(angle) * distance;
                    zombie.y += Math.sin(angle) * distance;
                    
                    // 出现特效
                    createTeleportEffect(zombie, true);
                    
                    zombie.lastTeleport = now;
                }
            }
            break;
            
        case 'spawner':
            if (!zombie.lastSpawn || now - zombie.lastSpawn >= zombieTypes.spawner.spawnCooldown) {
                for (let i = 0; i < zombieTypes.spawner.spawnCount; i++) {
                    spawnMinion(zombie);
                }
                zombie.lastSpawn = now;
            }
            break;
            
        case 'berserker':
            if (zombie.currentHealth <= zombie.health * zombieTypes.berserker.rageThreshold && !zombie.enraged) {
                zombie.enraged = true;
                zombie.speed *= zombieTypes.berserker.rageSpeedMultiplier;
                zombie.damage *= zombieTypes.berserker.rageDamageMultiplier;
                createRageEffect(zombie);
            }
            break;
            
        case 'boss':
            if (!zombie.lastAbility || now - zombie.lastAbility >= zombieTypes.boss.abilityCooldown) {
                const ability = zombieTypes.boss.abilities[Math.floor(Math.random() * zombieTypes.boss.abilities.length)];
                useBossAbility(zombie, ability);
                zombie.lastAbility = now;
            }
            break;
            
        case 'necromancer':
            if (!zombie.lastRevive || now - zombie.lastRevive >= zombieTypes.necromancer.reviveCooldown) {
                // 复活附近的死亡僵尸
                createReviveEffect(zombie);
                zombie.lastRevive = now;
            }
            break;
            
        case 'swarm':
            // 检查附近的同类数量
            let nearbySwarms = 0;
            for (const other of zombies) {
                if (other !== zombie && other.type === 'swarm') {
                    const dx = other.x - zombie.x;
                    const dy = other.y - zombie.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 100 * 100) {
                        nearbySwarms++;
                    }
                }
            }
            // 更新速度加成
            zombie.speed = zombieTypes.swarm.speed * (1 + zombieTypes.swarm.packBonus * nearbySwarms);
            break;
            
        case 'titan':
            if (!zombie.lastSmash || now - zombie.lastSmash >= zombieTypes.titan.groundSmashCooldown) {
                if (Math.random() < 0.2) {  // 20%几率使用地面震击
                    createGroundSmashEffect(zombie);
                    shakeScreen(20, 800);
                    zombie.lastSmash = now;
                }
            }
            break;
            
        case 'plague':
            // 持续对范围内的玩家造成毒素伤害
            const dx = player.x - zombie.x;
            const dy = player.y - zombie.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < zombieTypes.plague.poisonRadius * zombieTypes.plague.poisonRadius) {
                player.health -= zombieTypes.plague.poisonDamage;
                createPoisonEffect(zombie);
            }
            break;
            
        case 'armored':
            if (zombie.currentHealth <= zombie.health * zombie.armorBreakThreshold && zombie.hasArmor) {
                zombie.hasArmor = false;
                createArmorBreakEffect(zombie);
            }
            break;
            
        case 'charger':
            if (!zombie.charging && (!zombie.lastCharge || now - zombie.lastCharge >= zombie.chargeCooldown)) {
                const dx = player.x - zombie.x;
                const dy = player.y - zombie.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < zombie.chargeDistance && dist > 50) {
                    zombie.charging = true;
                    zombie.chargeAngle = Math.atan2(dy, dx);
                    zombie.lastCharge = now;
                    createChargeEffect(zombie);
                }
            }
            if (zombie.charging) {
                zombie.x += Math.cos(zombie.chargeAngle) * zombie.speed * zombie.chargeSpeed;
                zombie.y += Math.sin(zombie.chargeAngle) * zombie.speed * zombie.chargeSpeed;
            }
            break;
            
        case 'healer':
            if (!zombie.lastHeal || now - zombie.lastHeal >= zombie.healInterval) {
                healNearbyZombies(zombie);
                zombie.lastHeal = now;
            }
            break;
            
        case 'summoner':
            if (!zombie.lastSummon || now - zombie.lastSummon >= zombie.summonCooldown) {
                for (let i = 0; i < zombie.summonCount; i++) {
                    const type = zombie.summonTypes[Math.floor(Math.random() * zombie.summonTypes.length)];
                    spawnMinion(zombie, type);
                }
                zombie.lastSummon = now;
                createSummonEffect(zombie);
            }
            break;
            
        case 'shielder':
            // 为范围内的僵尸提供护盾
            for (const other of zombies) {
                if (other !== zombie) {
                    const dx = other.x - zombie.x;
                    const dy = other.y - zombie.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < zombie.shieldRadius) {
                        other.shielded = true;
                    } else {
                        other.shielded = false;
                    }
                }
            }
            break;
        case 'reaper':
            if (!zombie.lastAbility || now - zombie.lastAbility >= zombieTypes.reaper.abilityCooldown) {
                const ability = zombieTypes.reaper.abilities[Math.floor(Math.random() * zombieTypes.reaper.abilities.length)];
                useReaperAbility(zombie, ability);
                zombie.lastAbility = now;
            }
            // 持续伤害光环
            const auraRadius = zombieTypes.reaper.auraRadius;
            if (getDistance(player, zombie) <= auraRadius) {
                player.health -= zombieTypes.reaper.auraDamage;
                createDeathAuraEffect(zombie);
            }
            break;
            
        case 'apocalypse':
            if (!zombie.lastAbility || now - zombie.lastAbility >= zombieTypes.apocalypse.abilityCooldown) {
                const ability = zombieTypes.apocalypse.abilities[Math.floor(Math.random() * zombieTypes.apocalypse.abilities.length)];
                useApocalypseAbility(zombie, ability);
                zombie.lastAbility = now;
            }
            break;
            
        case 'voidlord':
            if (!zombie.lastAbility || now - zombie.lastAbility >= zombieTypes.voidlord.abilityCooldown) {
                const ability = zombieTypes.voidlord.abilities[Math.floor(Math.random() * zombieTypes.voidlord.abilities.length)];
                useVoidlordAbility(zombie, ability);
                zombie.lastAbility = now;
            }
            // 虚空伤害区域
            if (zombie.voidZones) {
                updateVoidZones(zombie);
            }
            break;
    }
}

// 添加Boss技能函数
function useBossAbility(boss, ability) {
    switch(ability) {
        case 'spawn':
            for (let i = 0; i < 5; i++) {
                spawnMinion(boss);
            }
            break;
            
        case 'teleport':
            const angle = Math.random() * Math.PI * 2;
            const distance = 150;
            boss.x = player.x + Math.cos(angle) * distance;
            boss.y = player.y + Math.sin(angle) * distance;
            createTeleportEffect(boss);
            break;
            
        case 'shockwave':
            createShockwaveEffect(boss);
            shakeScreen(15, 500);
            // 对范围内的玩家造成伤害
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
                player.health -= 20;
                createPlayerHitEffect();
            }
            break;
    }
}

// 添加缺失的特效函数
function createTeleportEffect(zombie, isAppearing = true) {
    const particleCount = 30;
    const baseColor = '#9b59b6';
    
    // 创建传送门效果
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = zombie.radius * (isAppearing ? 1.5 : 1);
        const x = zombie.x + Math.cos(angle) * distance;
        const y = zombie.y + Math.sin(angle) * distance;
        
        particles.create(
            x, y,
            baseColor,
            'teleport',
            {
                angle: angle,
                speed: isAppearing ? 2 : 4,
                size: Math.random() * 3 + 2
            }
        );
    }

    // 创建能量波纹
    for (let i = 0; i < 2; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            baseColor,
            'teleportRing',
            { 
                size: zombie.radius * (2 + i),
                decay: 0.1
            }
        );
    }

    // 添加闪光效果
    for (let i = 0; i < 8; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#ffffff',
            'teleportSpark',
            {
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 5 + 3
            }
        );
    }

    // 添加震动效果
    shakeScreen(3, 100);
}

function createRageEffect(zombie) {
    // 狂暴特效
    for (let i = 0; i < 30; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#e74c3c',
            'rage',
            {
                speed: Math.random() * 6 + 4
            }
        );
    }
    shakeScreen(5, 200);
}

function createShockwaveEffect(zombie) {
    // 冲击波特效
    for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#f1c40f',
            'shockwave',
            {
                angle: angle,
                speed: 8
            }
        );
    }
}

function spawnMinion(parent) {
    const type = 'normal';
    const angle = Math.random() * Math.PI * 2;
    const distance = parent.radius + zombieTypes[type].radius + 10;
    
    zombies.push({
        ...zombieTypes[type],
        x: parent.x + Math.cos(angle) * distance,
        y: parent.y + Math.sin(angle) * distance,
        currentHealth: zombieTypes[type].health,
        type: type
    });
}

// 修改 updateZombies 函数
function updateZombies() {
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        
        // 更新特殊能力
        updateZombieAbilities(zombie);
        
        // 移动向玩家
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            zombie.x += (dx / dist) * zombie.speed;
            zombie.y += (dy / dist) * zombie.speed;
        }
        
        // 检查与玩家碰撞
        if (dist < player.radius + zombie.radius) {
            player.health -= zombie.damage;
            
            // 添加玩家受伤效果
            createPlayerHitEffect();
            shakeScreen(8, 200);  // 受伤震动
            
            if (player.health <= 0) {
                gameOver();
            }
        }
        
        // 检查子弹碰撞
        for (let j = player.bullets.length - 1; j >= 0; j--) {
            const bullet = player.bullets[j];
            const bulletDx = bullet.x - zombie.x;
            const bulletDy = bullet.y - zombie.y;
            const bulletDist = Math.sqrt(bulletDx * bulletDx + bulletDy * bulletDy);
            
            if (bulletDist < zombie.radius + bullet.radius) {
                zombie.currentHealth -= bullet.damage;
                player.bullets.splice(j, 1);
                
                // 添加击中效果
                createHitEffect(zombie, bullet);
                shakeScreen(3, 50);  // 击中震动
                
                if (zombie.currentHealth <= 0) {
                    zombies.splice(i, 1);
                    // 根据自动瞄准状态调整得分
                    const scoreGain = zombie.points * (game.autoAim.enabled ? game.autoAim.scoreMultiplier : 1);
                    game.score += Math.floor(scoreGain);
                    game.killCount++;
                    createZombieDeathEffect(zombie);
                    shakeScreen(5, 100);
                    checkHeal();
                    checkUpgrade();
                    break;
                }
            }
        }
    }
}

// 优化键盘控制模式
function updatePlayer() {
    // ... 现有的历史位置记录代码 ...
    
    // 计算移动方向
    let dx = 0;
    let dy = 0;
    
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    
    // 如果有移动输入，更新最后移动方向
    if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        game.control.lastMoveDirection = {
            x: dx / length,
            y: dy / length
        };
        
        // 平滑移动
        player.x += (dx / length) * player.speed;
        player.y += (dy / length) * player.speed;
    } else if (game.control.mode === 'keyboard') {
        // 当停止移动时，保持最后的射击方向
        // 可以通过方向键调整射击方向
        if (keys.arrowup) game.control.lastMoveDirection.y -= 0.1;
        if (keys.arrowdown) game.control.lastMoveDirection.y += 0.1;
        if (keys.arrowleft) game.control.lastMoveDirection.x -= 0.1;
        if (keys.arrowright) game.control.lastMoveDirection.x += 0.1;
        
        // 标准化方向向量
        const length = Math.sqrt(
            game.control.lastMoveDirection.x * game.control.lastMoveDirection.x + 
            game.control.lastMoveDirection.y * game.control.lastMoveDirection.y
        );
        if (length > 0) {
            game.control.lastMoveDirection.x /= length;
            game.control.lastMoveDirection.y /= length;
        }
    }
    
    // 边界检查
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    
    // 在键盘模式下，更新瞄准位置
    if (game.control.mode === 'keyboard') {
        const aimDistance = 100;
        mouse.x = player.x + game.control.lastMoveDirection.x * aimDistance;
        mouse.y = player.y + game.control.lastMoveDirection.y * aimDistance;
    }
    
    // ... 其他现有代码 ...
}

function updateScreenShake() {
    if (game.screenShake.active) {
        const elapsed = Date.now() - game.screenShake.startTime;
        if (elapsed < game.screenShake.duration) {
            const progress = elapsed / game.screenShake.duration;
            const intensity = game.screenShake.intensity * (1 - progress);
            game.screenShake.offsetX = (Math.random() - 0.5) * intensity;
            game.screenShake.offsetY = (Math.random() - 0.5) * intensity;
        } else {
            game.screenShake.active = false;
            game.screenShake.offsetX = 0;
            game.screenShake.offsetY = 0;
        }
    }
}

function cleanup() {
    // 清理出界的子弹
    player.bullets = player.bullets.filter(bullet => 
        bullet.x >= 0 && bullet.x <= canvas.width &&
        bullet.y >= 0 && bullet.y <= canvas.height
    );
    
    // 清理出界的僵尸
    const margin = 50;
    zombies = zombies.filter(zombie =>
        zombie.x >= -margin && zombie.x <= canvas.width + margin &&
        zombie.y >= -margin && zombie.y <= canvas.height + margin
    );
}

// 添加新僵尸的特效函数
function createChargeEffect(zombie) {
    // 冲锋预警效果
    for (let i = 0; i < 20; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#d35400',
            'charge',
            {
                angle: zombie.chargeAngle,
                speed: Math.random() * 3 + 2,
                size: Math.random() * 4 + 2
            }
        );
    }
    shakeScreen(4, 150);
}

function createArmorBreakEffect(zombie) {
    // 护甲破碎效果
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#95a5a6',
            'armorBreak',
            {
                angle: angle,
                speed: Math.random() * 6 + 3,
                size: Math.random() * 4 + 2
            }
        );
    }
    shakeScreen(3, 100);
}

function healNearbyZombies(healer) {
    // 治疗范围效果
    for (const zombie of zombies) {
        if (zombie !== healer) {
            const dx = zombie.x - healer.x;
            const dy = zombie.y - healer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < healer.healRadius) {
                zombie.currentHealth = Math.min(zombie.health, zombie.currentHealth + healer.healAmount);
                createHealEffect(zombie);
            }
        }
    }
    
    // 治疗光环效果
    particles.create(
        healer.x,
        healer.y,
        '#27ae60',
        'healAura',
        { size: healer.healRadius }
    );
}

function createHealEffect(zombie) {
    // 治疗粒子效果
    for (let i = 0; i < 8; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#2ecc71',
            'heal',
            {
                speed: Math.random() * 2 + 1,
                size: Math.random() * 3 + 2
            }
        );
    }
}

function createSummonEffect(summoner) {
    // 召唤法阵效果
    for (let i = 0; i < 2; i++) {
        particles.create(
            summoner.x,
            summoner.y,
            '#8e44ad',
            'summonRing',
            { size: summoner.radius * (2 + i) }
        );
    }
    
    // 召唤能量效果
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        particles.create(
            summoner.x,
            summoner.y,
            '#9b59b6',
            'summonEnergy',
            {
                angle: angle,
                speed: Math.random() * 4 + 2
            }
        );
    }
}

// 添加升级特效
function createLevelUpEffect() {
    // 创建环形光波
    for (let i = 0; i < 3; i++) {
        particles.create(
            player.x,
            player.y,
            '#f1c40f',
            'levelRing',
            {
                size: player.radius * (2 + i),
                decay: 0.05
            }
        );
    }
    
    // 创建上升的星星粒子
    for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        const distance = Math.random() * 50 + 30;
        particles.create(
            player.x + Math.cos(angle) * distance,
            player.y + Math.sin(angle) * distance,
            '#f39c12',
            'levelUp',
            {
                angle: -Math.PI/2 + (Math.random() - 0.5) * 0.5,
                speed: Math.random() * 3 + 2,
                size: Math.random() * 6 + 3,
                glow: true
            }
        );
    }
    
    // 创建能量爆发效果
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            player.x,
            player.y,
            '#e67e22',
            'energyBurst',
            {
                angle: angle,
                speed: Math.random() * 8 + 4,
                size: Math.random() * 4 + 2,
                glow: true
            }
        );
    }
    
    // 添加屏幕震动
    shakeScreen(8, 300);
}

// 修改护盾效果
function drawShieldEffect(zombie) {
    if (zombie.shielded) {
        ctx.save();
        const gradient = ctx.createRadialGradient(
            zombie.x, zombie.y, zombie.radius,
            zombie.x, zombie.y, zombie.radius * 1.5
        );
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.2)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0)');
        
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y, zombie.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 添加护盾边缘
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y, zombie.radius * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#3498db';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
    }
}

// 添加身法技能执行函数
function performDash() {
    const now = Date.now();
    if (now - player.dash.lastUse < player.dash.cooldown) return;
    
    player.dash.active = true;
    player.dash.lastUse = now;
    
    // 计算位移方向和目标位置
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const startPos = {x: player.x, y: player.y};
    
    // 计算目标位置，但要考虑墙壁碰撞
    const targetX = Math.max(
        player.radius,
        Math.min(
            canvas.width - player.radius,
            player.x + Math.cos(angle) * player.dash.distance
        )
    );
    const targetY = Math.max(
        player.radius,
        Math.min(
            canvas.height - player.radius,
            player.y + Math.sin(angle) * player.dash.distance
        )
    );
    
    // 创建时空裂缝特效
    createTimeRewindEffect(startPos);
    
    // 记录当前血量
    const startHealth = player.health;
    
    // 执行位移动画
    const startTime = now;
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / player.dash.duration, 1);
        
        // 使用缓动函数使移动更流畅
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        player.x = startPos.x + (targetX - startPos.x) * easeProgress;
        player.y = startPos.y + (targetY - startPos.y) * easeProgress;
        
        // 添加时间轨迹特效
        if (progress < 1) {
            createTimeTrailEffect(player.x, player.y);
            
            // 在位移过程中无敌
            player.dash.invincible = true;
            
            requestAnimationFrame(animate);
        } else {
            player.dash.active = false;
            player.dash.invincible = false;
            
            // 如果位移后血量低于开始时，恢复一些血量
            if (player.health < startHealth) {
                const healAmount = Math.min(
                    player.maxHealth - player.health,
                    (startHealth - player.health) * 0.5  // 恢复损失血量的50%
                );
                if (healAmount > 0) {
                    player.health += healAmount;
                    createHealEffect(player.x, player.y, healAmount);
                }
            }
            
            createTimeRewindEndEffect(player.x, player.y);
        }
    };
    
    animate();
    shakeScreen(3, 100);
}

// 添加治疗特效
function createHealEffect(x, y, amount) {
    // 创建治疗数字
    damageNumbers.create(
        x,
        y,
        `+${Math.round(amount)}`,
        '#2ecc71'
    );
    
    // 创建治疗粒子
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            x,
            y,
            '#2ecc71',
            'heal',
            {
                angle: angle,
                speed: Math.random() * 3 + 2,
                size: Math.random() * 4 + 2,
                glow: true
            }
        );
    }
}

// 添加残影绘制函数
function drawGhostImages() {
    const now = Date.now();
    player.dash.ghostImages = player.dash.ghostImages.filter(ghost => {
        const age = now - ghost.time;
        ghost.opacity = Math.max(0, 0.6 - age * 0.003);
        
        if (ghost.opacity > 0) {
            ctx.save();
            ctx.globalAlpha = ghost.opacity;
            ctx.beginPath();
            ctx.arc(ghost.x, ghost.y, player.radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
                ghost.x, ghost.y, 0,
                ghost.x, ghost.y, player.radius
            );
            gradient.addColorStop(0, '#3498db80');
            gradient.addColorStop(1, '#3498db00');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
            return true;
        }
        return false;
    });
}

// 添加身法特效函数
function createDashEffect(x, y, angle) {
    // 开始位移特效
    for (let i = 0; i < 20; i++) {
        particles.create(x, y, '#3498db', 'dash', {
            angle: angle + (Math.random() - 0.5) * 1,
            speed: Math.random() * 8 + 4,
            size: Math.random() * 4 + 2
        });
    }
}

function createDashEndEffect(x, y) {
    // 结束位移特效
    for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2;
        particles.create(x, y, '#3498db', 'dashEnd', {
            angle: angle,
            speed: Math.random() * 3 + 2,
            size: Math.random() * 3 + 2
        });
    }
}

// 添加地面震击特效
function createGroundSmashEffect(zombie) {
    // 创建冲击波
    for (let i = 0; i < 3; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#7f8c8d',
            'shockwave',
            {
                size: zombie.radius * (2 + i),
                decay: 0.05
            }
        );
    }

    // 创建碎石效果
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 4;
        particles.create(
            zombie.x,
            zombie.y,
            '#95a5a6',
            'debris',
            {
                angle: angle,
                speed: speed,
                size: Math.random() * 6 + 3
            }
        );
    }

    // 对范围内的玩家造成伤害
    const dx = player.x - zombie.x;
    const dy = player.y - zombie.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200 && !player.dash.active) { // 如果玩家在冲刺中则免疫
        player.health -= 20;
        createPlayerHitEffect();
    }
}

// 添加毒素效果
function createPoisonEffect(zombie) {
    if (Math.random() < 0.2) { // 控制粒子生成频率
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * zombie.poisonRadius;
            particles.create(
                zombie.x + Math.cos(angle) * distance,
                zombie.y + Math.sin(angle) * distance,
                '#2ecc71',
                'poison',
                {
                    size: Math.random() * 3 + 2,
                    decay: Math.random() * 0.05 + 0.02
                }
            );
        }
    }
}

// 添加护甲破碎效果
function createArmorBreakEffect(zombie) {
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 3;
        particles.create(
            zombie.x,
            zombie.y,
            '#95a5a6',
            'armorBreak',
            {
                angle: angle,
                speed: speed,
                size: Math.random() * 4 + 2
            }
        );
    }
    shakeScreen(5, 200);
}

// 添加复活效果
function createReviveEffect(zombie) {
    // 复活光环
    for (let i = 0; i < 2; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#8e44ad',
            'reviveRing',
            {
                size: zombie.reviveRange * (0.5 + i * 0.5),
                decay: 0.08
            }
        );
    }

    // 复活能量粒子
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#9b59b6',
            'reviveEnergy',
            {
                angle: angle,
                speed: Math.random() * 4 + 2,
                size: Math.random() * 4 + 2
            }
        );
    }
}

// 添加狂暴效果
function createRageEffect(zombie) {
    // 狂暴光环
    particles.create(
        zombie.x,
        zombie.y,
        '#c0392b',
        'rageRing',
        {
            size: zombie.radius * 3,
            decay: 0.1
        }
    );

    // 狂暴粒子
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#e74c3c',
            'rage',
            {
                angle: angle,
                speed: Math.random() * 6 + 3,
                size: Math.random() * 4 + 2
            }
        );
    }
}

// 添加激活码检查函数
function checkCheatCode(code) {
    const cheat = cheatMode.codes[code];
    if (cheat) {
        cheat.action();
        createCheatEffect();
    } else {
        showMessage('无效的激活码');
    }
}

// 添加激活码特效
function createCheatEffect() {
    // 创建特效粒子
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 3;
        particles.create(
            player.x,
            player.y,
            '#f1c40f',
            'cheat',
            {
                angle: angle,
                speed: speed,
                size: Math.random() * 5 + 3,
                glow: true
            }
        );
    }
    
    // 添加屏幕震动
    shakeScreen(5, 200);
}

// 添加时间轨迹特效
function createTimeTrailEffect(x, y) {
    for (let i = 0; i < 2; i++) {
        particles.create(x, y, '#00ffff', 'timeTrail', {
            size: player.radius * 0.8,
            decay: 0.1,
            glow: true
        });
    }
}

// 添加时间回溯开始特效
function createTimeRewindEffect(pos) {
    // 创建时空裂缝
    for (let i = 0; i < 3; i++) {
        particles.create(
            pos.x,
            pos.y,
            '#00ffff',
            'timeRift',
            {
                size: player.radius * (2 + i),
                decay: 0.05,
                glow: true
            }
        );
    }
    
    // 创建时间能量
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            pos.x,
            pos.y,
            '#4fc3f7',
            'timeEnergy',
            {
                angle: angle,
                speed: Math.random() * 6 + 3,
                size: Math.random() * 4 + 2,
                glow: true
            }
        );
    }
}

// 添加时间回溯结束特效
function createTimeRewindEndEffect(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.create(x, y, '#00ffff', 'timeEnd', {
            size: player.radius * 0.8,
            decay: 0.1,
            glow: true
        });
    }
}

// 启动游戏
setupEventListeners();
gameLoop(); 

// 添加辅助函数
function getDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// 添加 Boss 技能函数
function useReaperAbility(zombie, ability) {
    switch(ability) {
        case 'teleport':
            const angle = Math.random() * Math.PI * 2;
            const distance = 150 + Math.random() * 100;
            zombie.x = player.x + Math.cos(angle) * distance;
            zombie.y = player.y + Math.sin(angle) * distance;
            createReaperTeleportEffect(zombie);
            break;
            
        case 'deathAura':
            createDeathAuraExplosion(zombie);
            const auraRadius = zombieTypes.reaper.auraRadius * 1.5;
            if (getDistance(player, zombie) <= auraRadius) {
                player.health -= zombieTypes.reaper.auraDamage * 3;
                createPlayerHitEffect();
            }
            break;
            
        case 'soulHarvest':
            if (getDistance(player, zombie) <= zombieTypes.reaper.auraRadius * 2) {
                player.health -= 10;
                zombie.currentHealth = Math.min(
                    zombie.health,
                    zombie.currentHealth + zombieTypes.reaper.harvestHeal
                );
                createSoulHarvestEffect(zombie);
            }
            break;
    }
}

function useApocalypseAbility(zombie, ability) {
    switch(ability) {
        case 'charge':
            const angle = Math.atan2(player.y - zombie.y, player.x - zombie.x);
            zombie.charging = true;
            zombie.chargeAngle = angle;
            zombie.chargeDistance = zombieTypes.apocalypse.chargeDistance;
            zombie.chargeSpeed = zombieTypes.apocalypse.chargeSpeed;
            createApocalypseChargeEffect(zombie);
            break;
            
        case 'fireStorm':
            for (let i = 0; i < zombieTypes.apocalypse.fireballCount; i++) {
                const fireballAngle = (i / zombieTypes.apocalypse.fireballCount) * Math.PI * 2;
                createFireball(zombie, fireballAngle);
            }
            break;
            
        case 'earthquake':
            createEarthquakeEffect(zombie);
            const radius = zombieTypes.apocalypse.earthquakeRadius;
            if (getDistance(player, zombie) <= radius) {
                player.health -= 15;
                createPlayerHitEffect();
                shakeScreen(15, 500);
            }
            break;
    }
}

function useVoidlordAbility(zombie, ability) {
    switch(ability) {
        case 'voidPortal':
            for (let i = 0; i < zombieTypes.voidlord.portalCount; i++) {
                const angle = (i / zombieTypes.voidlord.portalCount) * Math.PI * 2;
                const distance = 150;
                createVoidPortal(
                    zombie.x + Math.cos(angle) * distance,
                    zombie.y + Math.sin(angle) * distance
                );
            }
            break;
            
        case 'darkMatter':
            if (!zombie.voidZones) zombie.voidZones = [];
            const voidZone = {
                x: player.x,
                y: player.y,
                radius: 100,
                duration: 5000,
                startTime: Date.now()
            };
            zombie.voidZones.push(voidZone);
            createDarkMatterEffect(voidZone);
            break;
            
        case 'dimensionRift':
            const dx = zombie.x - player.x;
            const dy = zombie.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                player.x += (dx / dist) * zombieTypes.voidlord.riftPullForce;
                player.y += (dy / dist) * zombieTypes.voidlord.riftPullForce;
                createDimensionRiftEffect(zombie, player);
            }
            break;
    }
}

// 添加特效函数
function createReaperTeleportEffect(zombie) {
    for (let i = 0; i < 30; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#8e44ad',
            'teleport',
            {
                size: Math.random() * 5 + 3,
                speed: Math.random() * 5 + 2,
                angle: Math.random() * Math.PI * 2
            }
        );
    }
}

function createDeathAuraEffect(zombie) {
    if (Math.random() < 0.2) {
        particles.create(
            zombie.x,
            zombie.y,
            '#8e44ad',
            'deathAura',
            {
                size: zombie.radius * 2,
                decay: 0.1
            }
        );
    }
}

function createDeathAuraExplosion(zombie) {
    for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#8e44ad',
            'deathAura',
            {
                angle: angle,
                speed: 5,
                size: Math.random() * 6 + 4
            }
        );
    }
}

function createSoulHarvestEffect(zombie) {
    for (let i = 0; i < 20; i++) {
        const angle = Math.atan2(zombie.y - player.y, zombie.x - player.x);
        particles.create(
            player.x,
            player.y,
            '#8e44ad',
            'soulHarvest',
            {
                angle: angle,
                speed: Math.random() * 4 + 3,
                size: Math.random() * 4 + 2
            }
        );
    }
}

function createApocalypseChargeEffect(zombie) {
    for (let i = 0; i < 20; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#c0392b',
            'charge',
            {
                angle: zombie.chargeAngle,
                speed: Math.random() * 6 + 3,
                size: Math.random() * 5 + 3
            }
        );
    }
}

function createFireball(zombie, angle) {
    const fireball = {
        x: zombie.x,
        y: zombie.y,
        angle: angle,
        speed: 5,
        radius: 15,
        damage: 10
    };
    
    // 创建火球特效
    for (let i = 0; i < 10; i++) {
        particles.create(
            fireball.x,
            fireball.y,
            '#e74c3c',
            'fireball',
            {
                angle: angle + (Math.random() - 0.5) * 0.5,
                speed: Math.random() * 3 + 2,
                size: Math.random() * 4 + 2
            }
        );
    }
}

function createEarthquakeEffect(zombie) {
    for (let i = 0; i < 3; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            '#c0392b',
            'shockwave',
            {
                size: zombieTypes.apocalypse.earthquakeRadius * (0.5 + i * 0.25),
                decay: 0.05
            }
        );
    }
}

function createVoidPortal(x, y) {
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            x,
            y,
            '#2c3e50',
            'portal',
            {
                angle: angle,
                speed: Math.random() * 3 + 1,
                size: Math.random() * 5 + 3
            }
        );
    }
}

function createDarkMatterEffect(voidZone) {
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * voidZone.radius;
        particles.create(
            voidZone.x + Math.cos(angle) * distance,
            voidZone.y + Math.sin(angle) * distance,
            '#2c3e50',
            'darkMatter',
            {
                size: Math.random() * 4 + 2,
                decay: 0.05
            }
        );
    }
}

function createDimensionRiftEffect(zombie, target) {
    const dx = zombie.x - target.x;
    const dy = zombie.y - target.y;
    const angle = Math.atan2(dy, dx);
    
    for (let i = 0; i < 10; i++) {
        particles.create(
            target.x,
            target.y,
            '#2c3e50',
            'rift',
            {
                angle: angle,
                speed: Math.random() * 4 + 2,
                size: Math.random() * 4 + 2
            }
        );
    }
}

function updateVoidZones(zombie) {
    if (!zombie.voidZones) return;
    
    const now = Date.now();
    zombie.voidZones = zombie.voidZones.filter(zone => {
        const age = now - zone.startTime;
        if (age < zone.duration) {
            // 检查玩家是否在区域内
            if (getDistance(player, zone) <= zone.radius) {
                player.health -= zombieTypes.voidlord.voidDamage;
                createVoidDamageEffect(player);
            }
            return true;
        }
        return false;
    });
}

function createVoidDamageEffect(target) {
    for (let i = 0; i < 5; i++) {
        particles.create(
            target.x,
            target.y,
            '#2c3e50',
            'voidDamage',
            {
                size: Math.random() * 3 + 2,
                decay: 0.1
            }
        );
    }
}

// 修改 updateZombies 函数
function updateZombies() {
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        
        // 更新特殊能力
        updateZombieAbilities(zombie);
        
        // 移动逻辑
        if (!zombie.charging) { // 如果不在冲锋状态才正常移动
            const dx = player.x - zombie.x;
            const dy = player.y - zombie.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // 计算基础速度
                let currentSpeed = zombie.speed;
                
                // 狂暴状态速度加成
                if (zombie.type === 'berserker' && zombie.enraged) {
                    currentSpeed *= zombieTypes.berserker.rageSpeedMultiplier;
                }
                
                // 群体加成
                if (zombie.type === 'swarm') {
                    let nearbySwarms = 0;
                    for (const other of zombies) {
                        if (other !== zombie && other.type === 'swarm') {
                            const swarmDist = getDistance(zombie, other);
                            if (swarmDist < 100) {
                                nearbySwarms++;
                            }
                        }
                    }
                    currentSpeed *= (1 + zombieTypes.swarm.packBonus * nearbySwarms);
                }
                
                zombie.x += (dx / dist) * currentSpeed;
                zombie.y += (dy / dist) * currentSpeed;
            }
        } else {
            // 冲锋移动逻辑
            zombie.x += Math.cos(zombie.chargeAngle) * zombie.chargeSpeed;
            zombie.y += Math.sin(zombie.chargeAngle) * zombie.chargeSpeed;
            
            // 检查冲锋是否结束
            if (getDistance(zombie, zombie.chargeStartPos) > zombie.chargeDistance) {
                zombie.charging = false;
            }
        }
        
        // 检查与玩家碰撞
        const collisionDist = getDistance(player, zombie);
        if (collisionDist < player.radius + zombie.radius && !player.dash.active) {
            // 计算实际伤害
            let damage = zombie.damage;
            
            // 护盾减伤
            if (zombie.shielded) {
                damage *= (1 - zombieTypes.shielder.damageReduction);
            }
            
            // 狂暴状态伤害加成
            if (zombie.type === 'berserker' && zombie.enraged) {
                damage *= zombieTypes.berserker.rageDamageMultiplier;
            }
            
            player.health -= damage;
            createPlayerHitEffect();
            shakeScreen(8, 200);
            
            // 检查爆炸僵尸
            if (zombie.type === 'explosive') {
                createExplosion(zombie);
                zombies.splice(i, 1);
                continue;
            }
            
            if (player.health <= 0) {
                gameOver();
            }
        }
    }
}

// 修改 updateZombieAbilities 函数
function updateZombieAbilities(zombie) {
    const now = Date.now();
    
    switch(zombie.type) {
        case 'teleporter':
            if (!zombie.lastTeleport || now - zombie.lastTeleport >= zombieTypes.teleporter.teleportCooldown) {
                if (Math.random() < 0.1) {  // 10%几率触发传送
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * zombieTypes.teleporter.teleportRange;
                    
                    // 保存旧位置用于特效
                    const oldX = zombie.x;
                    const oldY = zombie.y;
                    
                    zombie.x += Math.cos(angle) * distance;
                    zombie.y += Math.sin(angle) * distance;
                    
                    createTeleportEffect(oldX, oldY, zombie.x, zombie.y);
                    zombie.lastTeleport = now;
                }
            }
            break;
            
        case 'spawner':
            if (!zombie.lastSpawn || now - zombie.lastSpawn >= zombieTypes.spawner.spawnCooldown) {
                for (let i = 0; i < zombieTypes.spawner.spawnCount; i++) {
                    spawnMinion(zombie);
                }
                createSpawnEffect(zombie);
                zombie.lastSpawn = now;
            }
            break;
            
        case 'berserker':
            if (!zombie.enraged && zombie.currentHealth <= zombie.health * zombieTypes.berserker.rageThreshold) {
                zombie.enraged = true;
                createRageEffect(zombie);
            }
            if (zombie.enraged) {
                // 持续的狂暴特效
                if (Math.random() < 0.1) {
                    createRageParticles(zombie);
                }
            }
            break;
            
        case 'plague':
            // 持续的毒素效果
            if (getDistance(player, zombie) <= zombieTypes.plague.poisonRadius) {
                player.health -= zombieTypes.plague.poisonDamage;
                if (Math.random() < 0.2) {
                    createPoisonEffect(zombie);
                }
            }
            break;
            
        case 'necromancer':
            if (!zombie.lastRevive || now - zombie.lastRevive >= zombieTypes.necromancer.reviveCooldown) {
                let revivedCount = 0;
                // 遍历所有死亡的僵尸位置
                for (const corpse of deadZombies) {
                    if (getDistance(zombie, corpse) <= zombieTypes.necromancer.reviveRange) {
                        spawnMinion(zombie, corpse.type);
                        revivedCount++;
                        if (revivedCount >= 2) break; // 最多复活2个
                    }
                }
                if (revivedCount > 0) {
                    createReviveEffect(zombie);
                    zombie.lastRevive = now;
                }
            }
            break;
            
        // ... 其他特殊僵尸的能力更新 ...
    }
}

// 添加新的特效函数
function createRageParticles(zombie) {
    for (let i = 0; i < 3; i++) {
        particles.create(
            zombie.x + (Math.random() - 0.5) * zombie.radius,
            zombie.y + (Math.random() - 0.5) * zombie.radius,
            '#e74c3c',
            'rage',
            {
                size: Math.random() * 3 + 2,
                decay: 0.1
            }
        );
    }
}

function createSpawnEffect(zombie) {
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#27ae60',
            'spawn',
            {
                angle: angle,
                speed: Math.random() * 4 + 2,
                size: Math.random() * 4 + 2
            }
        );
    }
}

function createTeleportEffect(oldX, oldY, newX, newY) {
    // 消失特效
    for (let i = 0; i < 15; i++) {
        particles.create(
            oldX,
            oldY,
            '#9b59b6',
            'teleport',
            {
                size: Math.random() * 4 + 2,
                decay: 0.1
            }
        );
    }
    
    // 出现特效
    for (let i = 0; i < 15; i++) {
        particles.create(
            newX,
            newY,
            '#9b59b6',
            'teleport',
            {
                size: Math.random() * 4 + 2,
                decay: 0.1
            }
        );
    }
}

// 添加死亡僵尸记录
const deadZombies = [];

// 修改僵尸死亡处理
function handleZombieDeath(zombie) {
    // 记录死亡位置
    deadZombies.push({
        x: zombie.x,
        y: zombie.y,
        type: zombie.type,
        time: Date.now()
    });
    
    // 限制记录数量
    if (deadZombies.length > 10) {
        deadZombies.shift();
    }
    
    // 分裂僵尸的特殊处理
    if (zombie.type === 'split') {
        for (let i = 0; i < zombieTypes.split.splitCount; i++) {
            spawnMinion(zombie, 'normal', 0.7); // 生成较小的普通僵尸
        }
    }
    
    createZombieDeathEffect(zombie);
}

// 添加键盘控制说明
function showControlsHelp() {
    const helpText = `
    控制说明：
    [T] 切换控制模式
    
    键盘模式：
    [WASD] 移动
    [方向键] 调整射击方向
    [K/Shift] 瞬移
    自动射击
    
    鼠标模式：
    [WASD] 移动
    [鼠标] 瞄准
    [空格/J] 射击
    [K/Shift] 瞬移
    `;
    
    showMessage(helpText);
}

// 修改粒子绘制函数，确保只绘制粒子，不绘制圆环
function drawParticles() {
    ctx.save();
    
    for (const p of particles.list) {
        if (p.type === 'particle') { // 只绘制粒子类型
            ctx.globalAlpha = p.life;
            
            if (p.glow) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
    }
    
    ctx.restore();
}

// 添加爆炸僵尸的爆炸效果函数
function createExplosion(zombie) {
    // 主爆炸效果
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 5;
        particles.create(
            zombie.x,
            zombie.y,
            '#e74c3c', // 红色爆炸
            'particle',
            {
                angle: angle,
                speed: speed,
                size: Math.random() * zombie.radius * 0.5 + zombie.radius * 0.2,
                decay: 0.1 + Math.random() * 0.1,
                glow: true,
                gravity: -0.1
            }
        );
    }

    // 火花效果
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#f1c40f', // 黄色火花
            'particle',
            {
                angle: angle,
                speed: Math.random() * 15 + 10,
                size: Math.random() * zombie.radius * 0.3 + zombie.radius * 0.1,
                decay: 0.15,
                glow: true,
                shrink: true
            }
        );
    }

    // 碎片效果
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            zombie.x,
            zombie.y,
            '#c0392b', // 深红色碎片
            'particle',
            {
                angle: angle,
                speed: Math.random() * 8 + 4,
                size: Math.random() * zombie.radius * 0.4 + zombie.radius * 0.2,
                decay: 0.12,
                glow: false,
                gravity: 0.3,
                spin: (Math.random() - 0.5) * 0.4
            }
        );
    }

    // 烟雾效果
    for (let i = 0; i < 8; i++) {
        particles.create(
            zombie.x,
            zombie.y,
            'rgba(0, 0, 0, 0.3)', // 黑色烟雾
            'particle',
            {
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 3 + 1,
                size: zombie.radius * (Math.random() * 2 + 1),
                decay: 0.06,
                glow: false,
                expand: true,
                gravity: -0.08
            }
        );
    }

    // 强烈的屏幕震动
    shakeScreen(8, 200);
}

// 修改粒子系统的更新和渲染
function updateParticles() {
    for (let i = particles.list.length - 1; i >= 0; i--) {
        const p = particles.list[i];
        p.life -= p.decay;
        
        // 更新位置
        if (p.velocity) {
            // 添加重力效果
            if (p.gravity) {
                p.velocity.y += p.gravity;
            }
            
            // 添加空气阻力
            if (p.drag) {
                p.velocity.x *= 0.98;
                p.velocity.y *= 0.98;
            }
            
            p.x += p.velocity.x;
            p.y += p.velocity.y;
        }
        
        // 更新旋转
        if (p.spin) {
            p.rotation = (p.rotation || 0) + p.spin;
        }
        
        // 更新大小
        if (p.shrink) {
            p.size *= 0.92;
        } else if (p.expand) {
            p.size *= 1.04;
        }
        
        // 更新颜色
        if (p.fadeToColor) {
            p.currentColor = p.currentColor || p.color;
            p.colorPhase = (p.colorPhase || 0) + 0.05;
            p.color = lerpColor(p.currentColor, p.fadeToColor, Math.sin(p.colorPhase));
        }
        
        // 移除死亡粒子
        if (p.life <= 0) {
            particles.list.splice(i, 1);
        }
    }
}

// 修改击中效果
function createHitEffect(bullet, zombie) {
    // 1. 主爆炸粒子
    for (let k = 0; k < 25; k++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 6;
        particles.create(
            bullet.x,
            bullet.y,
            k % 2 === 0 ? '#ff7675' : '#fab1a0',
            'particle',
            {
                angle: angle,
                speed: speed,
                size: Math.random() * bullet.radius * 0.8 + bullet.radius * 0.4,
                decay: 0.08 + Math.random() * 0.05,
                glow: true,
                gravity: -0.15,
                drag: true,
                fadeToColor: '#e17055'
            }
        );
    }
    
    // 2. 高速火花
    for (let k = 0; k < 12; k++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            bullet.x,
            bullet.y,
            '#ffffff',
            'particle',
            {
                angle: angle,
                speed: Math.random() * 15 + 10,
                size: Math.random() * bullet.radius * 0.4 + bullet.radius * 0.2,
                decay: 0.15,
                glow: true,
                shrink: true,
                trail: true,
                trailLength: 8,
                fadeToColor: '#ffeaa7'
            }
        );
    }
    
    // 3. 碎片效果
    for (let k = 0; k < 8; k++) {
        const angle = Math.random() * Math.PI * 2;
        particles.create(
            bullet.x,
            bullet.y,
            '#e17055',
            'particle',
            {
                angle: angle,
                speed: Math.random() * 8 + 5,
                size: Math.random() * bullet.radius * 0.5 + bullet.radius * 0.3,
                decay: 0.12,
                glow: false,
                gravity: 0.25,
                spin: (Math.random() - 0.5) * 0.4,
                shape: 'rectangle'
            }
        );
    }
    
    // 4. 能量波纹
    for (let k = 0; k < 3; k++) {
        particles.create(
            bullet.x,
            bullet.y,
            'rgba(255, 118, 117, 0.2)',
            'particle',
            {
                size: bullet.radius * (1 + k * 0.5),
                decay: 0.15,
                expand: true,
                glow: true,
                shape: 'ring'
            }
        );
    }
    
    // 5. 烟雾效果
    for (let k = 0; k < 6; k++) {
        particles.create(
            bullet.x,
            bullet.y,
            'rgba(255, 255, 255, 0.2)',
            'particle',
            {
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 2 + 1,
                size: bullet.radius * (Math.random() + 1),
                decay: 0.06,
                expand: true,
                gravity: -0.05,
                drag: true,
                fadeToColor: 'rgba(255, 255, 255, 0)'
            }
        );
    }
}

// 绘制粒子
function drawParticles() {
    ctx.save();
    
    for (const p of particles.list) {
        ctx.globalAlpha = p.life;
        
        if (p.glow) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
        }
        
        ctx.beginPath();
        
        if (p.shape === 'rectangle') {
            // 绘制矩形碎片
            ctx.save();
            ctx.translate(p.x, p.y);
            if (p.rotation) ctx.rotate(p.rotation);
            ctx.rect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
        } else if (p.shape === 'ring') {
            // 绘制环形
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // 绘制圆形粒子
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            
            // 绘制尾迹
            if (p.trail && p.velocity) {
                const trailLength = p.trailLength || 5;
                const dx = -p.velocity.x * trailLength;
                const dy = -p.velocity.y * trailLength;
                
                const gradient = ctx.createLinearGradient(
                    p.x, p.y,
                    p.x + dx, p.y + dy
                );
                gradient.addColorStop(0, p.color);
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = p.color;
            }
        }
        
        if (p.shape !== 'ring') {
            ctx.fill();
        }
    }
    
    ctx.restore();
}

// 颜色插值函数
function lerpColor(color1, color2, amount) {
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    
    return `rgba(${
        Math.round(c1.r + (c2.r - c1.r) * amount)
    },${
        Math.round(c1.g + (c2.g - c1.g) * amount)
    },${
        Math.round(c1.b + (c2.b - c1.b) * amount)
    },${
        c1.a + (c2.a - c1.a) * amount
    })`;
}

// 解析颜色
function parseColor(color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    return {
        r: parseInt(ctx.fillStyle.slice(1, 3), 16),
        g: parseInt(ctx.fillStyle.slice(3, 5), 16),
        b: parseInt(ctx.fillStyle.slice(5, 7), 16),
        a: color.startsWith('rgba') ? parseFloat(color.split(',')[3]) : 1
    };
}