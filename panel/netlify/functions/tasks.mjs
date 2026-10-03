import { timingSafeEqual } from "node:crypto";

const ASSIGNEES = ["owner", "partner", "agent"];
const PRIORITIES = ["high", "normal", "low"];

function tokenMatches(provided, expected) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function supabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export default async (request) => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expectedToken = process.env.TASKS_API_TOKEN;

  if (!url || !serviceKey || !expectedToken) {
    return Response.json({ error: "server_not_configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-api-token");
  if (!provided || !tokenMatches(provided, expectedToken)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (request.method === "GET") {
    const includeDone = new URL(request.url).searchParams.get("include_done") === "1";
    const statusFilter = includeDone ? "" : "&status=neq.done";
    const res = await fetch(
      `${url}/rest/v1/tasks?assignee=eq.agent${statusFilter}&order=created_at.desc`,
      { headers: supabaseHeaders(serviceKey) },
    );
    const body = await res.json();
    return Response.json(res.ok ? { tasks: body } : { error: body }, { status: res.status });
  }

  if (request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) {
      return Response.json({ error: "title_required" }, { status: 400 });
    }

    const assignee = ASSIGNEES.includes(payload.assignee) ? payload.assignee : "agent";
    const priority = PRIORITIES.includes(payload.priority) ? payload.priority : "normal";
    const description =
      typeof payload.description === "string" && payload.description.trim()
        ? payload.description.trim()
        : null;

    const res = await fetch(`${url}/rest/v1/tasks`, {
      method: "POST",
      headers: { ...supabaseHeaders(serviceKey), Prefer: "return=representation" },
      body: JSON.stringify({ title, description, assignee, priority, created_by: "agent" }),
    });
    const body = await res.json();
    return Response.json(res.ok ? { task: body[0] } : { error: body }, { status: res.status });
  }

  return Response.json({ error: "method_not_allowed" }, { status: 405 });
};
