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

document.addEventListener("DOMContentLoaded", async () => {
    showSupabaseWarning();

    const playerId = localStorage.getItem("player_id");
    const playerName = localStorage.getItem("player_name");
    const nameEl = document.getElementById("current-player-name");
    const gridEl = document.getElementById("character-grid");
    const saveBtn = document.getElementById("save-btn");
    const statusEl = document.getElementById("save-status");
    const regionFilterEl = document.getElementById("filter-region");
    const elementFilterEl = document.getElementById("filter-element");
    const filterResetBtn = document.getElementById("filter-reset");
    const filterSummaryEl = document.getElementById("filter-summary");

    if (!playerId) {
        window.location.href = "player.html";
        return;
    }
    nameEl.textContent = playerName;

    const [charactersRes, ownedRes] = await Promise.all([
        fetch("data/characters.json").then((r) => r.json()),
        window.supabaseConfigured
            ? window.supabaseClient.from("player_characters").select("character_id").eq("player_id", playerId)
            : Promise.resolve({ data: [] })
    ]);

    const characters = charactersRes;
    const owned = new Set((ownedRes.data || []).map((row) => row.character_id));

    const regions = [...new Set(characters.map((c) => c.region).filter(Boolean))].sort();
    regions.forEach((region) => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = region;
        regionFilterEl.appendChild(option);
    });

    const elements = [...new Set(characters.map((c) => c.element).filter(Boolean))].sort();
    elements.forEach((element) => {
        const option = document.createElement("option");
        option.value = element;
        option.textContent = element;
        elementFilterEl.appendChild(option);
    });

    gridEl.innerHTML = "";
    characters.forEach((character) => {
        const col = document.createElement("div");
        col.className = "col-6 col-sm-4 col-md-3 col-lg-2 mb-2";
        col.dataset.region = character.region || "";
        col.dataset.element = character.element || "";

        const label = document.createElement("label");
        label.className = "character-card w-100";
        label.style.borderColor = ELEMENT_COLORS[character.element] || "#ccc";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "form-check-input mt-0";
        checkbox.value = character.id;
        checkbox.checked = owned.has(character.id);

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

        label.appendChild(checkbox);
        label.appendChild(avatar);
        label.appendChild(info);
        col.appendChild(label);
        gridEl.appendChild(col);
    });

    function applyFilters() {
        const region = regionFilterEl.value;
        const element = elementFilterEl.value;
        let visibleCount = 0;
        gridEl.querySelectorAll(":scope > div").forEach((col) => {
            const matchesRegion = !region || col.dataset.region === region;
            const matchesElement = !element || col.dataset.element === element;
            col.hidden = !(matchesRegion && matchesElement);
            if (!col.hidden) visibleCount++;
        });

        if (!region && !element) {
            filterSummaryEl.textContent = `Showing all ${visibleCount} characters.`;
        } else {
            const parts = [];
            if (region) parts.push(region);
            if (element) parts.push(element);
            filterSummaryEl.textContent = `Showing ${visibleCount} characters — ${parts.join(" · ")}.`;
        }
    }

    regionFilterEl.addEventListener("change", applyFilters);
    elementFilterEl.addEventListener("change", applyFilters);
    filterResetBtn.addEventListener("click", () => {
        regionFilterEl.value = "";
        elementFilterEl.value = "";
        applyFilters();
    });
    applyFilters();

    saveBtn.addEventListener("click", async () => {
        statusEl.classList.add("d-none");

        if (!window.supabaseConfigured) {
            statusEl.textContent = "Supabase isn't configured yet, can't save.";
            statusEl.className = "alert alert-warning";
            statusEl.classList.remove("d-none");
            return;
        }

        const checked = new Set(
            Array.from(gridEl.querySelectorAll("input[type=checkbox]:checked")).map((cb) => cb.value)
        );

        const toAdd = [...checked].filter((id) => !owned.has(id));
        const toRemove = [...owned].filter((id) => !checked.has(id));

        saveBtn.disabled = true;
        try {
            if (toAdd.length > 0) {
                const { error } = await window.supabaseClient
                    .from("player_characters")
                    .insert(toAdd.map((character_id) => ({ player_id: playerId, character_id })));
                if (error) throw error;
            }
            if (toRemove.length > 0) {
                const { error } = await window.supabaseClient
                    .from("player_characters")
                    .delete()
                    .eq("player_id", playerId)
                    .in("character_id", toRemove);
                if (error) throw error;
            }

            toAdd.forEach((id) => owned.add(id));
            toRemove.forEach((id) => owned.delete(id));

            statusEl.textContent = "Saved!";
            statusEl.className = "alert alert-success";
            statusEl.classList.remove("d-none");
        } catch (error) {
            statusEl.textContent = "Couldn't save: " + error.message;
            statusEl.className = "alert alert-danger";
            statusEl.classList.remove("d-none");
        } finally {
            saveBtn.disabled = false;
        }
    });
});
