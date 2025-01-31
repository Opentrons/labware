"""Test ErrorOccurrence module."""

import datetime
from typing import List

from opentrons.protocol_engine.errors.error_occurrence import ErrorOccurrence


def test_error_occurrence_schema() -> None:
    """Test that the schema is overwritten succesfully.

    This is explicitly tested because we are overriding the schema
    due to a default value for errorCode.
    """
    required_items: List[str] = ErrorOccurrence.model_json_schema()["$defs"][
        "ErrorOccurrence"
    ]["required"]
    assert "errorCode" in required_items


def test_parse_error_occurrence() -> None:
    """Test that parsing succeeds without an errorCode.

    This is explicitly tested to ensure backwards compatability is maintained.
    """
    input = '{"id": "abcdefg","errorType": "a bad one","createdAt": "2023-06-12 15:08:54.730451","detail": "This is a bad error"}'

    result = ErrorOccurrence.model_validate_json(input)

    expected = ErrorOccurrence(
        id="abcdefg",
        errorType="a bad one",
        createdAt=datetime.datetime.fromisoformat("2023-06-12 15:08:54.730451"),
        detail="This is a bad error",
        errorCode="4000",
    )

    assert result == expected
