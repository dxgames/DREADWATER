// === MOTOR ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mapCanvas = document.getElementById('mapCanvas');
const mapCtx = mapCanvas.getContext('2d');
const CX = () => canvas.width / 2;
const CY = () => canvas.height / 2;

function resize() { 
    canvas.width = window.innerWidth; canvas.height = window.innerHeight; 
    const s = Math.min(window.innerWidth, window.innerHeight) * 0.9;
    mapCanvas.width = s; mapCanvas.height = s;
}
window.addEventListener('resize', resize);
resize();

// === ASSETS & AUDIO ===
const sprites = {};
const audio = {};
let currentMusic = null;

function loadAssets() {
    const imgs = {
        player: "https://i.postimg.cc/4NZgwxFn/barco_jugador.png",
        shipSmall: "https://i.postimg.cc/ZKZSj5D4/barco_chico.png",
        shipMed: "https://i.postimg.cc/02fq41Lv/barco_mediano.png",
        shipBig: "https://i.postimg.cc/8PHVYgqp/barco_grande.png",
        hunter: "https://i.postimg.cc/rFJLH2vR/perseguidor.png",
        ghost: "https://i.postimg.cc/pLLtb1Hz/barco_fantasma.png",
        rock: "https://i.postimg.cc/4dtg2kQD/isla_de_rocas.png",
        island: "https://i.postimg.cc/qRnTDVGf/isla.png",
        portHome: "https://i.postimg.cc/k5LCyXK4/isla_desesperanza.png",
        portNormal: "https://i.postimg.cc/d1dYNPjf/puertos.png",
        portBig: "https://i.postimg.cc/Px1gzbd6/puerto_grande.png",
        minimap: "https://i.postimg.cc/N0FmWYF3/Minimapa.png"
    };
    for(let key in imgs) { sprites[key] = new Image(); sprites[key].src = imgs[key]; }

    const tracks = {
        ambient: "https://archive.org/download/sonido-del-mar_202512/Sonido%20del%20Mar.mp3",
        menu: "https://archive.org/download/the-galeon-of-souls/Menuprincipal.mp3",
        hunter: "https://archive.org/download/the-galeon-of-souls/Perseguidor.mp3",
        ghost: "https://archive.org/download/the-galeon-of-souls/The%20Galeon%20of%20Souls.mp3",
        battleBig: "https://archive.org/download/the-galeon-of-souls/batalla%20grande.mp3",
        battleSmall: "https://archive.org/download/the-galeon-of-souls/Batalla%20peque%C3%B1a.mp3"
    };
    for(let key in tracks) { 
        audio[key] = new Audio(tracks[key]); 
        if(key === 'ambient' || key === 'menu') audio[key].loop = true;
        if(key.includes('battle') || key === 'hunter' || key === 'ghost') audio[key].loop = true;
    }
}
loadAssets();

function playMusic(trackName) {
    if(!settings.music) return;
    if(currentMusic && currentMusic !== audio[trackName]) { currentMusic.pause(); currentMusic.currentTime = 0; }
    if(trackName && audio[trackName]) { currentMusic = audio[trackName]; currentMusic.play().catch(e => {}); } else { currentMusic = null; }
}

function stopMusic() { if(currentMusic) { currentMusic.pause(); currentMusic.currentTime = 0; currentMusic = null; } }

function updateAudioSettings() {
    if(settings.ambient) { audio.ambient.play().catch(e=>{}); } else { audio.ambient.pause(); }
    if(!settings.music) stopMusic();
    else if(gameState === STATE.MENU) playMusic('menu');
}

// === ESTADOS Y JUGADOR ===
const STATE = { MENU: 0, ROAMING: 1, BATTLE: 2, PORT: 3, SINKING: 4, MAP: 5 };
let gameState = STATE.MENU;
let gameTime = 0;
let settings = { vibration: true, music: true, ambient: true, sound: true };

let mapCam = { x: 0, y: 0, zoom: 1 };
let mapDrag = { active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, dist: 0 };

const player = {
    gX: 180, gY: 0, angle: Math.PI / 2, speed: 0, 
    baseMaxSpeed: 1.9, accel: 0.03,
    hp: 100, maxHp: 100, isSailing: false, savedPos: {x: 180, y: 0},
    inventory: { gold: 50, rum: 10 }, reloadTimer: 0, maxReload: 60, mapCount: 0,
    rumConsumptionTimer: 0, spawnPort: "Desesperanza",
    upgrades: { sails: 0, hull: 0, cannons: 0, frontCannon: false, rearCannon: false }
};

