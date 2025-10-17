# Synapse AI – Générateur de Résumés de Contenu Long (MVP)

De la voix à la clarté. Instantanément.

## Aperçu

MVP serverless et Free Tier:
- Frontend `web/` (Next.js + Tailwind) avec UI d'upload vers S3 via URL présignée.
- Route API `web/src/app/api/presign/route.ts` pour générer l'URL S3 (AWS SDK v3).
- Cloud Functions Python (squelettes) dans `cloud/` pour ASR (Whisper / STT) et LLM (Gemini).
- Schéma Supabase minimal `supabase/schema.sql` pour stocker statuts, transcription et résultat JSON.

## Prérequis

- Node 18+
- Compte AWS (S3) Free Tier. Créez un bucket.
- Supabase (plan gratuit)

## Configuration

Dans `web`, configurez les variables d'environnement (ex: `.env.local`).

AWS S3 (optionnel si vous utilisez Supabase):
```
AWS_REGION=eu-west-3
AWS_S3_BUCKET=mon-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Supabase Storage (fallback gratuit au lieu d'AWS):
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (clé service role)
SUPABASE_BUCKET=media

# côté client pour upload signé
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (clé anon)
```

## Lancer le Frontend

```
cd web
npm run dev
```

UI d'upload: sélectionner un fichier audio/vidéo, obtenir une URL de pré-signature puis envoi direct vers S3 (PUT) ou Supabase Storage (upload signé) selon la configuration.

## Déploiement Free Tier

- Frontend: Vercel/Netlify (Next.js). Définissez les vars env ci-dessus.
- Functions: Google Cloud Functions / AWS Lambda. Adaptez les handlers HTTP fournis.
- Supabase: appliquez `supabase/schema.sql` dans SQL Editor.

## Étapes suivantes

- Implémenter ASR (Whisper ou API) avec diarisation et mise à jour `jobs`.
- Implémenter LLM (Gemini) pour produire un JSON strict et stocker en DB.
- Ajouter webhooks/queues pour orchestrer UPLOADED -> TRANSCRIBED -> COMPLETED.
