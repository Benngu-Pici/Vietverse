const mapData = {
  minX: 1, maxX: 14,
  minY: 4, maxY: 12,
  blockedSpaces: {
    "7x4": true, "1x11": true, "12x10": true,
    "4x7": true, "5x7": true, "6x7": true,
    "8x6": true, "9x6": true, "10x6": true,
    "7x9": true, "8x9": true, "9x9": true,
  },
};

const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];
const SKIN_PRICES = { red: 10, orange: 15, yellow: 20, green: 25, purple: 30 };

const MERCHANT = { x: 12, y: 4, name: "THƯƠNG NHÂN" };
const NPC_ELDER = { x: 2, y: 10, name: "LÃO NHÂN" };

const DIALOGUE_CONTENT = [
  "Chào con! Ta là người giữ gìn truyền thống làng nghề nón lá Việt Nam.",
  "Con có biết chiếc nón lá Việt Nam đã có từ hàng nghìn năm trước không?",
  "Nón lá là biểu tượng đẹp đẽ của người phụ nữ Việt Nam qua bao thế hệ.",
  "Nón được làm từ lá cọ hoặc lá dừa, khung tre được uốn khéo léo, rất bền và nhẹ.",
  "Ngày xưa, nón lá che nắng che mưa cho người nông dân trên đồng ruộng.",
  "Người đội nón lá khi đi chợ, khi làm đồng, khi tham gia lễ hội truyền thống.",
  "Ngày nay, nón lá còn là món quà ý nghĩa dành tặng cho bạn bè quốc tế.",
  "Mỗi chiếc nón lá chứa đựng tâm huyết của người nghệ nhân làng nghề.",
  "Hãy giữ gìn và trân trọng văn hóa dân tộc Việt Nam con nhé!",
  "Chúc con luôn may mắn và thành công trên hành trình của mình! 🌾🌾🌾"
];

const CAMERA_SCALE = 4;
const TILE = 16;

// Movement tuning
const MAX_SPEED   = 1.5;   // pixels per frame tối đa
const ACCEL       = 0.4;   // tăng tốc mỗi frame
const FRICTION    = 0.75;  // hệ số giảm tốc mỗi frame
const CAMERA_LERP = 1.0;

// Collision: treat each grid cell as a 16×16 box.
// Player hitbox is 8×8 centered in the tile.
const HITBOX = 6; // half-width/height of player hitbox in px

function randomFromArray(array) { return array[Math.floor(Math.random() * array.length)]; }
function getKeyString(x, y) { return `${x}x${y}`; }

function createName() {
  const prefix = randomFromArray(["COOL","SUPER","HIP","SMUG","SILKY","GOOD","SAFE","DEAR","DAMP","WARM","RICH","LONG","DARK","SOFT","BUFF","DOPE"]);
  const animal = randomFromArray(["BEAR","DOG","CAT","FOX","LAMB","LION","BOAR","GOAT","VOLE","SEAL","PUMA","MULE","BULL","BIRD","BUG"]);
  return `${prefix} ${animal}`;
}

// isSolid still works on grid coords for blocked spaces
function isSolidGrid(gx, gy) {
  const key = getKeyString(gx, gy);
  if (mapData.blockedSpaces[key]) return true;
  if (gx >= mapData.maxX || gx < mapData.minX) return true;
  if (gy >= mapData.maxY || gy < mapData.minY) return true;
  return false;
}

// Check if a pixel-space point is inside a solid tile
// px, py = pixel position (top-left of 16×16 tile the player is in)
function isSolidPixel(px, py) {
  const gx = Math.floor(px / TILE);
  const gy = Math.floor(py / TILE);
  return isSolidGrid(gx, gy);
}

