import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

let clientPromise = null;

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = fetch("/api/config")
      .then(async (res) => {
        const raw = await res.text();
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          throw new Error(
            "Конфигурация недоступна: /api/config не ответил. Запустите проект через «netlify dev» или проверьте деплой функции.",
          );
        }
        if (!res.ok) throw new Error(body.error || "Не удалось получить конфигурацию");
        return createClient(body.url, body.anonKey);
      })
      .catch((err) => {
        clientPromise = null;
        throw err;
      });
  }
  return clientPromise;
}
