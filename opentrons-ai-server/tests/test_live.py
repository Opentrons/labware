import pytest
from api.models.chat_response import ChatResponse
from api.models.error_response import ErrorResponse
from api.models.feedback_response import FeedbackResponse

from tests.helpers.client import Client


@pytest.mark.live
def test_get_health(client: Client) -> None:
    """Test to verify the health endpoint of the API."""
    response = client.get_health()
    assert response.status_code == 200, "Health endpoint should return HTTP 200"


@pytest.mark.live
def test_get_chat_completion_good_auth(client: Client) -> None:
    """Test the chat completion endpoint with good authentication."""
    response = client.get_chat_completion("How do I load tipracks for my 8 channel pipette on an OT2?", fake=True)
    assert response.status_code == 200, "Chat completion with good auth should return HTTP 200"
    ChatResponse.model_validate(response.json())


@pytest.mark.live
def test_get_chat_completion_bad_auth(client: Client) -> None:
    """Test the chat completion endpoint with bad authentication."""
    response = client.get_chat_completion("How do I load a pipette?", bad_auth=True)
    assert response.status_code == 401, "Chat completion with bad auth should return HTTP 401"


@pytest.mark.live
def test_post_feedback_good_auth(client: Client) -> None:
    """Test the feedback endpoint with good authentication."""
    response = client.post_feedback("Would be nice if it were faster", fake=False)
    assert response.status_code == 200, "Feedback with good auth should return HTTP 200"
    assert response.json()["reply"] == "Feedback Received and sanitized: Would be nice if it were faster", "Response should contain input"
    FeedbackResponse.model_validate(response.json())


@pytest.mark.live
def test_post_empty_feedback_good_auth(client: Client) -> None:
    """Test the feedback endpoint with good authentication."""
    response = client.post_feedback("", fake=False)
    assert response.status_code == 422, "Feedback with feebackText = '' should return HTTP 422"
    ErrorResponse.model_validate(response.json())


@pytest.mark.live
def test_post_feedback_good_auth_fake(client: Client) -> None:
    """Test the feedback endpoint with good authentication."""
    response = client.post_feedback("More LLM", fake=True)
    assert response.status_code == 200, "Fake response"
    assert response.json()["fake"] is True, "Fake indicator should be True"
    assert response.json()["reply"] == "Fake response", "Response should be 'Fake response'"
    FeedbackResponse.model_validate(response.json())


@pytest.mark.live
def test_post_feedback_bad_auth(client: Client) -> None:
    """Test the feedback endpoint with bad authentication."""
    response = client.post_feedback("How do I load tipracks for my 8 channel pipette on an OT2?", fake=False, bad_auth=True)
    assert response.status_code == 401, "Feedback with bad auth should return HTTP 401"


@pytest.mark.live
def test_get_bad_endpoint_with_good_auth(client: Client) -> None:
    """Test a nonexistent endpoint with good authentication."""
    response = client.get_bad_endpoint()
    assert response.status_code == 404, "nonexistent endpoint with good auth should return HTTP 404"


@pytest.mark.live
def test_get_bad_endpoint_with_bad_auth(client: Client) -> None:
    """Test a nonexistent endpoint with bad authentication."""
    response = client.get_bad_endpoint(bad_auth=True)
    assert response.status_code == 404, "nonexistent endpoint with bad auth should return HTTP 404"


@pytest.mark.live
def test_get_options(client: Client) -> None:
    """Test the OPTIONS endpoint."""
    response = client.get_options()
    assert response.status_code == 200, "OPTIONS endpoint should return HTTP 200"
    # This is the shape that makes pre-flight from the client happy.
    expected_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": ["GET", "POST", "OPTIONS"],
        "Access-Control-Allow-Headers": ["content-type", "authorization", "origin", "accept"],
        "Access-Control-Expose-Headers": ["content-type"],
        "Access-Control-Max-Age": "600",
    }
    body = response.json()
    print(response)
    for header, expected_value in expected_headers.items():
        assert body.get(header) == expected_value, f"{header} should be {expected_value}"
