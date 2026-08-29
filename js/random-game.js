const ELEMENT_COLORS = {
    Anemo: "#6dcfc4",
    Geo: "#e8c14f",
    Electro: "#b17ee0",
    Dendro: "#a0c93d",
    Hydro: "#4cc2f1",
    Pyro: "#ef7938",
    Cryo: "#9fd8e6"
};
const WHEEL_COLORS = ["#f2c9d4", "#c9e4f2", "#f2e6c9", "#d4f2c9", "#e0c9f2", "#f2d4c9"];

let currentItems = [];
let currentRotationDeg = 0;
let spinning = false;

document.addEventListener("DOMContentLoaded", async () => {
    showSupabaseWarning();

    const playerId = localStorage.getItem("player_id");
    const playerName = localStorage.getItem("player_name");

    if (!playerId) {
        window.location.href = "player.html";
        return;
    }

    document.getElementById("current-player-name").textContent = playerName;

    const [characters, bosses] = await Promise.all([
        fetch("data/characters.json").then((r) => r.json()),
        fetch("data/bosses.json").then((r) => r.json())
    ]);

    let ownedCharacterIds = new Set();
    if (window.supabaseConfigured) {
        const { data, error } = await window.supabaseClient
            .from("player_characters")
            .select("character_id")
            .eq("player_id", playerId);
        if (!error) ownedCharacterIds = new Set(data.map((row) => row.character_id));
    }

    const ownedCharacters = characters.filter((c) => ownedCharacterIds.has(c.id));
    const characterPool = ownedCharacters.length > 0 ? ownedCharacters : characters;
    const usingFallback = ownedCharacters.length === 0;

    const modeCharactersBtn = document.getElementById("mode-characters");
    const modeBossesBtn = document.getElementById("mode-bosses");
    const poolNoteEl = document.getElementById("pool-note");
    const spinBtn = document.getElementById("spin-btn");
    const resultEl = document.getElementById("spin-result");
    const wheelCanvas = document.getElementById("wheel-canvas");

    function labelFor(item, mode) {
        return mode === "characters" ? item.name : item.name;
    }

    function colorFor(item, index, mode) {
        if (mode === "characters") return ELEMENT_COLORS[item.element] || WHEEL_COLORS[index % WHEEL_COLORS.length];
        return WHEEL_COLORS[index % WHEEL_COLORS.length];
    }

    function setMode(mode) {
        resultEl.classList.add("d-none");
        wheelCanvas.style.transition = "none";
        currentRotationDeg = 0;
        wheelCanvas.style.transform = "rotate(0deg)";

        if (mode === "characters") {
            modeCharactersBtn.classList.add("active");
            modeBossesBtn.classList.remove("active");
            currentItems = characterPool;
            poolNoteEl.textContent = usingFallback
                ? "You haven't marked any owned characters yet, so this spins the full roster."
                : `Spinning only ${playerName}'s owned characters (${characterPool.length}).`;
        } else {
            modeBossesBtn.classList.add("active");
            modeCharactersBtn.classList.remove("active");
            currentItems = bosses;
            poolNoteEl.textContent = `Spinning all ${bosses.length} bosses.`;
        }

        drawWheel(wheelCanvas, currentItems, mode);
    }

    modeCharactersBtn.addEventListener("click", () => setMode("characters"));
    modeBossesBtn.addEventListener("click", () => setMode("bosses"));

    spinBtn.addEventListener("click", () => {
        if (spinning || currentItems.length === 0) return;
        const mode = modeCharactersBtn.classList.contains("active") ? "characters" : "bosses";
        spin(wheelCanvas, currentItems, mode, resultEl);
    });

    setMode("characters");

    function drawWheel(canvas, items, mode) {
        const ctx = canvas.getContext("2d");
        const size = canvas.width;
        const center = size / 2;
        const radius = center - 4;
        const segAngle = (2 * Math.PI) / items.length;

        ctx.clearRect(0, 0, size, size);

        items.forEach((item, i) => {
            const start = i * segAngle - Math.PI / 2;
            const end = start + segAngle;

            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, start, end);
            ctx.closePath();
            ctx.fillStyle = colorFor(item, i, mode);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();

            if (items.length <= 40) {
                ctx.save();
                ctx.translate(center, center);
                ctx.rotate(start + segAngle / 2);
                ctx.textAlign = "right";
                ctx.fillStyle = "#222";
                ctx.font = items.length > 20 ? "9px Barlow, sans-serif" : "12px Barlow, sans-serif";
                ctx.fillText(labelFor(item, mode), radius - 6, 4);
                ctx.restore();
            }
        });
    }

    function spin(canvas, items, mode, resultEl) {
        spinning = true;
        resultEl.classList.add("d-none");

        const winningIndex = Math.floor(Math.random() * items.length);
        const segAngleDeg = 360 / items.length;
        const wedgeCenterDeg = winningIndex * segAngleDeg + segAngleDeg / 2;

        // Pointer is fixed at the top (0deg). We need the winning wedge's center
        // to land at the top after rotation, plus a few extra full spins for effect.
        const targetOffset = ((360 - wedgeCenterDeg) % 360 + 360) % 360;
        const extraSpins = 6 * 360;
        currentRotationDeg += extraSpins + targetOffset - (currentRotationDeg % 360);

        canvas.style.transition = "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
        canvas.style.transform = `rotate(${currentRotationDeg}deg)`;

        setTimeout(() => {
            spinning = false;
            const winner = items[winningIndex];
            resultEl.textContent = `🎉 ${labelFor(winner, mode)}!`;
            resultEl.classList.remove("d-none");
        }, 4100);
    }
});
