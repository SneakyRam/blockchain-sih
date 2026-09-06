from __future__ import annotations

from typing import Any


class ToolSpec:
    """Declares a read-only tool available to the AI copilot."""

    def __init__(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
        read_only: bool = True,
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.read_only = read_only
        if not read_only:
            raise ValueError("Copilot tools must be read-only")

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "read_only": self.read_only,
        }


class CopilotToolKit:
    """Defines read-only tools available to the AI copilot."""

    TOOLS = [
        ToolSpec(
            "get_case_summary",
            "Retrieve investigation case summary and metadata.",
            {
                "type": "object",
                "properties": {"case_id": {"type": "string"}},
                "required": ["case_id"],
            },
        ),
        ToolSpec(
            "get_investigation_findings",
            "Retrieve rule-based findings linked to a specific investigation.",
            {
                "type": "object",
                "properties": {
                    "case_id": {"type": "string"},
                    "investigation_id": {"type": "string"},
                },
                "required": ["case_id", "investigation_id"],
            },
        ),
        ToolSpec(
            "get_risk_factors",
            "Retrieve decomposed risk factors and their contributions.",
            {
                "type": "object",
                "properties": {
                    "case_id": {"type": "string"},
                    "investigation_id": {"type": "string"},
                },
                "required": ["case_id", "investigation_id"],
            },
        ),
        ToolSpec(
            "get_attribution_assessment",
            "Retrieve provider-backed entity attribution with confidence.",
            {
                "type": "object",
                "properties": {
                    "case_id": {"type": "string"},
                    "investigation_id": {"type": "string"},
                },
                "required": ["case_id", "investigation_id"],
            },
        ),
        ToolSpec(
            "list_transactions",
            "Retrieve paginated transaction evidence from an investigation.",
            {
                "type": "object",
                "properties": {
                    "case_id": {"type": "string"},
                    "investigation_id": {"type": "string"},
                    "limit": {"type": "integer", "default": 50},
                    "offset": {"type": "integer", "default": 0},
                },
                "required": ["case_id", "investigation_id"],
            },
        ),
        ToolSpec(
            "list_threat_intel",
            "Retrieve threat intelligence records linked to a case.",
            {
                "type": "object",
                "properties": {"case_id": {"type": "string"}},
                "required": ["case_id"],
            },
        ),
        ToolSpec(
            "get_evidence_artifacts",
            "Retrieve evidence artifacts with integrity hashes.",
            {
                "type": "object",
                "properties": {
                    "case_id": {"type": "string"},
                    "investigation_id": {"type": "string"},
                },
                "required": ["case_id", "investigation_id"],
            },
        ),
        ToolSpec(
            "list_alerts",
            "Retrieve open or resolved risk alerts for a case.",
            {
                "type": "object",
                "properties": {
                    "case_id": {"type": "string"},
                    "status": {"type": "string", "enum": ["open", "resolved"]},
                },
                "required": ["case_id"],
            },
        ),
    ]

    @classmethod
    def get_tools(cls) -> list[ToolSpec]:
        """Return the list of available tools."""
        return cls.TOOLS

    @classmethod
    def get_tool_by_name(cls, name: str) -> ToolSpec | None:
        """Retrieve a tool specification by name."""
        return next((t for t in cls.TOOLS if t.name == name), None)


class CopilotContext:
    """Execution context for copilot reasoning with access boundaries."""

    def __init__(
        self,
        case_id: str,
        investigation_id: str,
        user_id: str,
        question: str,
    ):
        self.case_id = case_id
        self.investigation_id = investigation_id
        self.user_id = user_id
        self.question = question
        self.tool_calls: list[dict[str, Any]] = []
        self.response: str | None = None
        self.model_ready = False

    def add_tool_call(self, tool_name: str, parameters: dict[str, Any], result: Any) -> None:
        """Log a tool call made by the copilot."""
        self.tool_calls.append({
            "tool": tool_name,
            "parameters": parameters,
            "result_summary": str(result)[:200],
        })

    def to_dict(self) -> dict[str, Any]:
        return {
            "case_id": self.case_id,
            "investigation_id": self.investigation_id,
            "user_id": self.user_id,
            "question": self.question,
            "tool_calls_count": len(self.tool_calls),
            "tool_calls": self.tool_calls,
            "response": self.response,
            "model_ready": self.model_ready,
        }


class AIEvidence:
    """Evidence-linked AI reasoning result."""

    def __init__(
        self,
        investigation_id: str,
        reasoning_type: str,
        answer: str,
        supporting_evidence: list[str],
        confidence: float,
    ):
        self.investigation_id = investigation_id
        self.reasoning_type = reasoning_type
        self.answer = answer
        self.supporting_evidence = supporting_evidence
        self.confidence = max(0.0, min(1.0, confidence))
        self.generated_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        return {
            "investigation_id": self.investigation_id,
            "reasoning_type": self.reasoning_type,
            "answer": self.answer,
            "supporting_evidence": self.supporting_evidence,
            "confidence": self.confidence,
            "generated_at": self.generated_at,
            "disclaimer": "AI-generated reasoning is an investigator support tool, not a legal conclusion or autonomous enforcement decision.",
        }


class Copilot:
    """Evidence-grounded AI copilot with read-only tool access."""

    def __init__(self):
        self.tools = CopilotToolKit.get_tools()
        self.model_ready = False

    def set_model_ready(self, ready: bool) -> None:
        """Signal whether an LLM model is available."""
        self.model_ready = ready

    def reason(self, context: CopilotContext) -> AIEvidence | None:
        """Run reasoning with evidence-backed tool calls."""
        if not self.model_ready:
            return None
        return AIEvidence(
            investigation_id=context.investigation_id,
            reasoning_type="deterministic_evidence_summary",
            answer="AI model not yet available; review deterministic findings and risk factors.",
            supporting_evidence=[],
            confidence=0.0,
        )
