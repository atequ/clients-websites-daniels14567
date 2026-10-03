import { getSupabase } from "./supabase.js";
import { mountFlowField } from "./flow-field.js";

mountFlowField({ theme: "ocean", density: "medium" });

const form = document.getElementById("login-form");
const submit = document.getElementById("submit");
const msg = document.getElementById("msg");

function showError(text) {
  msg.textContent = text;
  msg.classList.add("show");
}

getSupabase()
  .then(async (sb) => {
    const { data } = await sb.auth.getSession();
    if (data.session) location.replace("/admin/");
  })
  .catch((err) => showError(err.message));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  msg.classList.remove("show");
  submit.disabled = true;
  submit.textContent = "Вход…";

  try {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
    });
    if (error) throw error;
    location.replace("/admin/");
  } catch (err) {
    showError(err.message === "Invalid login credentials" ? "Неверный email или пароль" : err.message);
    submit.disabled = false;
    submit.textContent = "Войти";
  }
});
