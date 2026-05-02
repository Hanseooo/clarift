"""Shared fallback behavior instructions."""


def fallback_behavior(fallback_message: str) -> str:
    return (
        "## INSUFFICIENT MATERIAL\n"
        f"If the source material does not contain enough information, output the fallback message exactly: {fallback_message}\n"
        "Do not add any introductory text, apology, or explanation.\n"
        "Do not invent content to fill gaps."
    )
