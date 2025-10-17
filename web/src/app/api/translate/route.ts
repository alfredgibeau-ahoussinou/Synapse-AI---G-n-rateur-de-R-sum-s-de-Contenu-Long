import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { key, bucket: bodyBucket } = await req.json();
    const bucket = bodyBucket || process.env.SUPABASE_BUCKET;
    if (!bucket || !key) {
      return NextResponse.json({ error: "Champs requis: key (+ bucket si non défini en env)" }, { status: 400 });
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY manquant" }, { status: 500 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Configurer SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: downloadData, error } = await admin.storage.from(bucket).download(key);
    if (error || !downloadData) {
      return NextResponse.json({ error: error?.message || "Téléchargement Supabase échoué" }, { status: 500 });
    }
    const arrayBuffer = await downloadData.arrayBuffer();
    const filename = key.split("/").pop() || "media";
    const file = await toFile(new Blob([arrayBuffer]) as any, filename, { type: downloadData.type || "application/octet-stream" });

    const openai = new OpenAI({ apiKey: openaiKey });

    // 1) Transcription avec Whisper (langue auto)
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      // language: "auto" // facultatif selon prise en charge
    } as any);

    const transcriptText: string = (transcription as any).text || (transcription as any).results?.[0]?.text || "";
    if (!transcriptText) {
      return NextResponse.json({ error: "Transcription vide" }, { status: 500 });
    }

    // 2) Traduction en français via modèle texte
    const translationPrompt = `Traduire fidèlement en français, style clair et professionnel:\n\n${transcriptText}`;
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un traducteur professionnel vers le français." },
        { role: "user", content: translationPrompt },
      ],
      temperature: 0.2,
    });
    const translated = chat.choices?.[0]?.message?.content || "";

    return NextResponse.json({ transcript: transcriptText, translation_fr: translated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