// AABB sweep: can the player (center cx,cy with half-size HITBOX) move to (cx+dx, cy+dy)?
// Returns the farthest valid {x,y} after sliding collision.
function moveAndSlide(cx, cy, dx, dy) {
  let nx = cx + dx;
  let ny = cy + dy;

  // Check X axis
  const testX = nx;
  const testY = cy;
  if (isSolidPixel(testX - HITBOX, testY - HITBOX) ||
      isSolidPixel(testX + HITBOX - 1, testY - HITBOX) ||
      isSolidPixel(testX - HITBOX, testY + HITBOX - 1) ||
      isSolidPixel(testX + HITBOX - 1, testY + HITBOX - 1)) {
    nx = cx; // blocked on X
  }

  // Check Y axis independently (slide)
  const testX2 = nx;
  const testY2 = ny;
  if (isSolidPixel(testX2 - HITBOX, testY2 - HITBOX) ||
      isSolidPixel(testX2 + HITBOX - 1, testY2 - HITBOX) ||
      isSolidPixel(testX2 - HITBOX, testY2 + HITBOX - 1) ||
      isSolidPixel(testX2 + HITBOX - 1, testY2 + HITBOX - 1)) {
    ny = cy; // blocked on Y
  }

  return { x: nx, y: ny };
}

function getRandomSafeSpot() {
  return randomFromArray([
    {x:1,y:4},{x:2,y:4},{x:1,y:5},{x:2,y:6},{x:2,y:8},{x:2,y:9},
    {x:4,y:8},{x:5,y:5},{x:5,y:8},{x:5,y:10},{x:5,y:11},
    {x:11,y:7},{x:12,y:7},{x:13,y:7},{x:13,y:6},{x:13,y:8},
    {x:7,y:6},{x:7,y:7},{x:7,y:8},{x:8,y:8},{x:10,y:8},{x:11,y:4},
  ]);
}

function getPurchasedSkinsFromFirebase(skins) { return skins || { blue: true }; }

