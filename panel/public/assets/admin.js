import { getSupabase } from "./supabase.js";
import { mountBackground } from "./background.js";
import { createSmoothTab } from "./smooth-tab.js";

const PAYMENT_LABELS = { paid: "Оплачено", partial: "Частично", unpaid: "Не оплачено" };
const PROJECT_LABELS = { in_progress: "В работе", on_hold: "На паузе", done: "Сдан" };

// One gradient tone per project status, shared by the tabs and the
// shimmering status labels so both read as the same colour.
const PROJECT_TONES = { in_progress: "purple", on_hold: "orange", done: "emerald" };

const PROJECT_TABS = [
  { id: "all", title: "Все", tone: "blue" },
  { id: "in_progress", title: "В работе", tone: PROJECT_TONES.in_progress },
  { id: "on_hold", title: "На паузе", tone: PROJECT_TONES.on_hold },
  { id: "done", title: "Сданы", tone: PROJECT_TONES.done },
];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const fmtMoney = (value) => `${money.format(Number(value) || 0)} ₸`;
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("ru-RU") : "—");

const el = {
  msg: document.getElementById("msg"),
  who: document.getElementById("who"),
  summary: document.getElementById("summary"),
  rows: document.getElementById("rows"),
  empty: document.getElementById("empty"),
  search: document.getElementById("search"),
  filterPayment: document.getElementById("filter-payment"),
  panel: document.getElementById("clients-panel"),
  dialog: document.getElementById("dialog"),
  dialogTitle: document.getElementById("dialog-title"),
  form: document.getElementById("client-form"),
  save: document.getElementById("save"),
};

let sb;
let clients = [];
let editingId = null;
let tabs;

function showError(text) {
  el.msg.textContent = text;
  el.msg.classList.add("show");
}

function clearError() {
  el.msg.classList.remove("show");
}

// Search and payment filters apply everywhere; the project tab narrows
// further. Tab counts use the first set so each tab shows what it would list.
function matchingClients() {
  const query = el.search.value.trim().toLowerCase();
  const payment = el.filterPayment.value;

  return clients.filter((c) => {
    if (payment && c.payment_status !== payment) return false;
    if (query && !c.name.toLowerCase().includes(query)) return false;
    return true;
  });
}

function updateTabCounts(list) {
  const counts = { all: list.length };
  for (const tab of PROJECT_TABS.slice(1)) {
    counts[tab.id] = list.filter((c) => c.project_status === tab.id).length;
  }
  tabs.setCounts(counts);
}

function renderSummary(list) {
  const totalPrice = list.reduce((sum, c) => sum + Number(c.price), 0);
  const totalPaid = list.reduce((sum, c) => sum + Number(c.paid_amount), 0);
  const outstanding = list.reduce((sum, c) => sum + Math.max(Number(c.price) - Number(c.paid_amount), 0), 0);
  const done = list.filter((c) => c.project_status === "done").length;
  const avg = list.length ? totalPrice / list.length : 0;

  const cards = [
    ["Клиентов", String(list.length)],
    ["Сумма договоров", fmtMoney(totalPrice)],
    ["Получено", fmtMoney(totalPaid)],
    ["К получению", fmtMoney(outstanding)],
    ["Средний чек", fmtMoney(avg)],
    ["Сдано проектов", `${done} из ${list.length}`],
  ];

  el.summary.replaceChildren(
    ...cards.map(([key, value]) => {
      const card = document.createElement("div");
      card.className = "card";
      const k = document.createElement("div");
      k.className = "k";
      k.textContent = key;
      const v = document.createElement("div");
      v.className = "v";
      v.textContent = value;
      card.append(k, v);
      return card;
    }),
  );
}

function renderRows(list) {
  el.empty.hidden = list.length > 0;
  el.empty.textContent = clients.length
    ? "Ничего не найдено по текущим фильтрам."
    : "Клиентов пока нет.";

  el.rows.replaceChildren(
    ...list.map((client) => {
      const tr = document.createElement("tr");

      const name = document.createElement("td");
      if (client.site_url) {
        const link = document.createElement("a");
        link.href = client.site_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = client.name;
        name.append(link);
      } else {
        name.textContent = client.name;
      }

      const contact = document.createElement("td");
      contact.textContent = [client.contact_person, client.phone].filter(Boolean).join(", ") || "—";

      const price = document.createElement("td");
      price.className = "num";
      price.textContent = fmtMoney(client.price);

      const paid = document.createElement("td");
      paid.className = "num";
      paid.textContent = fmtMoney(client.paid_amount);

      const left = document.createElement("td");
      left.className = "num";
      left.textContent = fmtMoney(Math.max(Number(client.price) - Number(client.paid_amount), 0));

      const payment = document.createElement("td");
      const tag = document.createElement("span");
      tag.className = `tag ${client.payment_status}`;
      tag.textContent = PAYMENT_LABELS[client.payment_status];
      payment.append(tag);

      const project = document.createElement("td");
      const status = document.createElement("span");
      status.className = `shimmer tone-${PROJECT_TONES[client.project_status]}`;
      status.textContent = PROJECT_LABELS[client.project_status];
      project.append(status);

      const deadline = document.createElement("td");
      deadline.textContent = fmtDate(client.deadline);

      const actions = document.createElement("td");
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "link";
      edit.textContent = "Изменить";
      edit.addEventListener("click", () => openDialog(client));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "link danger";
      remove.textContent = "Удалить";
      remove.addEventListener("click", () => deleteClient(client));
      actions.append(edit, remove);

      tr.append(name, contact, price, paid, left, payment, project, deadline, actions);
      return tr;
    }),
  );
}

