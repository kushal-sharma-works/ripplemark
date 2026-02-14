from analysis_service.compatibility.checker import CompatibilityChecker
from analysis_service.schemas.compatibility import CompatibilityRequest


def test_compatibility_detects_breaking():
    checker = CompatibilityChecker()
    before = {
        "components": {
            "schemas": {
                "Thing": {
                    "type": "object",
                    "properties": {"id": {"type": "string"}},
                    "required": ["id"],
                }
            }
        }
    }
    after = {
        "components": {
            "schemas": {
                "Thing": {
                    "type": "object",
                    "properties": {},
                }
            }
        }
    }

    request = CompatibilityRequest(before_schema=before, after_schema=after)
    result = checker.evaluate(request)

    assert result.verdict == "breaking"
    assert any(diff.change == "removed" for diff in result.breaking_changes)


def test_compatibility_detects_safe_addition():
    checker = CompatibilityChecker()
    before = {
        "components": {
            "schemas": {
                "Thing": {
                    "type": "object",
                    "properties": {"id": {"type": "string"}},
                    "required": ["id"],
                }
            }
        }
    }
    after = {
        "components": {
            "schemas": {
                "Thing": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "new": {"type": "string"},
                    },
                    "required": ["id"],
                }
            }
        }
    }

    request = CompatibilityRequest(before_schema=before, after_schema=after)
    result = checker.evaluate(request)

    assert result.verdict == "compatible"
    assert any(diff.change == "added" for diff in result.safe_changes)
