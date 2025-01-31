from pydantic import BaseModel


class FeedbackResponse(BaseModel):
    reply: str
    fake: bool
