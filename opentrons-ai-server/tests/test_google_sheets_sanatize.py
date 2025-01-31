import pytest
from api.integration.google_sheets import GoogleSheetsClient


@pytest.mark.unit
@pytest.mark.parametrize(
    "input_text, expected_output",
    [
        ('Click <script>alert("Hacked!")</script> here!', "Click  here!"),
        ('javascript:alert("Malicious code")', '"Malicious code")'),
        ("<b>Important</b> message", "Important message"),
        ("onload=\"alert('Attack')\" Hello!", "Hello!"),
        ('=IMPORTRANGE("https://example.com/sheet", "Sheet1!A1")', 'IMPORTRANGE("https://example.com/sheet", "Sheet1!A1")'),
        ("Hello, world!", "Hello, world!"),
        ("<a href=\"javascript:alert('XSS')\">link</a>", "link"),
        ("=SUM(A1:A10)", "SUM(A1:A10)"),
        ('<img src="x" onerror="alert(1)">', ""),
        ('&lt;script&gt;alert("test")&lt;/script&gt;', 'alert("test")'),
    ],
)
def test_sanitize_for_google_sheets(input_text: str, expected_output: str) -> None:
    sanitized_text = GoogleSheetsClient.sanitize_for_google_sheets(input_text)
    assert sanitized_text == expected_output, f"Expected '{expected_output}' but got '{sanitized_text}'"
