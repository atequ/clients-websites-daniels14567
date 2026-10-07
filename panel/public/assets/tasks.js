import { getSupabase } from "./supabase.js";
import { mountBackground } from "./background.js";
import { createSmoothTab } from "./smooth-tab.js";

const ASSIGNEE_LABELS = { owner: "Конор", partner: "Даниэль", agent: "ИИ-агент" };
const PRIORITY_LABELS = { high: "Высокий", normal: "Обычный", low: "Низкий" };
const STATUS_LABELS = { new: "Новое", in_progress: "В работе", done: "Выполнено" };
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

// Gradient tones shared with the clients page: "in progress" and "finished"
// use the same colours there, so a status reads the same everywhere.
const STATUS_TABS = [
  { id: "all", title: "Все", tone: "blue" },
  { id: "new", title: "Новые", tone: "orange" },
  { id: "in_progress", title: "В работе", tone: "purple" },
  { id: "done", title: "Выполнены", tone: "emerald" },
];

const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at);
const SORTS = {
  newest: byNewest,
  oldest: (a, b) => byNewest(b, a),
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byNewest(a, b),
  updated: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
};

// Groups appear in the order of their label map: Конор, Даниэль, agent;
// high to low priority; new to done.
const GROUPS = {
  assignee: { field: "assignee", labels: ASSIGNEE_LABELS },
  priority: { field: "priority", labels: PRIORITY_LABELS },
  status: { field: "status", labels: STATUS_LABELS },
};

const fmtDate = (value) =>
  new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

const el = {
  msg: document.getElementById("msg"),
  who: document.getElementById("who"),
  summary: document.getElementById("summary"),
  list: document.getElementById("list"),
  empty: document.getElementById("empty"),
  search: document.getElementById("search"),
  filterAssignee: document.getElementById("filter-assignee"),
  filterPriority: document.getElementById("filter-priority"),
  sort: document.getElementById("sort"),
  group: document.getElementById("group"),
  toggleAll: document.getElementById("toggle-all"),
  dialog: document.getElementById("dialog"),
  dialogTitle: document.getElementById("dialog-title"),
  form: document.getElementById("task-form"),
  save: document.getElementById("save"),
};

let sb;
let tabs;
let tasks = [];
let shown = [];
let editingId = null;

// The tab, filters, sort, grouping and which cards and groups are open are
// remembered per browser, so the page comes back the way it was left.
const VIEW_KEY = "panel.tasks.view";
const view = {
  tab: "all",
  assignee: "",
  priority: "",
  sort: "newest",
  group: "none",
  open: new Set(),
  closedGroups: new Set(),
};

function loadView() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(VIEW_KEY));
  } catch {
    return;
  }
  if (!saved || typeof saved !== "object") return;

  if (STATUS_TABS.some((tab) => tab.id === saved.tab)) view.tab = saved.tab;
  if (Object.hasOwn(ASSIGNEE_LABELS, saved.assignee)) view.assignee = saved.assignee;
  if (Object.hasOwn(PRIORITY_LABELS, saved.priority)) view.priority = saved.priority;
  if (Object.hasOwn(SORTS, saved.sort)) view.sort = saved.sort;
  if (Object.hasOwn(GROUPS, saved.group)) view.group = saved.group;
  if (Array.isArray(saved.open)) view.open = new Set(saved.open);
  if (Array.isArray(saved.closedGroups)) view.closedGroups = new Set(saved.closedGroups);
}

function saveView() {
  try {
    localStorage.setItem(
      VIEW_KEY,
      JSON.stringify({ ...view, open: [...view.open], closedGroups: [...view.closedGroups] }),
    );
  } catch {
    // Storage can be blocked (e.g. private mode); the page still works, it just forgets.
  }
}

function showError(text) {
  el.msg.textContent = text;
  el.msg.classList.add("show");
}

