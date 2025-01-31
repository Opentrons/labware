from typing import Annotated, List, Literal, Optional

from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel, Field


class Chat(BaseModel):
    role: str
    content: str


# from api.domain.fake_responses import fake_keys
# really hate that I cannot *fake_keys
# and therefore must keep them in sync
# unit test validates that they are in sync
FakeKeys = Literal["reagent transfer", "reagent transfer flex", "pcr", "pcr flex", "no markdown", "empty reply"]
# Use Annotated to specify string constraints
FakeKeyType = Annotated[
    Optional[FakeKeys], Field(None, description="The key to use for the fake response. If not provided, the default is used.")
]

HistoryType = Annotated[
    Optional[List[ChatCompletionMessageParam]],
    Field(None, description="Chat history in the form of a list of messages. Type is from OpenAI's ChatCompletionMessageParam"),
]

ChatOptions = Literal["update", "create"]
ChatOptionType = Annotated[Optional[ChatOptions], Field("create", description="which chat pathway did the user enter: create or update")]


class ChatRequest(BaseModel):
    message: str = Field(..., description="The latest message to be processed.")
    history: HistoryType
    fake: bool = Field(True, description="When set to true, the response will be a fake. OpenAI API is not used.")
    fake_key: FakeKeyType
    chat_options: ChatOptionType
