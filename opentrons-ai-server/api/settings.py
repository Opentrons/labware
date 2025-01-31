import os
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PATH: Path = Path(Path(__file__).parent.parent, ".env")


def is_running_in_docker() -> bool:
    return os.path.exists("/.dockerenv")


class Settings(BaseSettings):
    """
    If the env_file file exists: It will read the configurations from the env_file file (local execution)
    If the env_file file does not exist:
    It will read the configurations from the environment variables set in the operating system (deployed execution)
    If the variable is not set in the OS the default value is used (this is just for creating the .env file with default values)
    """

    model_config = SettingsConfigDict(env_file=ENV_PATH, env_file_encoding="utf-8")
    environment: str = "local"
    huggingface_simulate_endpoint: str = "https://Opentrons-simulator.hf.space/protocol"
    log_level: str = "info"
    service_name: str = "local-ai-api"
    openai_model_name: str = "gpt-4-1106-preview"
    anthropic_model_name: str = "claude-3-5-sonnet-20241022"
    model: str = "claude"
    auth0_domain: str = "opentrons-dev.us.auth0.com"
    auth0_api_audience: str = "sandbox-ai-api"
    auth0_issuer: str = "https://identity.auth-dev.opentrons.com/"
    auth0_algorithms: str = "RS256"
    dd_version: str = "hardcoded_default_from_settings"
    allowed_origins: str = "*"
    dd_trace_enabled: str = "false"
    cpu: str = "1028"
    memory: str = "2048"
    google_sheet_id: str = "harcoded_default_from_settings"
    google_sheet_worksheet: str = "Sheet1"

    # Secrets
    # These come from environment variables in the local and deployed execution environments
    openai_api_key: SecretStr = SecretStr("default_openai_api_key")
    huggingface_api_key: SecretStr = SecretStr("default_huggingface_api_key")
    google_credentials_json: SecretStr = SecretStr("default_google_credentials_json")
    datadog_api_key: SecretStr = SecretStr("default_datadog_api_key")
    anthropic_api_key: SecretStr = SecretStr("default_anthropic_api_key")
    wandb_api_key: SecretStr = SecretStr("default_wandb_api_key")

    @property
    def json_logging(self) -> bool:
        if self.environment == "local" and not is_running_in_docker():
            return False
        return True

    @property
    def logger_name(self) -> str:
        return "app.logger"


def get_settings_from_json(json_str: str) -> Settings:
    """
    Validates the settings from a json string.
    """
    return Settings.model_validate_json(json_str)


def generate_env_file(settings: Settings) -> None:
    """
    Generates a .env file from the current settings including defaults.
    """
    with open(ENV_PATH, "w") as file:
        for field, value in settings.model_dump().items():
            if value is not None:
                if isinstance(value, SecretStr):
                    value = value.get_secret_value()
                file.write(f"{field.upper()}={value}\n")
    print(f".env file generated at {str(ENV_PATH)}")


# Example usage
if __name__ == "__main__":
    config: Settings = Settings()
    generate_env_file(config)
