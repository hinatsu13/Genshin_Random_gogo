document.addEventListener("DOMContentLoaded", () => {
    showSupabaseWarning();

    const listEl = document.getElementById("player-list");
    const formEl = document.getElementById("add-player-form");
    const nameInput = document.getElementById("new-player-name");
    const errorEl = document.getElementById("player-error");
    const hubEl = document.getElementById("player-hub");
    const hubNameEl = document.getElementById("hub-player-name");

    function showError(message) {
        errorEl.textContent = message;
        errorEl.classList.remove("d-none");
    }

    function selectPlayer(id, name) {
        localStorage.setItem("player_id", id);
        localStorage.setItem("player_name", name);
        hubNameEl.textContent = name;
        hubEl.classList.remove("d-none");
        hubEl.scrollIntoView({ behavior: "smooth" });
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
