import { getSupabase } from "./supabase.js";
import { mountFlowField } from "./flow-field.js";
import { createSmoothTab } from "./smooth-tab.js";

const ASSIGNEE_LABELS = { owner: "owner", partner: "partner", agent: "ИИ-агент" };
const PRIORITY_LABELS = { high: "Высокий", normal: "Обычный", low: "Низкий" };
const STATUS_LABELS = { new: "Новое", in_progress: "В работе", done: "Выполнено" };

const STATUS_TABS = [
  { id: "all", title: "Все", color: "#2563eb" },
  { id: "new", title: "Новые", color: "#7c3aed" },
  { id: "in_progress", title: "В работе", color: "#b45309" },
  { id: "done", title: "Выполнены", color: "#047857" },
];

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
  dialog: document.getElementById("dialog"),
  dialogTitle: document.getElementById("dialog-title"),
  form: document.getElementById("task-form"),
  save: document.getElementById("save"),
};

let sb;
let tasks = [];
let editingId = null;
let statusTab = "all";

function showError(text) {
  el.msg.textContent = text;
  el.msg.classList.add("show");
}

function visibleTasks() {
  const query = el.search.value.trim().toLowerCase();
  const assignee = el.filterAssignee.value;
  const priority = el.filterPriority.value;

  return tasks.filter((task) => {
    if (statusTab !== "all" && task.status !== statusTab) return false;
    if (assignee && task.assignee !== assignee) return false;
    if (priority && task.priority !== priority) return false;
    if (query) {
      const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
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

function renderTask(task) {
  const article = document.createElement("article");
  article.className = `task${task.status === "done" ? " is-done" : ""}`;

  const top = document.createElement("div");
  top.className = "task-top";

  const title = document.createElement("h3");
  title.textContent = task.title;

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
  article.append(actions);

  return article;
}

function render() {
  renderSummary();
  const list = visibleTasks();
  el.empty.hidden = list.length > 0;
  el.empty.textContent = tasks.length
    ? "Ничего не найдено по текущим фильтрам."
    : "Заданий пока нет.";
  el.list.replaceChildren(...list.map(renderTask));
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

async function init() {
  mountFlowField({ theme: "ocean", density: "sparse" });

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

  createSmoothTab(document.getElementById("status-tabs"), {
    label: "Статус задания",
    items: STATUS_TABS.map((tab) => ({ ...tab, controls: "tasks-panel" })),
    selected: "all",
    onChange: (id) => {
      statusTab = id;
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
  el.filterAssignee.addEventListener("change", render);
  el.filterPriority.addEventListener("change", render);

  await loadTasks();
}

init();
