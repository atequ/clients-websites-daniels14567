export default async () => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return Response.json(
      { error: "SUPABASE_URL или SUPABASE_ANON_KEY не заданы в переменных окружения Netlify" },
      { status: 500 },
    );
  }

  return Response.json({ url, anonKey }, {
    headers: { "cache-control": "public, max-age=300" },
  });
};
