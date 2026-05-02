"""Build preference context strings for chain prompts."""


def build_preference_context(prefs: dict[str, object] | None) -> str:
    """Build a preference context string from user preferences dict.

    Rules:
    - Apply preferences ONLY if they fit the material naturally.
    - NEVER force a preference if the text does not support it.
    - Sanitize custom_instructions to prevent prompt injection.
    """
    if not prefs:
        return ""

    parts: list[str] = []
    if level := prefs.get("education_level"):
        parts.append(f"Adapt complexity to {level} level when the material allows.")
    if styles := prefs.get("explanation_styles"):
        if isinstance(styles, list):
            parts.append(f"Use these explanation styles when natural: {', '.join(str(s) for s in styles)}.")
    if custom := prefs.get("custom_instructions"):
        safe = _sanitize_custom_instructions(str(custom))
        if safe:
            parts.append(
                f"<user_preferences>\n<custom_instructions>\n{safe}\n</custom_instructions>\n</user_preferences>"
            )

    if not parts:
        return ""

    return (
        "## USER PREFERENCES (apply ONLY if they fit the material naturally)\n"
        "NEVER contradict the source material. NEVER invent facts. "
        "If a preference cannot be applied naturally, ignore it.\n\n"
        + "\n".join(parts)
    )


def _sanitize_custom_instructions(text: str) -> str:
    """Strip common prompt injection tokens and truncate."""
    safe = text[:500]
    for token in ["---", "###", "<|", "[/INST]", "<script", "<?xml", "[[", "]]"]:
        safe = safe.replace(token, "")
    return safe.strip()
