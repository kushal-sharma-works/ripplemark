from __future__ import annotations

from typing import Any

from analysis_service.schemas.compatibility import (
    CompatibilityRequest,
    CompatibilityResult,
    FieldDiff,
)


class CompatibilityChecker:
    def extract_schemas(self, schema: dict[str, Any]) -> dict[str, Any]:
        return schema.get("components", {}).get("schemas", {})

    def compare_objects(self, before: dict[str, Any], after: dict[str, Any]) -> list[FieldDiff]:
        diffs: list[FieldDiff] = []
        before_props = before.get("properties", {})
        after_props = after.get("properties", {})
        before_required = set(before.get("required", []))
        after_required = set(after.get("required", []))

        for field, definition in before_props.items():
            if field not in after_props:
                diffs.append(FieldDiff(field=field, change="removed"))
                continue
            after_def = after_props[field]
            if definition.get("type") != after_def.get("type"):
                diffs.append(FieldDiff(field=field, change="type_changed"))
            if field in before_required and field not in after_required:
                diffs.append(FieldDiff(field=field, change="required_to_optional"))
            if field not in before_required and field in after_required:
                diffs.append(FieldDiff(field=field, change="optional_to_required"))

        for field in after_props.keys() - before_props.keys():
            diffs.append(FieldDiff(field=field, change="added"))

        return diffs

    def evaluate(self, request: CompatibilityRequest) -> CompatibilityResult:
        before_schemas = self.extract_schemas(request.before_schema)
        after_schemas = self.extract_schemas(request.after_schema)

        breaking_changes: list[FieldDiff] = []
        safe_changes: list[FieldDiff] = []

        for name, before in before_schemas.items():
            after = after_schemas.get(name, {})
            diffs = self.compare_objects(before, after)
            for diff in diffs:
                if diff.change in {"removed", "type_changed", "optional_to_required"}:
                    breaking_changes.append(diff)
                else:
                    safe_changes.append(diff)

        verdict = "breaking" if breaking_changes else "compatible"

        return CompatibilityResult(
            verdict=verdict,
            breaking_changes=breaking_changes,
            safe_changes=safe_changes,
        )
