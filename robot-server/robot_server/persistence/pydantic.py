"""Store Pydantic objects in the SQL database."""

import json
from typing import Type, TypeVar, Sequence, overload
from pydantic import BaseModel, TypeAdapter


_BaseModelT = TypeVar("_BaseModelT", bound=BaseModel)
_TypeAdapterArgT = TypeVar("_TypeAdapterArgT")


def pydantic_to_json(obj: BaseModel) -> str:
    """Serialize a Pydantic object for storing in the SQL database."""
    return obj.model_dump_json(
        # by_alias and exclude_none should match how
        # FastAPI + Pydantic + our customizations serialize these objects
        by_alias=True,
        exclude_none=True,
    )


def pydantic_list_to_json(obj_list: Sequence[BaseModel]) -> str:
    """Serialize a list of Pydantic objects for storing in the SQL database."""
    return json.dumps(
        [obj.model_dump(by_alias=True, exclude_none=True) for obj in obj_list]
    )


@overload
def json_to_pydantic(model: Type[_BaseModelT], json_str: str) -> _BaseModelT:
    ...


@overload
def json_to_pydantic(
    model: TypeAdapter[_TypeAdapterArgT], json_str: str
) -> _TypeAdapterArgT:
    ...


def json_to_pydantic(
    model: Type[_BaseModelT] | TypeAdapter[_TypeAdapterArgT], json_str: str
) -> _BaseModelT | _TypeAdapterArgT:
    """Parse a Pydantic object stored in the SQL database."""
    if isinstance(model, TypeAdapter):
        return model.validate_json(json_str)
    else:
        return model.model_validate_json(json_str)
