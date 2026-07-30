from __future__ import annotations

from app.pipeline.base import Pipeline, PipelineContext, PipelineStep
from app.pipeline.classification import ClassificationStep
from app.pipeline.extraction import ExtractionStep
from app.pipeline.gl_categorization import (
    GlAccountCode,
    GlCategorizationStep,
    GlSuggestion,
)
from app.pipeline.validation import ValidationStep


def build_default_pipeline() -> Pipeline:
    return Pipeline(
        [
            ClassificationStep(),
            ExtractionStep(),
            ValidationStep(),
            GlCategorizationStep(),
        ]
    )


__all__ = [
    "ClassificationStep",
    "ExtractionStep",
    "GlAccountCode",
    "GlCategorizationStep",
    "GlSuggestion",
    "Pipeline",
    "PipelineContext",
    "PipelineStep",
    "ValidationStep",
    "build_default_pipeline",
]
