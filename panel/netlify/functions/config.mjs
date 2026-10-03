function isSecretKey(key) {
  if (key.startsWith("sb_secret_")) return true;

  const parts = key.split(".");
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

export default async () => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return Response.json(
      { error: "SUPABASE_URL или SUPABASE_ANON_KEY не заданы в переменных окружения Netlify" },
      { status: 500 },
    );
  }

  if (isSecretKey(anonKey)) {
    return Response.json(
      {
        error:
          "В SUPABASE_ANON_KEY лежит секретный ключ. Он даёт доступ в обход RLS и не должен попадать в браузер: отзовите его в Supabase и подставьте publishable (anon) ключ.",
      },
      { status: 500 },
    );
  }

  return Response.json({ url, anonKey }, {
    headers: { "cache-control": "public, max-age=300" },
  });
};
