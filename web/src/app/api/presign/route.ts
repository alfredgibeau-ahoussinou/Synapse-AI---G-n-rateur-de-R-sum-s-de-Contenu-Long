import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Supabase Storage (Free Tier)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseBucket = process.env.SUPABASE_BUCKET;
    if (!supabaseUrl || !supabaseServiceKey || !supabaseBucket) {
      return NextResponse.json({ error: "Configurer SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET" }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data, error } = await admin.storage.from(supabaseBucket).createSignedUploadUrl(key, 60 * 5, { contentType });
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "createSignedUploadUrl a échoué" }, { status: 500 });
    }
    return NextResponse.json({ provider: "supabase", key, bucket: supabaseBucket, signedUrl: data.signedUrl, token: data.token });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