(function () {
  let playerId, playerRef;
  let players = {}, playerElements = {};
  let coins = {}, coinElements = {};

  const gameContainer = document.querySelector(".game-container");
  const cameraPan     = document.getElementById("camera-pan");
  const playerNameInput  = document.querySelector("#player-name");
  const merchantModal    = document.querySelector("#merchant-modal");
  const closeModalBtn    = document.querySelector("#close-modal");
  const skinShopList     = document.querySelector("#skin-shop-list");
  const merchantMessage  = document.querySelector("#merchant-message");
  const playerCoinsDisplay = document.querySelector("#player-coins");
  const coordDisplay     = document.querySelector("#coord-display");
  const npcDialogueBox   = document.querySelector("#npc-dialogue-box");
  const pokeText         = document.querySelector("#poke-text");
  const pokeInner        = document.querySelector("#poke-inner");

  let currentDialogueIndex = 0;
  let isInDialogue = false;
  let merchantCreated = false, npcCreated = false;

  // ─── LOCAL PLAYER STATE (pixel-space, float) ───────────────────────────────
  // px/py = pixel center of player in game-space (not scaled)
  let localX = 0, localY = 0;   // pixel position
  let velX = 0,   velY = 0;     // pixel velocity per ms

  // Camera smooth position (pixel center to show, in game-space)
  let camX = 0, camY = 0;

  // Pressed keys
  const keys = {};

  // Joystick input (-1..1)
  let joyX = 0, joyY = 0;

  // Firebase throttle
  let lastFirebaseSend = 0;
  const FB_THROTTLE = 100; // ms

  // ─── CAMERA ────────────────────────────────────────────────────────────────
  function renderCamera() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tx = vw / 2 - camX * CAMERA_SCALE;
    const ty = vh / 2 - camY * CAMERA_SCALE;
    cameraPan.style.transform = `translate(${tx}px, ${ty}px)`;
  }

  // ─── GAME LOOP ──────────────────────────────────────────────────────────────
  let lastTime = null;

  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(timestamp - lastTime, 50); // cap at 50ms to avoid spiral
    lastTime = timestamp;

    // --- Input direction ---
    let inputX = 0, inputY = 0;
    if (keys["ArrowLeft"]  || keys["KeyA"]) inputX -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) inputX += 1;
    if (keys["ArrowUp"]    || keys["KeyW"]) inputY -= 1;
    if (keys["ArrowDown"]  || keys["KeyS"]) inputY += 1;

    // Joystick overrides if active
    if (Math.abs(joyX) > 0.1 || Math.abs(joyY) > 0.1) {
      inputX = joyX;
      inputY = joyY;
    }

    // Normalize diagonal
    if (inputX !== 0 && inputY !== 0) {
      inputX *= 0.707;
      inputY *= 0.707;
    }

    // --- Velocity ---
    if (inputX !== 0 || inputY !== 0) {
      velX += inputX * ACCEL;
      velY += inputY * ACCEL;
      // Giới hạn tốc độ tối đa
      const speed = Math.sqrt(velX * velX + velY * velY);
      if (speed > MAX_SPEED) {
        velX = (velX / speed) * MAX_SPEED;
        velY = (velY / speed) * MAX_SPEED;
      }
    }
    velX *= FRICTION;
    velY *= FRICTION;

    // Clamp tiny velocities to zero (stop drift)
    if (Math.abs(velX) < 0.01) velX = 0;
    if (Math.abs(velY) < 0.01) velY = 0;

    if ((velX !== 0 || velY !== 0) && playerId && players[playerId]) {
      // Move with collision — velocity đã là px/frame, không nhân dt nữa
      const result = moveAndSlide(localX, localY, velX, velY);
      // If blocked, zero out that velocity component
      if (result.x === localX) velX = 0;
      if (result.y === localY) velY = 0;
      localX = result.x;
      localY = result.y;

      // Update direction
      if (velX > 0.05) players[playerId].direction = "right";
      else if (velX < -0.05) players[playerId].direction = "left";

      // Update the DOM element for local player
      const el = playerElements[playerId];
      if (el) {
        el.style.transform = `translate3d(${localX - TILE/2}px, ${localY - TILE/2 - 4}px, 0)`;
        el.setAttribute("data-direction", players[playerId].direction);
      }

      // Sync to Firebase (throttled)
      const now = performance.now();
      if (now - lastFirebaseSend > FB_THROTTLE) {
        lastFirebaseSend = now;
        const gx = Math.floor(localX / TILE);
        const gy = Math.floor(localY / TILE);
        players[playerId].x = gx;
        players[playerId].y = gy;
        players[playerId].px = localX;
        players[playerId].py = localY;
        playerRef.update({
          x: gx, y: gy,
          px: localX, py: localY,
          direction: players[playerId].direction,
        });
        // Coin / interaction checks at grid level
        attemptGrabCoin(gx, gy);
        checkMerchantInteraction(gx, gy);
        checkNpcInteraction(gx, gy);
        updateCoordDisplay(gx, gy);
      }
    }

    // --- Camera smooth follow ---
    camX += (localX - camX) * CAMERA_LERP;
    camY += (localY - camY) * CAMERA_LERP;
    renderCamera();

    requestAnimationFrame(gameLoop);
  }

  // ─── COIN / UI ─────────────────────────────────────────────────────────────
  function updatePlayerCoinsDisplay(c) {
    if (playerCoinsDisplay) playerCoinsDisplay.textContent = c;
  }

  function updateCoordDisplay(gx, gy) {
    if (coordDisplay) coordDisplay.innerHTML = `📍 X: ${gx} | Y: ${gy}`;
  }

  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    firebase.database().ref(`coins/${getKeyString(x, y)}`).set({ x, y });
    setTimeout(placeCoin, randomFromArray([2000, 3000, 4000, 5000]));
  }

  function attemptGrabCoin(gx, gy) {
    const key = getKeyString(gx, gy);
    if (coins[key]) {
      firebase.database().ref(`coins/${key}`).remove();
      const p = players[playerId];
      if (p) playerRef.update({ coins: p.coins + 1 });
    }
  }

  // ─── MERCHANT / NPC ────────────────────────────────────────────────────────
  function openMerchantModal() {
    renderSkinShop();
    merchantModal.style.display = "flex";
  }
  function closeMerchantModal() { merchantModal.style.display = "none"; }

  let lastMerchantCheck = "";
  function checkMerchantInteraction(gx, gy) {
    const key = `${gx},${gy}`;
    if (key !== lastMerchantCheck && gx === MERCHANT.x && gy === MERCHANT.y) {
      lastMerchantCheck = key;
      openMerchantModal();
    } else if (gx !== MERCHANT.x || gy !== MERCHANT.y) {
      lastMerchantCheck = "";
    }
  }

  let lastNpcCheck = "";
  function checkNpcInteraction(gx, gy) {
    const key = `${gx},${gy}`;
    if (key !== lastNpcCheck && gx === NPC_ELDER.x && gy === NPC_ELDER.y) {
      lastNpcCheck = key;
      openNpcDialogue();
    } else if (gx !== NPC_ELDER.x || gy !== NPC_ELDER.y) {
      lastNpcCheck = "";
    }
  }

  // ─── POKÉMON DIALOGUE ──────────────────────────────────────────────────────
  function openNpcDialogue() {
    currentDialogueIndex = 0;
    isInDialogue = true;
    showDialogueLine();
    npcDialogueBox.style.display = "block";
    document.addEventListener("keydown", onDialogueKey);
    npcDialogueBox.addEventListener("click", advanceDialogue);
  }

  function closeNpcDialogue() {
    npcDialogueBox.style.display = "none";
    isInDialogue = false;
    currentDialogueIndex = 0;
    document.removeEventListener("keydown", onDialogueKey);
    npcDialogueBox.removeEventListener("click", advanceDialogue);
  }

  function onDialogueKey(e) {
    if (e.code === "Space" || e.code === "Enter" || e.code === "KeyZ") {
      e.preventDefault(); advanceDialogue();
    }
    if (e.code === "Escape") closeNpcDialogue();
  }

  function showDialogueLine() {
    pokeText.textContent = DIALOGUE_CONTENT[currentDialogueIndex];
    pokeInner.classList.toggle("last-line", currentDialogueIndex === DIALOGUE_CONTENT.length - 1);
  }

  function advanceDialogue() {
    if (currentDialogueIndex < DIALOGUE_CONTENT.length - 1) {
      currentDialogueIndex++;
      showDialogueLine();
    } else {
      closeNpcDialogue();
    }
  }

  // ─── SKIN SHOP ─────────────────────────────────────────────────────────────
  function renderSkinShop() {
    const playerData = players[playerId];
    if (!playerData) return;
    const purchasedSkins = getPurchasedSkinsFromFirebase(playerData.purchasedSkins);
    const playerCoins = playerData.coins;
    skinShopList.innerHTML = "";
    playerColors.forEach((color) => {
      const isOwned = purchasedSkins[color] === true;
      const isCurrent = playerData.color === color;
      const price = SKIN_PRICES[color] || 0;
      const skinItem = document.createElement("div");
      skinItem.className = "skin-item";
      skinItem.setAttribute("data-color", color);
      const buttonText = isCurrent ? "✓ ĐANG DÙNG" : (isOwned ? "SỬ DỤNG" : `MUA ${price} XU`);
      skinItem.innerHTML = `
        <div class="skin-preview Character" data-color="${color}" data-direction="right">
          <div class="Character_shadow grid-cell"></div>
          <div class="Character_sprite grid-cell"></div>
        </div>
        <div class="skin-name">${color.toUpperCase()}</div>
        <button class="skin-buy-btn" data-color="${color}" ${isCurrent ? "disabled" : ""}>${buttonText}</button>
      `;
      const btn = skinItem.querySelector(".skin-buy-btn");
      if (!isCurrent) {
        btn.addEventListener("click", () => {
          if (isOwned) {
            playerRef.update({ color });
            merchantMessage.textContent = `✨ Đã trang bị skin ${color}! ✨`;
          } else if (playerCoins >= price) {
            playerRef.update({ purchasedSkins: { ...purchasedSkins, [color]: true }, coins: playerCoins - price, color });
            merchantMessage.textContent = `🎉 Đã mua skin ${color} với giá ${price} xu! 🎉`;
          } else {
            merchantMessage.textContent = `❌ Không đủ xu! Cần thêm ${price - playerCoins} xu. ❌`;
          }
          setTimeout(() => { merchantMessage.textContent = "Chào mừng! Mua skin bằng xu của bạn!"; }, 2000);
          renderSkinShop();
        });
      }
      skinShopList.appendChild(skinItem);
    });
  }

  // ─── NPC / MERCHANT ELEMENTS ───────────────────────────────────────────────
  function createMerchantElement() {
    const old = document.querySelector(".merchant");
    if (old) old.remove();
    const el = document.createElement("div");
    el.classList.add("Character", "grid-cell", "merchant");
    el.innerHTML = `
      <div class="Character_shadow grid-cell"></div>
      <div class="Character_sprite grid-cell"></div>
      <div class="Character_name-container"><span class="Character_name">${MERCHANT.name}</span></div>
    `;
    el.setAttribute("data-color", "purple");
    el.setAttribute("data-direction", "right");
    el.style.transform = `translate3d(${16 * MERCHANT.x}px, ${16 * MERCHANT.y - 4}px, 0)`;
    el.style.position = "absolute"; el.style.left = "0"; el.style.top = "0";
    gameContainer.appendChild(el);
    merchantCreated = true;
  }

  function createNpcElderElement() {
    const old = document.querySelector(".npc-elder");
    if (old) old.remove();
    const el = document.createElement("div");
    el.classList.add("Character", "grid-cell", "npc-elder");
    el.innerHTML = `
      <div class="Character_shadow grid-cell"></div>
      <div class="Character_sprite grid-cell"></div>
      <div class="Character_name-container"><span class="Character_name">${NPC_ELDER.name}</span></div>
    `;
    el.setAttribute("data-color", "green");
    el.setAttribute("data-direction", "right");
    el.style.transform = `translate3d(${16 * NPC_ELDER.x}px, ${16 * NPC_ELDER.y - 4}px, 0)`;
    el.style.position = "absolute"; el.style.left = "0"; el.style.top = "0";
    gameContainer.appendChild(el);
    npcCreated = true;
  }

  // ─── MOBILE JOYSTICK ───────────────────────────────────────────────────────
  function setupMobileControls() {
    const joystickBase  = document.getElementById("joystick-base");
    const joystickThumb = document.getElementById("joystick-thumb");
    if (joystickBase && joystickThumb) {
      new Joystick(joystickBase, joystickThumb, (x, y) => {
        joyX = x; joyY = y;
      });
    }
  }

  // ─── INIT ──────────────────────────────────────────────────────────────────
  function initGame() {
    // Keyboard tracking (held keys, not press events)
    document.addEventListener("keydown", (e) => { keys[e.code] = true; });
    document.addEventListener("keyup",   (e) => { keys[e.code] = false; });

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef   = firebase.database().ref(`coins`);

    allPlayersRef.on("value", (snapshot) => {
      players = snapshot.val() || {};
      Object.keys(players).forEach((key) => {
        if (key === playerId) return; // local player rendered by game loop
        const s = players[key];
        const el = playerElements[key];
        if (!el) return;
        el.querySelector(".Character_name").innerText = s.name;
        el.querySelector(".Character_coins").innerText = s.coins;
        el.setAttribute("data-color", s.color);
        el.setAttribute("data-direction", s.direction);
        // Use sub-pixel position if available, else grid
        const rpx = (s.px !== undefined) ? s.px - TILE/2 : 16 * s.x;
        const rpy = (s.py !== undefined) ? s.py - TILE/2 - 4 : 16 * s.y - 4;
        el.style.transform = `translate3d(${rpx}px, ${rpy}px, 0)`;
      });
      // Update our own coins display
      if (players[playerId] && playerCoinsDisplay) {
        updatePlayerCoinsDisplay(players[playerId].coins);
      }
    });

    allPlayersRef.on("child_added", (snapshot) => {
      const p = snapshot.val();
      if (playerElements[p.id]) return;
      const el = document.createElement("div");
      el.classList.add("Character", "grid-cell");
      if (p.id === playerId) el.classList.add("you");
      el.innerHTML = `
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `;
      playerElements[p.id] = el;
      el.querySelector(".Character_name").innerText = p.name;
      el.querySelector(".Character_coins").innerText = p.coins;
      el.setAttribute("data-color", p.color);
      el.setAttribute("data-direction", p.direction);
      const rpx = (p.px !== undefined) ? p.px - TILE/2 : 16 * p.x;
      const rpy = (p.py !== undefined) ? p.py - TILE/2 - 4 : 16 * p.y - 4;
      el.style.transform = `translate3d(${rpx}px, ${rpy}px, 0)`;
      gameContainer.appendChild(el);
    });

    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      if (playerElements[removedKey]) {
        gameContainer.removeChild(playerElements[removedKey]);
        delete playerElements[removedKey];
      }
    });

    allCoinsRef.on("value", (snapshot) => { coins = snapshot.val() || {}; });

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;
      const el = document.createElement("div");
      el.classList.add("Coin", "grid-cell");
      el.innerHTML = `<div class="Coin_shadow grid-cell"></div><div class="Coin_sprite grid-cell"></div>`;
      el.style.transform = `translate3d(${16 * coin.x}px, ${16 * coin.y - 4}px, 0)`;
      coinElements[key] = el;
      gameContainer.appendChild(el);
    });

    allCoinsRef.on("child_removed", (snapshot) => {
      const { x, y } = snapshot.val();
      const key = getKeyString(x, y);
      if (coinElements[key]) { gameContainer.removeChild(coinElements[key]); delete coinElements[key]; }
    });

    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({ name: newName });
    });

    closeModalBtn.addEventListener("click", closeMerchantModal);
    window.addEventListener("click", (e) => {
      if (e.target === merchantModal) closeMerchantModal();
    });

    window.addEventListener("resize", () => renderCamera());

    setTimeout(() => {
      if (!merchantCreated) createMerchantElement();
      if (!npcCreated) createNpcElderElement();
    }, 100);

    placeCoin();
    setupMobileControls();

    // Start game loop
    requestAnimationFrame(gameLoop);
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);
      const name = createName();
      playerNameInput.value = name;
      const spot = getRandomSafeSpot();
      // Convert grid spawn to pixel center
      localX = spot.x * TILE + TILE / 2;
      localY = spot.y * TILE + TILE / 2;
      camX = localX; camY = localY; // start camera instantly at player
      playerRef.set({
        id: playerId, name,
        direction: "right", color: "blue",
        x: spot.x, y: spot.y,
        px: localX, py: localY,
        coins: 0, purchasedSkins: { blue: true },
      });
      players[playerId] = { x: spot.x, y: spot.y, px: localX, py: localY, coins: 0, color: "blue", direction: "right", name, id: playerId, purchasedSkins: { blue: true } };
      playerRef.on("value", (snapshot) => {
        const data = snapshot.val();
        if (data && playerCoinsDisplay) updatePlayerCoinsDisplay(data.coins);
        if (data) players[playerId] = { ...players[playerId], ...data };
      });
      playerRef.onDisconnect().remove();
      initGame();
    }
  });

  firebase.auth().signInAnonymously().catch((err) => console.log(err.code, err.message));
})();