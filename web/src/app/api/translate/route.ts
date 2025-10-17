import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

export const dynamic = "force-dynamic";

function createS3Client(): S3Client {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) throw new Error("AWS_REGION manquant");

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  }
  return new S3Client({ region });
}

export async function POST(req: NextRequest) {
  try {
    const { key, bucket: bodyBucket } = await req.json();
    const bucket = bodyBucket || process.env.AWS_S3_BUCKET;
    if (!bucket || !key) {
      return NextResponse.json({ error: "Champs requis: key (+ bucket si non défini en env)" }, { status: 400 });
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY manquant" }, { status: 500 });
    }

    const s3 = createS3Client();
    const get = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bodyStream = get.Body as NodeJS.ReadableStream;

    // Préparer un fichier lisible par le SDK OpenAI
    const filename = key.split("/").pop() || "media";
    const file = await toFile(bodyStream as any, filename, { type: get.ContentType || "application/octet-stream" });

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


