"""Unit tests for `robot_server.persistence.pydantic`."""


from pydantic import BaseModel, Field, TypeAdapter

from robot_server.persistence import pydantic as subject


class _DummyModel(BaseModel):
    field: str
    aliasedField: str = Field(alias="aliasedFieldAlias")


def test_round_trip() -> None:
    """Test Python->JSON->Python round trips."""
    original = _DummyModel.model_construct(field="hello", aliasedField="world")
    after_round_trip = subject.json_to_pydantic(
        _DummyModel, subject.pydantic_to_json(original)
    )
    assert after_round_trip == original

    original_list = [original] * 10
    after_round_trip_list = subject.json_to_pydantic(
        TypeAdapter(list[_DummyModel]), subject.pydantic_list_to_json(original_list)
    )
    assert after_round_trip_list == original_list


def test_field_aliases() -> None:
    """The JSON should contain field aliases, not the Python attribute names."""
    original = _DummyModel.model_construct(field="hello", aliasedField="world")
    json = subject.pydantic_to_json(original)
    json_list = subject.pydantic_list_to_json([original])
    assert '"aliasedFieldAlias"' in json
    assert '"aliasedFieldAlias"' in json_list
