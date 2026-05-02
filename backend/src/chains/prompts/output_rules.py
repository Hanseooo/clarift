"""Shared output formatting rules for chains."""


def json_schema_rules(schema_description: str) -> str:
    return (
        "## OUTPUT FORMAT\n"
        "Return ONLY a single valid JSON object. No markdown code fences, no extra text.\n\n"
        f"JSON schema:\n{schema_description}\n\n"
        "Note on nullable fields: Use `null` (not empty arrays) for fields not applicable to a question type."
    )


def xml_output_rules() -> str:
    return (
        "## OUTPUT FORMAT\n"
        "Respond using exactly these XML tags. Do not include any text outside the tags.\n\n"
        "<answer>\n"
        "[Your markdown-formatted answer...]\n"
        "</answer>\n\n"
        "<used_citations>\n"
        "[Comma-separated list of citation numbers actually used... If no chunks were used, write NONE.]\n"
        "</used_citations>\n\n"
        "Self-check before outputting:\n"
        "- Every citation number in <used_citations> appears as [N] in <answer>.\n"
        "- Every [N] in <answer> is listed in <used_citations>.\n"
        "- If no chunks were used, <used_citations> is NONE."
    )
