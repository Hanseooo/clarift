"""Shared source fidelity rules for all chains."""


def strict_source_only() -> str:
    return (
        "## SOURCE FIDELITY (ABSOLUTE)\n"
        "1. Base EVERY question, answer, explanation, and fact ONLY on the provided source material.\n"
        "2. Do NOT use outside knowledge, common sense, or general facts not present in the text.\n"
        "3. Do NOT add, infer, or embellish any information not present in the chunks.\n"
        "4. Rephrase only when necessary for clarity.\n"
        "5. NEVER contradict the source material.\n"
        "6. If a preference or instruction conflicts with the source material, ignore the preference.\n"
    )
