from typing import Optional

from pydantic import BaseModel, Field, field_validator


class FeedbackRequest(BaseModel):
    feedbackText: str = Field(..., description="The feedback message content")
    fake: Optional[bool] = Field(False, description="Indicates if this is a fake feedback entry")

    # Validation to ensure feedback_text is populated and not empty
    @field_validator("feedbackText")
    def feedback_text_must_not_be_empty(cls, value: str) -> str:
        if not value or value.strip() == "":
            raise ValueError("feedback_text must be populated and not empty")
        return value
