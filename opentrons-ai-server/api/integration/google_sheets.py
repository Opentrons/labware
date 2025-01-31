import json
import random
import re

import gspread
import structlog
from google.oauth2.service_account import Credentials
from gspread import SpreadsheetNotFound  # type: ignore
from gspread.client import Client as GspreadClient

from api.settings import Settings


class GoogleSheetsClient:
    SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.logger = structlog.stdlib.get_logger(settings.logger_name)
        self.client: GspreadClient = self._initialize_client()

    def _initialize_client(self) -> GspreadClient:
        """Initialize the gspread client with Service Account credentials loaded from the environment."""
        creds: Credentials = self._get_credentials()
        return gspread.authorize(creds)  # type: ignore

    def _get_credentials(self) -> Credentials:
        """Load Service Account credentials from an environment variable."""
        google_credentials_json = self.settings.google_credentials_json.get_secret_value()
        if not google_credentials_json:
            raise EnvironmentError("Missing GOOGLE_SHEETS_CREDENTIALS environment variable.")

        creds_info = json.loads(google_credentials_json)
        creds: Credentials = Credentials.from_service_account_info(info=creds_info, scopes=self.SCOPES)  # type: ignore
        return creds

    @staticmethod
    def sanitize_for_google_sheets(input_text: str) -> str:
        """Sanitize input to remove JavaScript and HTML tags, and prevent formulas."""
        script_pattern = re.compile(r'(javascript:[^"]*|<script.*?>.*?</script>|on\w+=".*?"|on\w+=\'.*?\')', re.IGNORECASE)
        sanitized_text = re.sub(script_pattern, "", input_text)
        sanitized_text = re.sub(r"(<.*?>|&lt;.*?&gt;)", "", sanitized_text)
        sanitized_text = re.sub(r"^\s*=\s*", "", sanitized_text)
        return sanitized_text.strip()

    def append_feedback_to_sheet(self, user_id: str, feedback: str) -> None:
        """Append a row of feedback to the Google Sheet."""
        try:
            sheet_id = self.settings.google_sheet_id
            worksheet_name = self.settings.google_sheet_worksheet
            spreadsheet = self.client.open_by_key(sheet_id)
            worksheet = spreadsheet.worksheet(worksheet_name)

            feedback = self.sanitize_for_google_sheets(feedback)

            worksheet.append_row([user_id, feedback])
            self.logger.info("Feedback successfully appended to Google Sheet.")
        except SpreadsheetNotFound:
            self.logger.error("Spreadsheet not found or not accessible.")
        except Exception:
            self.logger.error("Error appending feedback to Google Sheet.", exc_info=True)


# Example usage
def main() -> None:
    """Run an example appending feedback to Google Sheets."""
    settings = Settings()
    google_sheets_client = GoogleSheetsClient(settings)
    user_id = str(random.randint(100000, 999999))
    feedback = f"This is a test feedback for user {user_id}."
    google_sheets_client.append_feedback_to_sheet(user_id, feedback)


if __name__ == "__main__":
    main()