// === MAPA FIJO ===
const ports = [
    { name: "Desesperanza", x: 0, y: 0, radius: 110, type: 'home' },
    { name: "Pto. Ahogado", x: 4500, y: 3200, radius: 110, type: 'normal' },
    { name: "Cala Feliz", x: -5200, y: 1200, radius: 110, type: 'normal' },
    { name: "Isla Tortuga", x: 1200, y: -6500, radius: 110, type: 'normal' },
    { name: "Refugio Pirata", x: -3000, y: -4800, radius: 110, type: 'normal' },
    { name: "Bahía Sucia", x: 8000, y: -1500, radius: 110, type: 'normal' },
    { name: "Punta Sangre", x: -9000, y: -2000, radius: 110, type: 'normal' },
    { name: "Cala Viuda", x: 6000, y: 7000, radius: 110, type: 'normal' },
    { name: "Port Royal", x: -7500, y: 8500, radius: 110, type: 'normal' },
    { name: "Abismo Negro", x: 12000, y: 4000, radius: 110, type: 'normal' },
    { name: "Roca Ron", x: -14000, y: -5000, radius: 110, type: 'normal' },
    { name: "Cala Loro", x: 10000, y: -12000, radius: 110, type: 'normal' },
    { name: "Bahía Botín", x: -11000, y: 15000, radius: 110, type: 'normal' },
    { name: "Pto. Huesos", x: 20000, y: 20000, radius: 110, type: 'normal' },
    { name: "Isla Sed", x: -22000, y: -18000, radius: 110, type: 'normal' },
    { name: "Paso Muerte", x: 35000, y: -5000, radius: 110, type: 'normal' },
    { name: "Cala Fortuna", x: -40000, y: 25000, radius: 110, type: 'normal' },
    { name: "Pto. Calavera", x: 15000, y: -30000, radius: 110, type: 'normal' },
    { name: "Bahía Tormenta", x: -25000, y: 45000, radius: 110, type: 'normal' },
    { name: "Isla Olvidada", x: 50000, y: 50000, radius: 110, type: 'normal' },
    { name: "Cabo Esperanza", x: -60000, y: -60000, radius: 110, type: 'normal' }
];

let enemies = [], rocks = [], islands = [], projectiles = [], wakeParticles = [], explosions = []; 
let battleEnemy = null, sinkingEnemy = null, treasureSites = [];
let currentPort = null;
const waves = [];
for(let i=0; i<60; i++) waves.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, offset: Math.random() * 100 });

const keys = { Left: false, Right: false };
const ui = {
    mainMenu: document.getElementById('main-menu'),
    settingsMenu: document.getElementById('settings-menu'),
    aboutMenu: document.getElementById('about-menu'),
    mapScreen: document.getElementById('map-screen'),
    actionBtn: document.getElementById('action-btn'),
    portScreen: document.getElementById('port-screen'),
    controls: document.getElementById('game-controls'),
    fireControls: document.getElementById('fire-controls'),
    btnShootL: document.getElementById('btn-shoot-l'),
    btnShootR: document.getElementById('btn-shoot-r'),
    anchorBtn: document.getElementById('btn-anchor'),
    resultScreen: document.getElementById('result-screen'),
    portContent: document.getElementById('port-content'),
    portTitle: document.getElementById('port-title')
};

// === SAVE SYSTEM ===
function saveGame() {
    const data = { gold: player.inventory.gold, rum: player.inventory.rum, spawnX: player.savedPos.x, spawnY: player.savedPos.y, port: player.spawnPort, upgrades: player.upgrades, maps: player.mapCount, treasures: treasureSites };
    localStorage.setItem('dx_dreadwater_v12_checkpoint_save', JSON.stringify(data));
    showMsg("¡CHECKPOINT GUARDADO!", "#2ecc71");
}

function loadGame() {
    const saved = localStorage.getItem('dx_dreadwater_v12_checkpoint_save');
    if(saved) {
        const data = JSON.parse(saved);
        player.inventory.gold = data.gold; player.inventory.rum = data.rum;
        player.savedPos.x = data.spawnX; player.savedPos.y = data.spawnY;
        player.gX = data.spawnX; player.gY = data.spawnY;
        player.spawnPort = data.port;
        if(data.upgrades) player.upgrades = data.upgrades;
        if(data.maps) player.mapCount = data.maps;
        if(data.treasures) treasureSites = data.treasures;
    }
}

// === MENÚS ===
function startGame() { hideAllMenus(); loadGame(); ui.controls.style.display = 'flex'; gameState = STATE.ROAMING; updateAudioSettings(); playMusic(null); showMsg("¡DREADWATER TE ESPERA!", "#f1c40f"); }
function showSettings() { hideAllMenus(); ui.settingsMenu.classList.add('visible'); }
function showAbout() { hideAllMenus(); ui.aboutMenu.classList.add('visible'); }
function showMain() { hideAllMenus(); ui.mainMenu.classList.add('visible'); playMusic('menu'); }
function hideAllMenus() { ui.mainMenu.classList.remove('visible'); ui.settingsMenu.classList.remove('visible'); ui.aboutMenu.classList.remove('visible'); ui.mapScreen.classList.remove('visible'); }

function toggleSetting(key) {
    settings[key] = !settings[key];
    const btn = document.getElementById(`btn-${key}`);
    const label = key === 'music' ? 'MÚSICA' : key === 'ambient' ? 'AMBIENTE' : key === 'sound' ? 'SONIDO' : 'VIBRACIÓN';
    btn.innerText = `${label}: ${settings[key] ? 'ON' : 'OFF'}`;
    if(key === 'music' || key === 'ambient') updateAudioSettings();
    if(key === 'vibrate' && settings.vibrate) navigator.vibrate(50);
}

function vibrate(ms) { if(settings.vibrate) navigator.vibrate(ms); }
function closeDialog() { document.getElementById('dialog-modal').style.display = 'none'; }

