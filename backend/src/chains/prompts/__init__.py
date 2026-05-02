"""Reusable prompt composition modules ("skills") for Clarift chains."""

from src.chains.prompts.chat_modes import ChatMode, get_mode_rules
from src.chains.prompts.fallback import fallback_behavior
from src.chains.prompts.fidelity import strict_source_only
from src.chains.prompts.output_rules import json_schema_rules, xml_output_rules
from src.chains.prompts.persona import ChatPersona, get_persona_description
from src.chains.prompts.preferences import build_preference_context
from src.chains.prompts.self_check import standard_self_check

__all__ = [
    "build_preference_context",
    "ChatMode",
    "ChatPersona",
    "fallback_behavior",
    "get_mode_rules",
    "get_persona_description",
    "json_schema_rules",
    "standard_self_check",
    "strict_source_only",
    "xml_output_rules",
]
