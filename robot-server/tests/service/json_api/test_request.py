from pytest import raises
from pydantic import ValidationError
from typing import Any, Dict

from robot_server.service.json_api.request import RequestModel
from tests.service.helpers import ItemModel


def test_attributes_as_dict():
    DictRequest = RequestModel[dict]
    obj_to_validate = {"data": {"some_data": 1}}
    my_request_obj = DictRequest.model_validate(obj_to_validate)
    assert my_request_obj.model_dump() == {"data": {"some_data": 1}}


def test_attributes_as_item_model():
    ItemRequest = RequestModel[ItemModel]
    obj_to_validate = {"data": {"name": "apple", "quantity": 10, "price": 1.20}}
    my_request_obj = ItemRequest.model_validate(obj_to_validate)
    assert my_request_obj.model_dump() == obj_to_validate


def test_attributes_as_item_model_empty_dict():
    ItemRequest = RequestModel[ItemModel]
    obj_to_validate: Dict[str, Any] = {"data": {}}
    with raises(ValidationError) as e:
        ItemRequest.model_validate(obj_to_validate)

    assert e.value.errors() == [
        {
            "loc": ("data", "name"),
            "msg": "Field required",
            "type": "missing",
            "input": {},
            "url": "https://errors.pydantic.dev/2.9/v/missing",
        },
        {
            "loc": ("data", "quantity"),
            "msg": "Field required",
            "type": "missing",
            "input": {},
            "url": "https://errors.pydantic.dev/2.9/v/missing",
        },
        {
            "loc": ("data", "price"),
            "msg": "Field required",
            "type": "missing",
            "input": {},
            "url": "https://errors.pydantic.dev/2.9/v/missing",
        },
    ]


def test_attributes_required():
    MyRequest = RequestModel[dict]
    obj_to_validate = {"data": None}
    with raises(ValidationError) as e:
        MyRequest.model_validate(obj_to_validate)

    assert e.value.errors() == [
        {
            "loc": ("data",),
            "msg": "Input should be a valid dictionary",
            "input": None,
            "url": "https://errors.pydantic.dev/2.9/v/dict_type",
            "type": "dict_type",
        },
    ]


def test_data_required():
    MyRequest = RequestModel[dict]
    obj_to_validate = {"data": None}
    with raises(ValidationError) as e:
        MyRequest.model_validate(obj_to_validate)

    assert e.value.errors() == [
        {
            "loc": ("data",),
            "msg": "Input should be a valid dictionary",
            "input": None,
            "url": "https://errors.pydantic.dev/2.9/v/dict_type",
            "type": "dict_type",
        },
    ]


def test_request_with_id():
    MyRequest = RequestModel[dict]
    obj_to_validate = {
        "data": {"type": "item", "attributes": {}, "id": "abc123"},
    }
    my_request_obj = MyRequest.model_validate(obj_to_validate)
    assert my_request_obj.model_dump() == {
        "data": {"type": "item", "attributes": {}, "id": "abc123"},
    }
