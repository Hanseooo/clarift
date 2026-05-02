"""Shared self-check templates for chains."""


def standard_self_check(items: list[str] | None = None) -> str:
    defaults = [
        "Is every question/answer derived solely from the source material?",
        "Are all character and word limits respected?",
        "Is the JSON valid and well-formed?",
    ]
    checks = items or defaults
    lines = "\n".join(f"- [ ] {item}" for item in checks)
    return f"## SELF-CHECK (perform before outputting)\n{lines}"
