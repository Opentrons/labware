import pytest
from api.domain.fake_responses import fake_keys
from api.models.chat_request import ChatRequest, FakeKeys
from api.models.chat_response import ChatResponse
from pydantic import ValidationError


@pytest.mark.unit
def test_chat_request_model() -> None:
    # Test valid data
    request_data = {"message": "Hello", "chat_history": [], "fake": False}
    request = ChatRequest.model_validate(request_data)
    assert request.message == "Hello"
    assert request.fake is False

    # Test invalid data
    with pytest.raises(ValidationError):
        invalid_request_data = {"message": 123, "fake": "true"}
        ChatRequest.model_validate(invalid_request_data)


@pytest.mark.unit
def test_chat_response_model() -> None:
    # Test valid data
    response_data = {"reply": "Hi", "fake": True}
    response = ChatResponse.model_validate(response_data)
    assert response.reply == "Hi"
    assert response.fake is True

    # Test invalid data
    with pytest.raises(ValidationError):
        invalid_response_data = {"reply": 123, "history": "history", "fake": "false"}
        ChatResponse.model_validate(invalid_response_data)


@pytest.mark.unit
def test_chat_response_model_fakes() -> None:
    # Test that the FakeKeys Literal exactly matches the fake_keys list
    assert set(fake_keys) == set(FakeKeys.__args__)  # type: ignore[attr-defined]
