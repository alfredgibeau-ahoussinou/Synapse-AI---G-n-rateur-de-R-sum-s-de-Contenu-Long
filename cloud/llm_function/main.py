import os
import json
from typing import Any, Dict

# Entrée: notification (DB statut -> TRANSCRIBED)
# Sortie: appelle LLM (Gemini) et met à jour Supabase (résumé JSON, status COMPLETED)

PROMPT_TEMPLATE = {
    "role": "Assistant de Réunion",
    "tache": "Analyser le texte source et extraire un résumé, les décisions, et les actions clés.",
    "format_sortie": "JSON STRICT",
    "demandes": {
        "resume_concis": "5 phrases maximum.",
        "decisions_finales": "Liste des points de conclusion.",
        "actions_a_faire": "Liste de type (Responsable : Tâche à faire, Date/Échéance).",
    },
}


def run_llm(event: Dict[str, Any], context: Any = None) -> None:
    job_id = event.get("job_id")
    if not job_id:
        print("Event invalide: job_id manquant")
        return

    print(f"LLM start for job {job_id}")

    # TODO: lire transcription depuis Supabase
    # TODO: appeler Gemini API avec PROMPT_TEMPLATE + texte_source
    # TODO: stocker le JSON de sortie et status='COMPLETED' dans Supabase
    print("LLM done (squelette)")


def http_run_llm(request):
    try:
        payload = request.get_json(silent=True) or {}
    except Exception:
        payload = {}
    run_llm(payload)
    return ("ok", 200, {"Content-Type": "text/plain"})