// === MAPA AMPLIADO ===
function openMap() { gameState = STATE.MAP; ui.controls.style.display = 'none'; ui.mapScreen.classList.add('visible'); mapCam = { x: 0, y: 0, zoom: 1 }; drawFullMap(); }
function closeMap() { ui.mapScreen.classList.remove('visible'); ui.controls.style.display = 'flex'; gameState = STATE.ROAMING; }
mapCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if(e.touches.length === 1) { mapDrag.active = true; mapDrag.startX = e.touches[0].clientX; mapDrag.startY = e.touches[0].clientY; mapDrag.lastX = mapCam.x; mapDrag.lastY = mapCam.y; } 
    else if(e.touches.length === 2) { mapDrag.dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
}, {passive: false});
mapCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if(e.touches.length === 1 && mapDrag.active) {
        const dx = e.touches[0].clientX - mapDrag.startX; const dy = e.touches[0].clientY - mapDrag.startY;
        mapCam.x = mapDrag.lastX + dx; mapCam.y = mapDrag.lastY + dy; drawFullMap();
    } else if(e.touches.length === 2) {
        const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = newDist - mapDrag.dist; mapCam.zoom = Math.max(0.5, Math.min(5, mapCam.zoom + delta * 0.01)); mapDrag.dist = newDist; drawFullMap();
    }
}, {passive: false});
mapCanvas.addEventListener('touchend', () => { mapDrag.active = false; });

function drawTriangle(ctx, x, y, size, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.beginPath();
    ctx.moveTo(0, -size); ctx.lineTo(size/1.5, size); ctx.lineTo(-size/1.5, size); ctx.closePath();
    ctx.fillStyle = "#bdc3c7"; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = "black"; ctx.stroke(); ctx.restore();
}

function drawFullMap() {
    mapCtx.fillStyle = "#1a252f"; mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.save();
    const cx = mapCanvas.width / 2; const cy = mapCanvas.height / 2;
    mapCtx.translate(cx + mapCam.x, cy + mapCam.y); mapCtx.scale(mapCam.zoom, mapCam.zoom); mapCtx.translate(-cx, -cy);
    const worldSize = 250000; const scale = (mapCanvas.width / 2) / worldSize;
    ports.forEach(p => {
        const mx = cx + p.x * scale; const my = cy + p.y * scale;
        mapCtx.fillStyle = p.type === 'home' ? "#f1c40f" : "#ecf0f1";
        mapCtx.beginPath(); mapCtx.arc(mx, my, 3/mapCam.zoom, 0, Math.PI*2); mapCtx.fill();
        mapCtx.fillStyle = "#bdc3c7"; mapCtx.font = `${10/mapCam.zoom}px monospace`; mapCtx.textAlign = "center"; mapCtx.fillText(p.name, mx, my - 6/mapCam.zoom);
    });
    // TESOROS
    treasureSites.forEach(t => {
        const mx = cx + t.x * scale; const my = cy + t.y * scale;
        if(sprites.island.complete) {
            mapCtx.drawImage(sprites.island, mx - 8/mapCam.zoom, my - 8/mapCam.zoom, 16/mapCam.zoom, 16/mapCam.zoom);
        }
        mapCtx.strokeStyle = "#c0392b"; mapCtx.lineWidth = 2/mapCam.zoom;
        mapCtx.beginPath(); mapCtx.moveTo(mx-6/mapCam.zoom, my-6/mapCam.zoom); mapCtx.lineTo(mx+6/mapCam.zoom, my+6/mapCam.zoom);
        mapCtx.moveTo(mx+6/mapCam.zoom, my-6/mapCam.zoom); mapCtx.lineTo(mx-6/mapCam.zoom, my+6/mapCam.zoom); mapCtx.stroke();
    });

    const px = cx + player.gX * scale; const py = cy + player.gY * scale;
    drawTriangle(mapCtx, px, py, 8/mapCam.zoom, player.angle);
    mapCtx.restore();
}
canvas.addEventListener('mousedown', checkMinimapClick);
canvas.addEventListener('touchstart', checkMinimapClick);
function checkMinimapClick(e) {
    if(gameState !== STATE.ROAMING) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    if (x > canvas.width - 160 && y < 160) openMap();
}

// === UTILS ===
function dist(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); }
function showMsg(text, color) {
    const el = document.createElement('div'); el.className = 'pop-msg'; el.innerText = text; el.style.color = color || 'white';
    document.getElementById('msg-area').appendChild(el); setTimeout(() => el.remove(), 2500);
}
function spawnExplosion(x, y, color) {
    for(let i=0; i<20; i++) explosions.push({ x: x, y: y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, size: Math.floor(Math.random()*8+4), life: 1.5, color: color || '#e67e22' });
}

