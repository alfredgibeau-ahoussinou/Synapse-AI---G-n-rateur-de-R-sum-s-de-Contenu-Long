import os
import json
from typing import Any, Dict

# Entrée: événement Storage (GCS/S3 relay via Pub/Sub ou HTTP wrapper)
# Sortie: met à jour Supabase avec transcription + statut TRANSCRIBED

def transcribe_audio(event: Dict[str, Any], context: Any = None) -> None:
    """
    Cloud Function déclenchée par un dépôt de fichier (storage trigger).
    Attendu: event contient bucket, name (clé), contentType.
    """
    bucket = event.get("bucket")
    key = event.get("name")
    content_type = event.get("contentType")

    if not bucket or not key:
        print("Event invalide: bucket/key manquants")
        return

    print(f"ASR start for gs://{bucket}/{key} ({content_type})")

    # TODO: télécharger l'objet, extraire audio si vidéo
    # TODO: appeler Whisper ou API STT avec diarisation
    # transcription_brute = ...

    # TODO: écrire dans Supabase (table: jobs, transcription_brute, status='TRANSCRIBED')
    # ex: utiliser SUPABASE_URL, SUPABASE_ANON_KEY / service role
    print("ASR done (squelette)")


def http_transcribe(request):
    """
    Variante HTTP pour tests locaux: POST { bucket, key, contentType }
    """
    try:
        payload = request.get_json(silent=True) or {}
    except Exception:
        payload = {}
    transcribe_audio(payload)
    return ("ok", 200, {"Content-Type": "text/plain"})