function render() {
  const matching = matchingClients();
  const project = tabs.selected;
  const list = project === "all" ? matching : matching.filter((c) => c.project_status === project);
  updateTabCounts(matching);
  renderSummary(list);
  renderRows(list);
}

// Slide the table in from the side of the newly picked tab, the way the
// original component swaps its card content.
function slideIn(direction) {
  if (reducedMotion) return;
  el.panel.animate(
    [
      { transform: `translateX(${direction * 32}px)`, opacity: 0, filter: "blur(6px)" },
      { transform: "none", opacity: 1, filter: "blur(0)" },
    ],
    { duration: 400, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  );
}

async function loadClients() {
  const { data, error } = await sb
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showError(`Не удалось загрузить клиентов: ${error.message}`);
    return;
  }
  clients = data;
  render();
}

function openDialog(client) {
  editingId = client?.id ?? null;
  el.dialogTitle.textContent = client ? "Изменить клиента" : "Новый клиент";
  el.form.reset();

  if (client) {
    el.form.name.value = client.name;
    el.form.contact_person.value = client.contact_person ?? "";
    el.form.phone.value = client.phone ?? "";
    el.form.site_url.value = client.site_url ?? "";
    el.form.price.value = client.price;
    el.form.paid_amount.value = client.paid_amount;
    el.form.project_status.value = client.project_status;
    el.form.deadline.value = client.deadline ?? "";
    el.form.note.value = client.note ?? "";
  }

  el.dialog.showModal();
}

async function saveClient(event) {
  event.preventDefault();
  clearError();
  el.save.disabled = true;

  const payload = {
    name: el.form.name.value.trim(),
    contact_person: el.form.contact_person.value.trim() || null,
    phone: el.form.phone.value.trim() || null,
    site_url: el.form.site_url.value.trim() || null,
    price: Number(el.form.price.value) || 0,
    paid_amount: Number(el.form.paid_amount.value) || 0,
    project_status: el.form.project_status.value,
    deadline: el.form.deadline.value || null,
    note: el.form.note.value.trim() || null,
  };

  const { error } = editingId
    ? await sb.from("clients").update(payload).eq("id", editingId)
    : await sb.from("clients").insert(payload);

  el.save.disabled = false;

  if (error) {
    showError(`Не удалось сохранить: ${error.message}`);
    return;
  }

  el.dialog.close();
  await loadClients();
}

async function deleteClient(client) {
  if (!confirm(`Удалить клиента «${client.name}»? Это действие необратимо.`)) return;

  const { error } = await sb.from("clients").delete().eq("id", client.id);
  if (error) {
    showError(`Не удалось удалить: ${error.message}`);
    return;
  }
  await loadClients();
}

async function init() {
  mountBackground();

  tabs = createSmoothTab(document.getElementById("project-tabs"), {
    label: "Статус проекта",
    items: PROJECT_TABS.map((tab) => ({ ...tab, controls: "clients-panel" })),
    selected: "all",
    onChange: (id, direction) => {
      el.panel.setAttribute("aria-labelledby", `tab-${id}`);
      render();
      slideIn(direction);
    },
  });
  el.panel.setAttribute("aria-labelledby", "tab-all");

  try {
    sb = await getSupabase();
  } catch (err) {
    showError(err.message);
    return;
  }

  const { data } = await sb.auth.getSession();
  if (!data.session) {
    location.replace("/");
    return;
  }
  el.who.textContent = data.session.user.email;

  document.getElementById("logout").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.replace("/");
  });
  document.getElementById("add").addEventListener("click", () => openDialog(null));
  document.getElementById("cancel").addEventListener("click", () => el.dialog.close());
  el.form.addEventListener("submit", saveClient);
  el.search.addEventListener("input", render);
  el.filterPayment.addEventListener("change", render);

  await loadClients();
}

init();