// === SPAWNS ===
function updateProceduralSpawns() {
    if (gameState !== STATE.ROAMING) return;
    if (player.inventory.gold > 1000 && enemies.filter(e => e.type === 'hunter').length === 0) {
        if (Math.random() < 0.0005 * (player.inventory.gold / 1000)) { 
             const a = Math.random() * Math.PI * 2;
             enemies.push({ x: player.gX+Math.cos(a)*1500, y: player.gY+Math.sin(a)*1500, angle: Math.random()*Math.PI*2, hp: 500, maxHp: 500, size: 25, type: 'hunter', id: Math.random(), reload: 50, canFlee: false, speed: 2.0 });
            showMsg("¡EL CAZADOR!", "#c0392b");
        }
    }
    if (enemies.length < 8) {
        const a = Math.random() * Math.PI * 2; const d = 1800; 
        let type = 'normal'; let size = 20; let hp = 50; let canFlee = true; let spd = 0.8;
        const rand = Math.random();
        if (rand < 0.005) { type = 'ghost'; size = 35; hp = 1000; canFlee = false; spd = 2.2; }
        else if (rand < 0.2) { type = 'big'; size = 30; hp = 150; canFlee = Math.random() < 0.3; spd = 1.0; }
        else if (rand < 0.5) { type = 'med'; size = 25; hp = 100; canFlee = Math.random() < 0.3; spd = 1.2; }
        if (type !== 'ghost' && type !== 'hunter') {
            enemies.push({ x: player.gX+Math.cos(a)*d, y: player.gY+Math.sin(a)*d, angle: Math.random()*Math.PI*2, hp: hp, maxHp: hp, size: size, type: type, id: Math.random(), reload: 60, canFlee: canFlee, speed: spd });
        }
    }
    enemies = enemies.filter(e => dist(player.gX, player.gY, e.x, e.y) < 5000);
    if (rocks.length < 12) { const a = Math.random()*Math.PI*2; rocks.push({ x: player.gX+Math.cos(a)*1500, y: player.gY+Math.sin(a)*1500, size: 50 }); }
    
    // GENERACIÓN ALEATORIA DE ISLAS (RESTAURADA)
    if (islands.length < 5) { 
        const a = Math.random()*Math.PI*2; 
        islands.push({ x: player.gX+Math.cos(a)*2500, y: player.gY+Math.sin(a)*2500, radius: 80 + Math.random()*40 }); 
    }
    
    rocks = rocks.filter(r => dist(player.gX, player.gY, r.x, r.y) < 4000);
    islands = islands.filter(i => dist(player.gX, player.gY, i.x, i.y) < 6000);
}

// === BATALLA ===
function startBattle(enemyRef) {
    if(isNaN(enemyRef.x)) return;
    player.savedPosBattle = { x: player.gX, y: player.gY }; gameState = STATE.BATTLE;
    player.gX = 100000; player.gY = 100000; player.angle = 0; player.speed = 0.5;
    player.isSailing = false; ui.anchorBtn.classList.remove('sailing'); ui.actionBtn.style.display = 'none';
    projectiles = []; sinkingEnemy = null;
    battleEnemy = { ...enemyRef, x: 100000, y: 99600, angle: Math.PI, isBattleEnemy: true, reload: 60 };
    enemies = [battleEnemy]; ui.fireControls.style.display = 'flex'; showMsg("¡A LAS ARMAS!", "#e74c3c");
    let track = 'battleSmall';
    if(battleEnemy.type === 'big' || battleEnemy.type === 'med') track = 'battleBig';
    if(battleEnemy.type === 'hunter') track = 'hunter';
    if(battleEnemy.type === 'ghost') track = 'ghost';
    playMusic(track);
}

function triggerSinking(win) {
    if(win) {
        gameState = STATE.SINKING; ui.fireControls.style.display = 'none';
        sinkingEnemy = { ...battleEnemy, alpha: 1.0, scale: 1.0 }; 
        spawnExplosion(sinkingEnemy.x, sinkingEnemy.y, '#e74c3c'); 
        let gold = 0; let rum = 0; let msg = "¡VICTORIA!";
        if (battleEnemy.type === 'ghost') { 
            gold = 10000; rum = 2000; player.mapCount++; 
            treasureSites.push({ x: player.savedPosBattle.x + (Math.random()-0.5)*100000, y: player.savedPosBattle.y + (Math.random()-0.5)*100000, active: true }); 
            msg = "¡FANTASMA HUNDIDO!"; 
        } 
        else if (battleEnemy.type === 'hunter') { gold = 2000; rum = 50; } 
        else if (battleEnemy.type === 'big') { gold = 150; rum = 5; } 
        else { gold = 50; rum = 2; }
        if(battleEnemy.type !== 'ghost' && Math.random() < 0.02) {
            player.mapCount++;
            treasureSites.push({ x: player.savedPosBattle.x + (Math.random()-0.5)*100000, y: player.savedPosBattle.y + (Math.random()-0.5)*100000, active: true });
            showMsg("¡MAPA ENCONTRADO!", "#9b59b6");
        }
        battleEnemy = null; enemies = [];
        setTimeout(() => endBattle(true, false, null, gold, rum, msg), 3000);
    } else {
        player.hp = 100; loadGame(); 
        if(player.upgrades.frontCannon || player.upgrades.rearCannon) { player.upgrades.frontCannon = false; player.upgrades.rearCannon = false; saveGame(); }
        endBattle(false, false);
    }
}

function endBattle(win, escaped, whoEscaped, gold=0, rum=0, winMsg="") {
    gameState = STATE.PORT; ui.controls.style.display = 'none'; ui.fireControls.style.display = 'none';
    ui.resultScreen.classList.add('visible'); playMusic(null);
    const title = document.getElementById('result-title'); const loot = document.getElementById('result-loot');
    const btn = document.getElementById('btn-continue');
    btn.onclick = null;
    if (escaped) { title.innerText = "FIN DEL COMBATE"; title.style.color = "#3498db"; loot.innerHTML = whoEscaped === 'player' ? "HAS ESCAPADO" : "EL ENEMIGO ESCAPÓ"; }
    else if (win) { title.innerText = winMsg || "¡VICTORIA!"; title.style.color = "#f1c40f"; player.inventory.gold += gold; player.inventory.rum += rum; loot.innerHTML = `Botín:<br>💰 ${gold} Oro<br>🍾 ${rum} Ron`; }
    else { title.innerText = "¡DERROTA!"; title.style.color = "#c0392b"; vibrate(400); loot.innerHTML = "Barco hundido. Regresas al puerto."; }
    btn.onclick = () => { 
        if (win || escaped) { player.gX = player.savedPosBattle.x; player.gY = player.savedPosBattle.y; }
        enemies = []; rocks = []; islands = []; sinkingEnemy = null; battleEnemy = null;
        gameState = STATE.ROAMING; ui.resultScreen.classList.remove('visible'); ui.controls.style.display = 'flex'; 
    };
}

