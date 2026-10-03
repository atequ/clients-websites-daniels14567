import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

let clientPromise = null;

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = fetch("/api/config")
      .then(async (res) => {
        const body = await res.json();
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
