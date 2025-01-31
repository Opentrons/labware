from typing import Generic, TypeVar
from pydantic import BaseModel, Field


RequestDataT = TypeVar("RequestDataT")


class RequestModel(BaseModel, Generic[RequestDataT]):
    """ """

    data: RequestDataT = Field(..., description="the document’s 'primary data'")