// === ASTILLERO ===
function renderPortMenu(screen) {
    const content = ui.portContent; content.innerHTML = '';
    if (screen === 'main') {
        content.innerHTML = `<div class="port-option" onclick="talkDialog()"><span>🗣️ Hablar</span></div>
            <div class="port-option" onclick="renderPortMenu('tavern')"><span>🍺 Taberna</span></div>
            <div class="port-option" onclick="renderPortMenu('shipyard')"><span>🛠️ Astillero</span></div>
            <div class="port-option" onclick="restInPort()"><span>🛌 Descansar</span></div>
            <div class="port-option active" onclick="exitPort()"><span>⛵ ZARPAR</span></div>`;
    } else if (screen === 'tavern') {
        content.innerHTML = `<div class="npc-text" id="tavern-text">"¿Una copa?"</div>
            <div class="port-option" onclick="buyRum()"><span>🥃 Comprar Ron (10G)</span></div>
            <div class="port-option active" onclick="renderPortMenu('main')"><span>🔙 Volver</span></div>`;
    } else if (screen === 'shipyard') {
        const costRep = Math.floor(player.maxHp - player.hp);
        let upgradeHTML = `<div class="npc-text" id="ship-text">"¿Mejoras?"</div>
            <div class="port-option" onclick="repairShip()"><span>🔨 Reparar (${costRep}G)</span></div>
            <div class="port-option" onclick="buyUpgrade('sails')"><span>🚩 Velas (${player.upgrades.sails}) [500G]</span></div>
            <div class="port-option" onclick="buyUpgrade('hull')"><span>🛡️ Casco (${player.upgrades.hull}) [300G]</span></div>
            <div class="port-option" onclick="buyUpgrade('cannons')"><span>💣 Cañón (${player.upgrades.cannons}) [500G]</span></div>`;
        if(!player.upgrades.frontCannon) upgradeHTML += `<div class="port-option" onclick="buyWeapon('front')"><span>🔴 Cañón Frontal (1000G)</span></div>`;
        if(!player.upgrades.rearCannon) upgradeHTML += `<div class="port-option" onclick="buyWeapon('rear')"><span>⚫ Cañón Trasero (1000G)</span></div>`;
        upgradeHTML += `<div class="port-option active" onclick="renderPortMenu('main')"><span>🔙 Volver</span></div>`;
        content.innerHTML = upgradeHTML;
    }
}
function buyUpgrade(type) { let cost = (type==='hull')?300:500; if(player.inventory.gold >= cost) { player.inventory.gold -= cost; player.upgrades[type]++; renderPortMenu('shipyard'); } }
function buyWeapon(pos) { if(player.inventory.gold >= 1000) { player.inventory.gold -= 1000; if(pos==='front') player.upgrades.frontCannon = true; else player.upgrades.rearCannon = true; renderPortMenu('shipyard'); } }
function buyRum() { if(player.inventory.gold >= 10) { player.inventory.gold -= 10; player.inventory.rum += 5; document.getElementById('tavern-text').innerText = "¡Ron!"; } }
function restInPort() { player.hp = player.maxHp; player.savedPos.x = player.gX; player.savedPos.y = player.gY; player.spawnPort = currentPort.name; saveGame(); showMsg("PUNTO DE APARICIÓN FIJADO", "#2ecc71"); }
function talkDialog() { document.getElementById('dialog-text').innerText = `"${(currentPort && currentPort.type === 'home' ? POOR_QUOTES : GENERIC_QUOTES)[Math.floor(Math.random()*10)]}"`; document.getElementById('dialog-modal').style.display = 'block'; }
function repairShip() { const c = Math.floor(player.maxHp - player.hp); if(player.inventory.gold >= c) { player.inventory.gold -= c; player.hp = player.maxHp; renderPortMenu('shipyard'); } }
function enterPort(port) { currentPort = port; gameState = STATE.PORT; player.speed = 0; player.isSailing = false; ui.anchorBtn.classList.remove('sailing'); ui.actionBtn.style.display = 'none'; ui.controls.style.display = 'none'; ui.portScreen.classList.add('visible'); ui.portTitle.innerText = port.name; renderPortMenu('main'); }
function exitPort() { ui.portScreen.classList.remove('visible'); ui.controls.style.display = 'flex'; gameState = STATE.ROAMING; }

