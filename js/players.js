const ELEMENT_COLORS = {
    Anemo: "#6dcfc4",
    Geo: "#e8c14f",
    Electro: "#b17ee0",
    Dendro: "#a0c93d",
    Hydro: "#4cc2f1",
    Pyro: "#ef7938",
    Cryo: "#9fd8e6"
};

function initialsFor(name) {
    return name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

document.addEventListener("DOMContentLoaded", () => {
    showSupabaseWarning();

    const listEl = document.getElementById("player-list");
    const formEl = document.getElementById("add-player-form");
    const nameInput = document.getElementById("new-player-name");
    const errorEl = document.getElementById("player-error");
    const hubEl = document.getElementById("player-hub");
    const hubNameEl = document.getElementById("hub-player-name");
    const ownedHeadingEl = document.getElementById("owned-characters-heading");
    const ownedGridEl = document.getElementById("owned-characters");

    let allCharacters = null;

    function showError(message) {
        errorEl.textContent = message;
        errorEl.classList.remove("d-none");
    }

    async function loadOwnedCharacters(playerId) {
        ownedGridEl.innerHTML = "";
        ownedHeadingEl.textContent = "";

        if (!allCharacters) {
            allCharacters = await fetch("data/characters.json").then((r) => r.json());
        }

        if (!window.supabaseConfigured) return;

        const { data, error } = await window.supabaseClient
            .from("player_characters")
            .select("character_id")
            .eq("player_id", playerId);

        if (error) {
            showError("Couldn't load owned characters: " + error.message);
            return;
        }

        const ownedIds = new Set((data || []).map((row) => row.character_id));
        const ownedCharacters = allCharacters
            .filter((c) => ownedIds.has(c.id))
            .sort((a, b) => a.name.localeCompare(b.name));

        ownedHeadingEl.textContent = `Owned characters (${ownedCharacters.length})`;

        if (ownedCharacters.length === 0) {
            ownedGridEl.innerHTML = '<p class="text-muted">No characters marked yet — head to "Edit My Characters" to add some.</p>';
            return;
        }

        ownedCharacters.forEach((character) => {
            const col = document.createElement("div");
            col.className = "col-6 col-sm-4 col-md-3 col-lg-2 mb-2";

            const card = document.createElement("div");
            card.className = "character-card w-100";
            card.style.borderColor = ELEMENT_COLORS[character.element] || "#ccc";

            const avatar = document.createElement("div");
            avatar.className = "character-avatar";
            avatar.style.backgroundColor = ELEMENT_COLORS[character.element] || "#999";

            const fallback = document.createElement("span");
            fallback.textContent = initialsFor(character.name);
            avatar.appendChild(fallback);

            const img = document.createElement("img");
            img.className = "character-avatar-img";
            img.src = `images/characters/${character.id}.png`;
            img.alt = character.name;
            img.loading = "lazy";
            img.addEventListener("error", () => img.remove(), { once: true });
            avatar.appendChild(img);

            const info = document.createElement("div");
            info.className = "character-info";
            info.innerHTML = `<span class="character-name">${character.name}</span><small class="text-muted">${character.region ? character.region + " &middot; " : ""}${character.element} &middot; ${character.weapon}</small>`;

            card.appendChild(avatar);
            card.appendChild(info);
            col.appendChild(card);
            ownedGridEl.appendChild(col);
        });
    }

    function selectPlayer(id, name) {
        localStorage.setItem("player_id", id);
        localStorage.setItem("player_name", name);
        hubNameEl.textContent = name;
        hubEl.classList.remove("d-none");
        hubEl.scrollIntoView({ behavior: "smooth" });
        loadOwnedCharacters(id);
    }

    async function loadPlayers() {
        if (!window.supabaseConfigured) return;
        const { data, error } = await window.supabaseClient
            .from("players")
            .select("id, name")
            .order("name", { ascending: true });

        if (error) {
            showError("Couldn't load players: " + error.message);
            return;
        }

        listEl.innerHTML = "";
        data.forEach((player) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-outline-primary m-1";
            btn.textContent = player.name;
            btn.addEventListener("click", () => selectPlayer(player.id, player.name));
            listEl.appendChild(btn);
        });

        if (data.length === 0) {
            listEl.innerHTML = '<p class="text-muted">No players yet, add one below!</p>';
        }
    }

    formEl.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorEl.classList.add("d-none");

        const name = nameInput.value.trim();
        if (!name) return;

        if (!window.supabaseConfigured) {
            showError("Supabase isn't configured yet, can't add players.");
            return;
        }

        const { data, error } = await window.supabaseClient
            .from("players")
            .insert({ name })
            .select("id, name")
            .single();

        if (error) {
            showError("Couldn't add player: " + error.message);
            return;
        }

        nameInput.value = "";
        await loadPlayers();
        selectPlayer(data.id, data.name);
    });

    loadPlayers();
});
