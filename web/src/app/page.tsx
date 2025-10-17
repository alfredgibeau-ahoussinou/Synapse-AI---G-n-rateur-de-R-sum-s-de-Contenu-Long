"use client";
import { useCallback, useMemo, useState } from "react";

type PresignResponse = {
  provider?: "aws" | "supabase";
  url?: string; // AWS
  key: string;
  bucket: string;
  region?: string;
  signedUrl?: string; // Supabase
  token?: string;     // Supabase
  error?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [uploadedKey, setUploadedKey] = useState<string>("");
  const [translated, setTranslated] = useState<string>("");

  const contentType = useMemo(() => file?.type || "application/octet-stream", [file]);

  const onSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setStatus("");
    setUploadedKey("");
    setTranslated("");
  }, []);

  const onUpload = useCallback(async () => {
    if (!file) return;
    setStatus("Génération de l'URL de pré-signature…");

    const presign = await fetch("/api/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, contentType }),
    });

    if (!presign.ok) {
      const txt = await presign.text();
      setStatus(`Erreur de pré-signature: ${txt}`);
      return;
    }

    const data = (await presign.json()) as PresignResponse;
    if (data.provider === "aws") {
      if (!data.url) {
        setStatus(`Réponse invalide AWS: ${data.error || "URL manquante"}`);
        return;
      }
      setStatus("Upload en cours vers S3…");
      const putRes = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!putRes.ok) {
        const txt = await putRes.text();
        setStatus(`Échec upload: ${putRes.status} ${txt}`);
        return;
      }
      setUploadedKey(data.key);
      setStatus("Upload réussi ✔");
      return;
    }

    if (data.provider === "supabase") {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon || !data.signedUrl || !data.token) {
        setStatus("Config Supabase incomplète (NEXT_PUBLIC_*) ou réponse invalide");
        return;
      }
      setStatus("Upload en cours vers Supabase Storage…");
      // Utiliser l'endpoint de signed upload (PUT multipart/form-data)
      const form = new FormData();
      form.append("file", file);
      const putRes = await fetch(`${url}${data.signedUrl}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${anon}`, "x-upsert": "true" },
        body: form,
      });
      if (!putRes.ok) {
        const txt = await putRes.text();
        setStatus(`Échec upload Supabase: ${putRes.status} ${txt}`);
        return;
      }
      setUploadedKey(data.key);
      setStatus("Upload réussi (Supabase) ✔");
      return;
    }

    setStatus(`Réponse invalide: ${data.error || "provider inconnu"}`);
  }, [file, contentType]);

  const onTranslate = useCallback(async () => {
    if (!uploadedKey) return;
    setStatus("Transcription+Traduction en cours…");
    setTranslated("");
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: uploadedKey }),
    });
    if (!res.ok) {
      const txt = await res.text();
      setStatus(`Erreur trad: ${txt}`);
      return;
    }
    const data = await res.json();
    setTranslated(data.translation_fr || "");
    setStatus("Traduction terminée ✔");
  }, [uploadedKey]);

  return (
    <div className="font-sans min-h-screen p-8 sm:p-20 bg-[#121212] text-white">
      <main className="max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Synapse AI</h1>
        <p className="text-white/70">De la voix à la clarté. Instantanément.</p>

        <div className="rounded-lg border border-white/10 p-6 bg-white/5">
          <label className="block text-sm mb-2">Fichier audio/vidéo</label>
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={onSelect}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-black hover:file:bg-cyan-400"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={onUpload}
              disabled={!file}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-500 text-black px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Uploader vers S3
            </button>
            {file && (
              <span className="text-xs text-white/60">{file.name}</span>
            )}
          </div>
          {status && (
            <p className="mt-3 text-sm text-white/80">{status}</p>
          )}
          {uploadedKey && (
            <p className="mt-1 text-xs text-white/60 break-all">Object Key: {uploadedKey}</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 p-6 bg-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={onTranslate}
              disabled={!uploadedKey}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-400 text-black px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Transcrire + Traduire en FR
            </button>
            {!uploadedKey && (
              <span className="text-xs text-white/60">Uploader d'abord un fichier…</span>
            )}
          </div>
          {translated && (
            <div className="mt-4">
              <h2 className="text-sm font-medium text-white/80 mb-1">Texte traduit (FR)</h2>
              <pre className="whitespace-pre-wrap text-sm text-white/90 bg-black/30 p-3 rounded">{translated}</pre>
            </div>
          )}
        </div>

        <p className="text-xs text-white/50">
          Configurez les variables d'environnement côté serveur: <code className="px-1 py-0.5 rounded bg-white/10">AWS_REGION</code>, <code className="px-1 py-0.5 rounded bg-white/10">AWS_S3_BUCKET</code>, <code className="px-1 py-0.5 rounded bg-white/10">AWS_ACCESS_KEY_ID</code>, <code className="px-1 py-0.5 rounded bg-white/10">AWS_SECRET_ACCESS_KEY</code>.
        </p>
      </main>
    </div>
  );
}