// === UPDATE ===
function update() {
    gameTime += 0.05;
    updateProceduralSpawns();
    if(player.reloadTimer > 0) player.reloadTimer--;
    if (gameState === STATE.ROAMING && player.isSailing) {
        player.rumConsumptionTimer++;
        if(player.rumConsumptionTimer > 18000) { if(player.inventory.rum > 0) { player.inventory.rum--; player.rumConsumptionTimer = 0; showMsg("-1 RON", "#e67e22"); } }
    }
    if ((gameState === STATE.ROAMING || gameState === STATE.BATTLE) && gameState !== STATE.MENU) {
        let spd = player.baseMaxSpeed + (player.upgrades.sails * 0.4); 
        const hpF = Math.max(0.4, player.hp / player.maxHp); spd *= hpF;
        if(player.inventory.rum <= 0) spd *= 0.5;
        if (player.isSailing && player.speed < spd) player.speed += player.accel;
        else if (!player.isSailing && player.speed > 0) player.speed -= 0.05;
        if (keys.Left) player.angle -= 0.035; if (keys.Right) player.angle += 0.035;
        player.gX += Math.sin(player.angle) * player.speed; player.gY -= Math.cos(player.angle) * player.speed;
        if(isNaN(player.speed)) player.speed = 0;
        if (player.speed > 0.3) wakeParticles.push({x: player.gX - Math.sin(player.angle)*30, y: player.gY + Math.cos(player.angle)*30, life: 1.0, size: Math.random()*3+3});
    }
    wakeParticles.forEach(p => p.life -= 0.02); wakeParticles = wakeParticles.filter(p => p.life > 0);
    explosions.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.02; }); explosions = explosions.filter(p => p.life > 0);

    if (gameState === STATE.ROAMING) {
        let inRange = false;
        ports.forEach(p => {
            const d = dist(player.gX, player.gY, p.x, p.y);
            if(d < p.radius + 10) { player.speed = -0.3; const a = Math.atan2(player.gY-p.y, player.gX-p.x); player.gX = p.x + Math.cos(a)*(p.radius+11); player.gY = p.y + Math.sin(a)*(p.radius+11); }
            if(d < 350 && player.speed < 1.5) { ui.actionBtn.style.display = 'block'; ui.actionBtn.innerText = "⚓ AMARRAR"; ui.actionBtn.onclick = () => enterPort(p); inRange = true; }
        });
        
        let digSite = null;
        treasureSites.forEach(t => { if(t.active && dist(player.gX, player.gY, t.x, t.y) < 300) digSite = t; });
        if (digSite) {
            ui.actionBtn.style.display = 'block'; ui.actionBtn.innerText = "💎 EXCAVAR"; 
            ui.actionBtn.onclick = () => { 
                const g = Math.floor(Math.random()*500+500); player.inventory.gold += g; 
                digSite.active = false; player.mapCount--; 
                treasureSites = treasureSites.filter(t => t.active);
                showMsg(`+${g} ORO`, "#f1c40f"); 
            }; 
            inRange = true;
        }

        if(!inRange) ui.actionBtn.style.display = 'none';
        islands.forEach(i => { const d = dist(player.gX, player.gY, i.x, i.y); if(d < i.radius - 20) { player.speed = -0.5; const angle = Math.atan2(player.gY - i.y, player.gX - i.x); player.gX = i.x + Math.cos(angle) * (i.radius - 15); player.gY = i.y + Math.sin(angle) * (i.radius - 15); } });
        rocks.forEach(r => { const d = dist(player.gX, player.gY, r.x, r.y); if(d < r.size - 15) { player.speed = -0.8; const a = Math.atan2(player.gY-r.y, player.gX-r.x); player.gX = r.x + Math.cos(a)*(r.size); player.gY = r.y + Math.sin(a)*(r.size); player.hp -= 1; vibrate(100); if(player.hp <= 0) { gameState = STATE.SINKING; showMsg("¡NAUFRAGIO!", "#c0392b"); setTimeout(()=>endBattle(false, false), 2000); } } });
        
        enemies.forEach(e => { 
            // IA PERSECUCION
            if(e.type === 'hunter' || e.type === 'ghost') {
                const targetA = Math.atan2(player.gX - e.x, -(player.gY - e.y));
                let diff = targetA - e.angle; while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2; e.angle += diff * 0.05;
            }
            e.x += Math.sin(e.angle) * e.speed; e.y -= Math.cos(e.angle) * e.speed; 
            if (dist(e.x, e.y, player.gX, player.gY) < 60 + e.size) startBattle(e); 
        });
    
    } else if (gameState === STATE.BATTLE && battleEnemy) {
        const dToP = dist(player.gX, player.gY, battleEnemy.x, battleEnemy.y);
        if (dToP < 55) { vibrate(100); player.hp -= 10; battleEnemy.hp -= 10; player.speed = -0.2; battleEnemy.speed = -0.2; const angle = Math.atan2(battleEnemy.y - player.gY, battleEnemy.x - player.gX); player.gX -= Math.cos(angle)*8; player.gY -= Math.sin(angle)*8; battleEnemy.x += Math.cos(angle)*8; battleEnemy.y += Math.sin(angle)*8; if (player.hp <= 0) triggerSinking(false); if (battleEnemy.hp <= 0) triggerSinking(true); }
        if (dToP > 900) { if (battleEnemy.hp < battleEnemy.maxHp * 0.25 && battleEnemy.canFlee) endBattle(false, true, 'enemy'); else endBattle(false, true, 'player'); return; }
        const eBase = player.baseMaxSpeed; const eHpFac = Math.max(0.4, battleEnemy.hp / battleEnemy.maxHp); const eSpd = eBase * eHpFac;
        let targetAngle = Math.atan2(-(player.gX-battleEnemy.x), player.gY-battleEnemy.y) + Math.PI;
        if(dToP < 150) targetAngle += 1.5; else if (battleEnemy.hp < battleEnemy.maxHp * 0.25 && battleEnemy.canFlee) targetAngle += Math.PI;
        let diff = targetAngle - battleEnemy.angle; while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2; battleEnemy.angle += diff * 0.05;
        battleEnemy.x += Math.sin(battleEnemy.angle) * eSpd; battleEnemy.y -= Math.cos(battleEnemy.angle) * eSpd;

        if(battleEnemy.reload-- <= 0) {
            const dx = player.gX - battleEnemy.x; const dy = player.gY - battleEnemy.y;
            const rx = Math.cos(battleEnemy.angle); const ry = Math.sin(battleEnemy.angle);
            const side = dx * rx + dy * ry; 
            const fwd = dx * Math.sin(battleEnemy.angle) + dy * -Math.cos(battleEnemy.angle); 
            const rangeOk = dToP < 400; const dmg = 10;

            if(rangeOk) {
                let shot = false;
                if(battleEnemy.type === 'big' || battleEnemy.type === 'hunter' || battleEnemy.type === 'ghost') {
                    if(fwd > 50) { projectiles.push({x: battleEnemy.x, y: battleEnemy.y, vx: Math.sin(battleEnemy.angle)*7, vy: -Math.cos(battleEnemy.angle)*7, life: 60, hostile: true, damage: dmg}); shot = true; }
                    else if(fwd < -50) { projectiles.push({x: battleEnemy.x, y: battleEnemy.y, vx: Math.sin(battleEnemy.angle+Math.PI)*7, vy: -Math.cos(battleEnemy.angle+Math.PI)*7, life: 60, hostile: true, damage: dmg}); shot = true; }
                }
                if(side > 50) { projectiles.push({x: battleEnemy.x, y: battleEnemy.y, vx: Math.sin(battleEnemy.angle+1.57)*6.5, vy: -Math.cos(battleEnemy.angle+1.57)*6.5, life: 60, hostile: true, damage: dmg}); shot = true; }
                else if(side < -50) { projectiles.push({x: battleEnemy.x, y: battleEnemy.y, vx: Math.sin(battleEnemy.angle-1.57)*6.5, vy: -Math.cos(battleEnemy.angle-1.57)*6.5, life: 60, hostile: true, damage: dmg}); shot = true; }
                if(shot) battleEnemy.reload = 60 + Math.random()*40; 
            }
        }
    }

    projectiles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if(p.hostile && dist(p.x, p.y, player.gX, player.gY) < 18) { 
            player.hp -= Math.max(1, p.damage - player.upgrades.hull); p.life = 0; spawnExplosion(p.x, p.y, '#7f8c8d'); vibrate(200); if(player.hp <= 0) triggerSinking(false); 
        }
        if(!p.hostile && battleEnemy && dist(p.x, p.y, battleEnemy.x, battleEnemy.y) < 25) { 
            battleEnemy.hp -= 10 + player.upgrades.cannons; p.life = 0; spawnExplosion(p.x, p.y, '#7f8c8d'); if(battleEnemy.hp <= 0) triggerSinking(true); 
        }
    });
    projectiles = projectiles.filter(p => p.life > 0);
}

