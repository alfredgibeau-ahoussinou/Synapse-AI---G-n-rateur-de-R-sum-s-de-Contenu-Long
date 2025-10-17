import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";

function createS3Client(): S3Client {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) {
    throw new Error("AWS_REGION manquant dans l'environnement");
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return new S3Client({ region });
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Champs requis: fileName, contentType" },
        { status: 400 }
      );
    }

    // Chemin standardisé AAAA/MM/JJ/<random>-<filename>
    const time = new Date();
    const yyyy = String(time.getUTCFullYear());
    const mm = String(time.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(time.getUTCDate()).padStart(2, "0");
    const datePrefix = `${yyyy}/${mm}/${dd}`;
    const randomSuffix = Math.random().toString(36).slice(2, 10);
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${datePrefix}/${randomSuffix}-${sanitized}`;

    // 1) Si AWS configuré, générer une URL S3 signée
    const bucket = process.env.AWS_S3_BUCKET;
    const hasAws = Boolean(bucket && (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION));
    if (hasAws && bucket) {
      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
      const client = createS3Client();
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      });
      const url = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
      return NextResponse.json({ provider: "aws", url, key, bucket, region });
    }

    // 2) Fallback Supabase Storage (Free Tier)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseBucket = process.env.SUPABASE_BUCKET;
    if (!supabaseUrl || !supabaseServiceKey || !supabaseBucket) {
      return NextResponse.json(
        { error: "Aucun provider configuré: définir AWS_* ou SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET" },
        { status: 500 }
      );
    }
    const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data, error } = await admin.storage.from(supabaseBucket).createSignedUploadUrl(key, 60 * 5, { contentType });
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "createSignedUploadUrl a échoué" }, { status: 500 });
    }
    // Retourner le token: l'UI utilisera uploadToSignedUrl côté client avec NEXT_PUBLIC_*
    return NextResponse.json({ provider: "supabase", key, bucket: supabaseBucket, signedUrl: data.signedUrl, token: data.token });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


