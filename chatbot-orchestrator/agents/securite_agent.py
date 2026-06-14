# agent-orchestrator/agents/securite_agent.py
# RÔLE : Filtre final — données sensibles + contenu hors sujet

import re

BLOCKED_PATTERNS = [
    r'\b[A-Z]{1,2}[0-9]{5,6}\b',           # CIN marocain
    r'\b[0-9]{2}-[A-Z]-[0-9]{4,5}\b',       # Immatriculation neuve
    r'\b[A-Z]{2}[0-9]{5,6}\b',              # Immatriculation ancienne
    r'\b[A-Z0-9]{17}\b',                     # VIN
    r'\+212[0-9\s]{8,12}',                   # Téléphone marocain
    r'\b0[67][0-9]{8}\b',                    # Mobile maroc
    r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # Email
]

BLOCKED_INPUT_PHRASES = [
    r'(?i)(hack|pirat|inject|sql|drop\s+table|delete\s+from)',
    r'(?i)(mot\s+de\s+passe|password|credit\s+card|carte\s+bancaire)',
    r'(?i)(voler|hacker|pirater|exploit)',
]

def filter_input(message: str) -> str:
    """
    Filtre le message entrant de l'utilisateur.
    - Détecte et bloque les tentatives d'injection
    - Nettoie les caractères dangereux
    """
    if not message:
        return ""
    
    original = message
    
    # Vérifier si message contient des phrases interdites
    for pattern in BLOCKED_INPUT_PHRASES:
        if re.search(pattern, message, re.IGNORECASE):
            return "⚠️ Désolé, votre demande contient des éléments non autorisés. Pouvez-vous reformuler ?"
    
    # Nettoyer les caractères potentiellement dangereux
    # (garde les lettres, chiffres, ponctuation basique)
    cleaned = re.sub(r'[<>{}[\]\\]', '', message)
    
    return cleaned


def run(response: str) -> str:
    """Filtre les données sensibles de la réponse finale."""
    for pattern in BLOCKED_PATTERNS:
        response = re.sub(pattern, '[confidentiel]', response)
    return response