// === DRAW ===
function drawImageRotated(img, x, y, size, angle, alpha=1, isStatic=false) { if(!img || !img.complete) return; ctx.save(); ctx.translate(x, y); ctx.rotate(angle + (isStatic ? 0 : Math.PI)); ctx.globalAlpha = alpha; ctx.drawImage(img, -size/2, -size/2, size, size); ctx.restore(); }
function draw() {
    const cx = CX(), cy = CY(); ctx.clearRect(0, 0, canvas.width, canvas.height);
    function getScr(gx, gy) { return { x: gx - player.gX + cx, y: gy - player.gY + cy }; }
    waves.forEach(w => { let sway = Math.sin(gameTime * 0.1 + w.offset) * 20; let dx = (w.x + sway - player.gX % canvas.width + canvas.width) % canvas.width; let dy = (w.y - player.gY % canvas.height + canvas.height) % canvas.height; ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(dx, dy, 4, 2); });
    ports.forEach(port => { let p = getScr(port.x, port.y); let img = (port.type==='home')?sprites.portHome:sprites.portNormal; drawImageRotated(img, p.x, p.y, port.radius*2.6, 0, 1, true); });
    islands.forEach(i => { let p = getScr(i.x, i.y); drawImageRotated(sprites.island, p.x, p.y, i.radius*2.6, 0, 1, true); });
    rocks.forEach(r => { let p = getScr(r.x, r.y); drawImageRotated(sprites.rock, p.x, p.y, r.size*2, 0, 1, true); });
    enemies.forEach(e => { if(!isNaN(e.x)) { let p = getScr(e.x, e.y); let img = sprites.shipSmall; if(e.type==='med') img = sprites.shipMed; if(e.type==='big') img = sprites.shipBig; if(e.type==='ghost') img=sprites.ghost; if(e.type==='hunter') img=sprites.hunter; drawImageRotated(img, p.x, p.y, e.size*3, e.angle); if (gameState === STATE.BATTLE) { ctx.fillStyle = "black"; ctx.fillRect(p.x - 20, p.y - 40, 40, 5); ctx.fillStyle = "red"; ctx.fillRect(p.x - 20, p.y - 40, 40 * (e.hp/e.maxHp), 5); } } });
    if(sinkingEnemy) { let p = getScr(sinkingEnemy.x, sinkingEnemy.y); drawImageRotated(sprites.shipMed, p.x, p.y, sinkingEnemy.size*3, sinkingEnemy.angle, sinkingEnemy.alpha); }
    wakeParticles.forEach(p => { let pos = getScr(p.x, p.y); ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`; ctx.fillRect(pos.x, pos.y, p.size, p.size); });
    explosions.forEach(e => { let p = getScr(e.x, e.y); ctx.fillStyle = e.color; ctx.fillRect(p.x, p.y, e.size, e.size); });
    projectiles.forEach(p => { let pos = getScr(p.x, p.y); ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(pos.x, pos.y, 4, 0, Math.PI*2); ctx.fill(); });
    if(gameState !== STATE.MENU) drawImageRotated(sprites.player, cx, cy, 65, player.angle);
    if(gameState !== STATE.MENU && gameState !== STATE.PORT) {
        // HUD RESTAURADO (BARRA PEQUEÑA)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(10, 10, 154, 12); 
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(12, 12, 150 * (player.hp/player.maxHp), 8);
        
        ctx.textAlign = 'left'; ctx.font = 'bold 16px sans-serif'; 
        ctx.fillStyle = '#f1c40f'; ctx.fillText(`💰 ${player.inventory.gold}`, 10, 45); 
        ctx.fillStyle = '#e67e22'; ctx.fillText(`🍾 ${player.inventory.rum}`, 100, 45); 
        
        // CONTADOR DE MAPAS ABAJO DEL ORO
        ctx.fillStyle = '#3498db'; ctx.fillText(`🗺️ ${player.mapCount}`, 10, 70); 
        
        // MINIMAPA
        const ms = 150, m = 10; ctx.save(); ctx.translate(canvas.width - ms - m, m);
        if(sprites.minimap.complete) ctx.drawImage(sprites.minimap, 0, 0, ms, ms);
        const mid = ms/2; const scale = 0.02; 
        ports.forEach(p => { const dx = (p.x - player.gX)*scale, dy = (p.y - player.gY)*scale; if(Math.abs(dx)<mid-5 && Math.abs(dy)<mid-5) { ctx.fillStyle = "black"; ctx.font = "italic bold 8px serif"; ctx.textAlign = "center"; ctx.fillText(p.name, mid+dx, mid+dy - 8); ctx.font = "12px Arial"; ctx.fillText("⚓", mid+dx, mid+dy + 5); } });
        treasureSites.forEach(t => { if(!t.active) return; const dx = (t.x - player.gX)*scale, dy = (t.y - player.gY)*scale; if(Math.abs(dx)<mid-5 && Math.abs(dy)<mid-5) { ctx.fillStyle = "#f1c40f"; ctx.beginPath(); ctx.arc(mid+dx, mid+dy, 3, 0, Math.PI*2); ctx.fill(); } });
        // ISLAS EN MINIMAPA
        islands.forEach(i => { const dx = (i.x - player.gX)*scale, dy = (i.y - player.gY)*scale; if(Math.abs(dx)<mid-5 && Math.abs(dy)<mid-5) { ctx.fillStyle = "#27ae60"; ctx.beginPath(); ctx.arc(mid+dx, mid+dy, 3, 0, Math.PI*2); ctx.fill(); } });
        
        enemies.forEach(e => { const dx = (e.x - player.gX)*scale, dy = (e.y - player.gY)*scale; if(Math.abs(dx)<mid-5 && Math.abs(dy)<mid-5) { 
            ctx.fillStyle = "#e74c3c"; // Default red
            if (e.type === 'hunter') ctx.fillStyle = "black";
            if (e.type === 'ghost') ctx.fillStyle = (Math.floor(gameTime * 10) % 2 === 0) ? "#2ecc71" : "transparent";
            ctx.beginPath(); ctx.arc(mid+dx, mid+dy, 4, 0, Math.PI*2); ctx.fill(); 
        } });
        drawTriangle(ctx, mid, mid, 6, player.angle); ctx.restore();
    }
}

function setupControls() {
    const btnMap = { 'btn-left': 'Left', 'btn-right': 'Right' };
    Object.keys(btnMap).forEach(id => { const el = document.getElementById(id); el.onmousedown = el.ontouchstart = (e) => { e.preventDefault(); keys[btnMap[id]] = true; }; el.onmouseup = el.ontouchend = () => { keys[btnMap[id]] = false; }; });
    ui.anchorBtn.onclick = () => { player.isSailing = !player.isSailing; ui.anchorBtn.classList.toggle('sailing'); showMsg(player.isSailing ? "¡LEVAR ANCLAS!" : "¡LANZAR EL ANCLA!"); };
    ui.btnShootL.onclick = () => { if(player.reloadTimer<=0) { projectiles.push({x:player.gX, y:player.gY, vx:Math.sin(player.angle-1.57)*7, vy:-Math.cos(player.angle-1.57)*7, life:50, hostile:false}); fireSpecialWeapons(); player.reloadTimer = 60; } };
    ui.btnShootR.onclick = () => { if(player.reloadTimer<=0) { projectiles.push({x:player.gX, y:player.gY, vx:Math.sin(player.angle+1.57)*7, vy:-Math.cos(player.angle+1.57)*7, life:50, hostile:false}); fireSpecialWeapons(); player.reloadTimer = 60; } };
}

function fireSpecialWeapons() {
    if(player.upgrades.frontCannon) projectiles.push({x:player.gX, y:player.gY, vx:Math.sin(player.angle)*7, vy:-Math.cos(player.angle)*7, life:50, hostile:false}); 
    if(player.upgrades.rearCannon) projectiles.push({x:player.gX, y:player.gY, vx:Math.sin(player.angle+Math.PI)*7, vy:-Math.cos(player.angle+Math.PI)*7, life:50, hostile:false}); 
}

setupControls();
function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();