// Search and the assignee/priority filters apply everywhere; the status tab
// narrows further. Tab counts use the first set so each tab shows what it would list.
function matchingTasks() {
  const query = el.search.value.trim().toLowerCase();

  return tasks.filter((task) => {
    if (view.assignee && task.assignee !== view.assignee) return false;
    if (view.priority && task.priority !== view.priority) return false;
    if (query) {
      const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

// Finished tasks sink to the bottom so open work stays on top.
function sortTasks(list) {
  const compare = SORTS[view.sort];
  return [...list].sort((a, b) => (a.status === "done") - (b.status === "done") || compare(a, b));
}

function updateTabCounts(list) {
  const counts = { all: list.length };
  for (const tab of STATUS_TABS.slice(1)) {
    counts[tab.id] = list.filter((t) => t.status === tab.id).length;
  }
  tabs.setCounts(counts);
}

function renderSummary() {
  const cards = [
    ["Всего заданий", String(tasks.length)],
    ["Новые", String(tasks.filter((t) => t.status === "new").length)],
    ["В работе", String(tasks.filter((t) => t.status === "in_progress").length)],
    ["Выполнено", String(tasks.filter((t) => t.status === "done").length)],
    [
      "Для ИИ-агента",
      String(tasks.filter((t) => t.assignee === "agent" && t.status !== "done").length),
    ],
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

function makeChevron() {
  const chevron = document.createElement("span");
  chevron.className = "chevron";
  chevron.setAttribute("aria-hidden", "true");
  return chevron;
}

// Collapsed, a card shows its title, a one-line preview and the meta line;
// open, it shows the full description and the actions.
function renderTask(task) {
  const open = view.open.has(task.id);
  const article = document.createElement("article");
  article.id = `task-${task.id}`;
  article.className = "task";
  article.classList.toggle("is-done", task.status === "done");
  article.classList.toggle("is-open", open);

  const top = document.createElement("div");
  top.className = "task-top";

  const title = document.createElement("h3");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "task-toggle";
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-controls", article.id);
  const titleText = document.createElement("span");
  titleText.textContent = task.title;
  toggle.append(makeChevron(), titleText);
  title.append(toggle);

  const priority = document.createElement("span");
  priority.className = `tag priority-${task.priority}`;
  priority.textContent = PRIORITY_LABELS[task.priority];

  top.append(title, priority);
  article.append(top);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-desc";
    description.textContent = task.description;
    article.append(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";
  const parts = [
    ASSIGNEE_LABELS[task.assignee],
    STATUS_LABELS[task.status],
    fmtDate(task.created_at),
  ];
  if (task.created_by === "agent") parts.push("создано агентом");
  meta.textContent = parts.join(" · ");
  article.append(meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const statusSelect = document.createElement("select");
  statusSelect.setAttribute("aria-label", `Статус задания «${task.title}»`);
  for (const [value, label] of Object.entries(STATUS_LABELS)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (task.status === value) option.selected = true;
    statusSelect.append(option);
  }
  statusSelect.addEventListener("change", () => changeStatus(task, statusSelect.value));

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "link";
  edit.textContent = "Изменить";
  edit.addEventListener("click", () => openDialog(task));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "link danger";
  remove.textContent = "Удалить";
  remove.addEventListener("click", () => deleteTask(task));

  actions.append(statusSelect, edit, remove);
  actions.hidden = !open;
  article.append(actions);

  toggle.addEventListener("click", () => {
    const next = !view.open.has(task.id);
    if (next) view.open.add(task.id);
    else view.open.delete(task.id);
    article.classList.toggle("is-open", next);
    toggle.setAttribute("aria-expanded", String(next));
    actions.hidden = !next;
    saveView();
    updateToggleAll();
  });

  return article;
}

const groupKey = (value) => `${view.group}:${value}`;

function renderGroup(value, label, items) {
  const key = groupKey(value);
  const closed = view.closedGroups.has(key);

  const section = document.createElement("section");
  section.className = "task-group";

  const head = document.createElement("h2");
  head.className = "task-group-head";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "task-group-toggle";
  toggle.setAttribute("aria-expanded", String(!closed));
  const name = document.createElement("span");
  name.textContent = label;
  const count = document.createElement("span");
  count.className = "group-count";
  count.textContent = String(items.length);
  toggle.append(makeChevron(), name, count);
  head.append(toggle);

  const body = document.createElement("div");
  body.className = "task-list";
  body.id = `group-${view.group}-${value}`;
  body.hidden = closed;
  body.append(...items.map(renderTask));
  toggle.setAttribute("aria-controls", body.id);

  toggle.addEventListener("click", () => {
    const nowClosed = !view.closedGroups.has(key);
    if (nowClosed) view.closedGroups.add(key);
    else view.closedGroups.delete(key);
    body.hidden = nowClosed;
    toggle.setAttribute("aria-expanded", String(!nowClosed));
    saveView();
    updateToggleAll();
  });

  section.append(head, body);
  return section;
}

function renderGroups(list) {
  const { field, labels } = GROUPS[view.group];
  return Object.entries(labels)
    .map(([value, label]) => [value, label, list.filter((t) => t[field] === value)])
    .filter(([, , items]) => items.length > 0)
    .map(([value, label, items]) => renderGroup(value, label, items));
}

function closedGroupsInView() {
  return [...view.closedGroups].filter((key) => key.startsWith(`${view.group}:`));
}

// "Expand all" opens every listed card and any collapsed group;
// "Collapse all" closes the cards and leaves the groups as they are.
function updateToggleAll() {
  el.toggleAll.hidden = shown.length === 0;
  const allOpen =
    shown.every((task) => view.open.has(task.id)) &&
    (view.group === "none" || closedGroupsInView().length === 0);
  el.toggleAll.dataset.action = allOpen ? "collapse" : "expand";
  el.toggleAll.textContent = allOpen ? "Свернуть все" : "Развернуть все";
}

function toggleAll() {
  const expand = el.toggleAll.dataset.action === "expand";
  for (const task of shown) {
    if (expand) view.open.add(task.id);
    else view.open.delete(task.id);
  }
  if (expand && view.group !== "none") {
    for (const key of closedGroupsInView()) view.closedGroups.delete(key);
  }
  saveView();
  render();
}

function render() {
  renderSummary();
  const matching = matchingTasks();
  updateTabCounts(matching);
  shown = sortTasks(
    view.tab === "all" ? matching : matching.filter((t) => t.status === view.tab),
  );

  el.empty.hidden = shown.length > 0;
  el.empty.textContent = tasks.length
    ? "Ничего не найдено по текущим фильтрам."
    : "Заданий пока нет.";
  el.list.replaceChildren(
    ...(view.group === "none" ? shown.map(renderTask) : renderGroups(shown)),
  );
  updateToggleAll();
}

async function loadTasks() {
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showError(`Не удалось загрузить задания: ${error.message}`);
    return;
  }
  tasks = data;

  // Forget open cards whose tasks are gone, so the saved list doesn't grow forever.
  const ids = new Set(tasks.map((t) => t.id));
  for (const id of view.open) {
    if (!ids.has(id)) view.open.delete(id);
  }
  saveView();

  render();
}

function openDialog(task) {
  editingId = task?.id ?? null;
  el.dialogTitle.textContent = task ? "Изменить задание" : "Новое задание";
  el.form.reset();

  if (task) {
    el.form.title.value = task.title;
    el.form.description.value = task.description ?? "";
    el.form.assignee.value = task.assignee;
    el.form.priority.value = task.priority;
    el.form.status.value = task.status;
  }

  el.dialog.showModal();
}

async function saveTask(event) {
  event.preventDefault();
  el.msg.classList.remove("show");
  el.save.disabled = true;

  const payload = {
    title: el.form.title.value.trim(),
    description: el.form.description.value.trim() || null,
    assignee: el.form.assignee.value,
    priority: el.form.priority.value,
    status: el.form.status.value,
  };

  const { error } = editingId
    ? await sb.from("tasks").update(payload).eq("id", editingId)
    : await sb.from("tasks").insert({ ...payload, created_by: "human" });

  el.save.disabled = false;

  if (error) {
    showError(`Не удалось сохранить: ${error.message}`);
    return;
  }

  el.dialog.close();
  await loadTasks();
}

async function changeStatus(task, status) {
  const { error } = await sb.from("tasks").update({ status }).eq("id", task.id);
  if (error) {
    showError(`Не удалось изменить статус: ${error.message}`);
    return;
  }
  await loadTasks();
}

async function deleteTask(task) {
  if (!confirm(`Удалить задание «${task.title}»? Это действие необратимо.`)) return;

  const { error } = await sb.from("tasks").delete().eq("id", task.id);
  if (error) {
    showError(`Не удалось удалить: ${error.message}`);
    return;
  }
  await loadTasks();
}

// Shows the remembered value and keeps the view in sync when it changes.
function bindSelect(select, key) {
  select.value = view[key];
  select.addEventListener("change", () => {
    view[key] = select.value;
    saveView();
    render();
  });
}

async function init() {
  mountBackground();

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

  loadView();
  tabs = createSmoothTab(document.getElementById("status-tabs"), {
    label: "Статус задания",
    items: STATUS_TABS.map((tab) => ({ ...tab, controls: "tasks-panel" })),
    selected: view.tab,
    onChange: (id) => {
      view.tab = id;
      saveView();
      render();
    },
  });

  document.getElementById("logout").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.replace("/");
  });
  document.getElementById("add").addEventListener("click", () => openDialog(null));
  document.getElementById("cancel").addEventListener("click", () => el.dialog.close());
  el.form.addEventListener("submit", saveTask);
  el.search.addEventListener("input", render);
  el.toggleAll.addEventListener("click", toggleAll);
  bindSelect(el.filterAssignee, "assignee");
  bindSelect(el.filterPriority, "priority");
  bindSelect(el.sort, "sort");
  bindSelect(el.group, "group");

  await loadTasks();
}

init();
