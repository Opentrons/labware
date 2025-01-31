import pytest
from pydantic import BaseModel
from typing import Any, Dict, NamedTuple, Optional

from robot_server.service.json_api.resource_links import ResourceLink
from robot_server.service.json_api.response import (
    ResourceModel,
    SimpleBody,
    Body,
    SimpleEmptyBody,
    EmptyBody,
    SimpleMultiBody,
    MultiBody,
    MultiBodyMeta,
    NotifyRefetchBody,
    NotifyUnsubscribeBody,
    DeprecatedResponseModel,
    DeprecatedMultiResponseModel,
)


class _Resource(ResourceModel):
    id: str
    val: Optional[int] = None


class _Links(BaseModel):
    sibling: ResourceLink


class ResponseSpec(NamedTuple):
    """Spec data to test response > dict serialization."""

    subject: BaseModel
    expected: Dict[str, Any]


RESPONSE_SPECS = [
    ResponseSpec(
        subject=SimpleBody(data=_Resource(id="hello")),
        expected={"data": {"id": "hello"}},
    ),
    ResponseSpec(
        subject=Body(
            data=_Resource(id="hello"),
            links=_Links(sibling=ResourceLink(href="/bar")),
        ),
        expected={
            "data": {"id": "hello"},
            "links": {"sibling": {"href": "/bar"}},
        },
    ),
    ResponseSpec(
        subject=SimpleEmptyBody(),
        expected={},
    ),
    ResponseSpec(
        subject=EmptyBody(links=_Links(sibling=ResourceLink(href="/bar"))),
        expected={"links": {"sibling": {"href": "/bar"}}},
    ),
    ResponseSpec(
        subject=SimpleMultiBody(
            data=[_Resource(id="hello"), _Resource(id="goodbye")],
            meta=MultiBodyMeta(cursor=1, totalLength=3),
        ),
        expected={
            "data": [{"id": "hello"}, {"id": "goodbye"}],
            "meta": {"cursor": 1, "totalLength": 3},
        },
    ),
    ResponseSpec(
        subject=MultiBody(
            data=[_Resource(id="hello"), _Resource(id="goodbye")],
            links=_Links(sibling=ResourceLink(href="/bar")),
            meta=MultiBodyMeta(cursor=1, totalLength=3),
        ),
        expected={
            "data": [{"id": "hello"}, {"id": "goodbye"}],
            "links": {"sibling": {"href": "/bar"}},
            "meta": {"cursor": 1, "totalLength": 3},
        },
    ),
    ResponseSpec(
        subject=DeprecatedResponseModel(data=_Resource(id="hello")),
        expected={
            "data": {"id": "hello", "val": None},
            "links": None,
        },
    ),
    ResponseSpec(
        subject=DeprecatedResponseModel(
            data=_Resource(id="hello"),
            links={"sibling": ResourceLink(href="/bar")},
        ),
        expected={
            "data": {"id": "hello", "val": None},
            "links": {"sibling": {"href": "/bar", "meta": None}},
        },
    ),
    ResponseSpec(
        subject=DeprecatedMultiResponseModel(
            data=[_Resource(id="hello"), _Resource(id="goodbye")],
        ),
        expected={
            "data": [{"id": "hello", "val": None}, {"id": "goodbye", "val": None}],
            "links": None,
        },
    ),
    ResponseSpec(
        subject=DeprecatedMultiResponseModel(
            data=[_Resource(id="hello"), _Resource(id="goodbye")],
            links={"sibling": ResourceLink(href="/bar")},
        ),
        expected={
            "data": [{"id": "hello", "val": None}, {"id": "goodbye", "val": None}],
            "links": {"sibling": {"href": "/bar", "meta": None}},
        },
    ),
    ResponseSpec(subject=NotifyRefetchBody(), expected={"refetch": True}),
    ResponseSpec(
        subject=NotifyUnsubscribeBody(),
        expected={"unsubscribe": True},
    ),
]


@pytest.mark.parametrize(ResponseSpec._fields, RESPONSE_SPECS)
def test_response_to_dict(subject: BaseModel, expected: Dict[str, Any]) -> None:
    assert subject.model_dump() == expected
