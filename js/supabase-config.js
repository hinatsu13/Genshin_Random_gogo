// Fill these in with your own Supabase project's values (Project Settings -> API).
// The anon/public key is safe to expose client-side as long as Row Level Security
// policies are set up on the tables (see the SQL in the project plan / README).
const SUPABASE_URL = "https://ybpzawturbonwxxoxfco.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LY6Q6UvhqyrBe6FL2w2jxQ_AaFTc-6L";

window.supabaseClient = null;
window.supabaseConfigured = SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

if (window.supabaseConfigured) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function showSupabaseWarning() {
    if (window.supabaseConfigured) return;
    const banner = document.createElement("div");
    banner.className = "alert alert-warning mb-0 text-center rounded-0";
    banner.textContent = "Supabase isn't configured yet. Edit js/supabase-config.js with your project URL and anon key.";
    document.body.prepend(banner);
}
