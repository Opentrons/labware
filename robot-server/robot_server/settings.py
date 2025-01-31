import typing
import typing_extensions
import logging
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from dotenv import load_dotenv

from opentrons.config import infer_config_base_dir
from pydantic_settings import BaseSettings, SettingsConfigDict

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_settings() -> "RobotServerSettings":
    """Get the settings"""
    load_dotenv(get_dotenv_path())
    return RobotServerSettings()


def get_dotenv_path() -> Path:
    """Get the location of the settings file"""
    return Environment().dot_env_path


class Environment(BaseSettings):
    """Environment related settings"""

    dot_env_path: Path = infer_config_base_dir() / "robot.env"
    model_config = SettingsConfigDict(env_prefix="OT_ROBOT_SERVER_")


# If you update this, also update the generated settings_schema.json.
class RobotServerSettings(BaseSettings):
    """Robot server settings.

    To override any of these create an environment variable with prefix
    OT_ROBOT_SERVER_.
    """

    simulator_configuration_file_path: typing.Optional[str] = Field(
        default=None,
        description="Path to a json file that describes the hardware simulator.",
    )

    notification_server_subscriber_address: str = Field(
        default="tcp://localhost:5555",
        description="The endpoint to subscribe to notification server topics.",
    )

    persistence_directory: typing.Union[
        # Literal must come first to avoid Pydantic parsing it as a relative Path
        # with the filename "automatically_make_temporary".
        typing_extensions.Literal["automatically_make_temporary"],
        Path,
    ] = Field(
        # TODO(mm, 2022-04-05): This should not have a default value.
        # It only does now because our code has some deep calls to get_settings(),
        # and it's difficult to override this settings object for our unit tests.
        # Making this non-defaultable breaks tests that hit code with deep calls to
        # get_settings().
        default="automatically_make_temporary",
        description=(
            "A directory for the server to store things persistently across boots."
            " If this directory doesn't already exist, the server will create it."
            " If this is the string `automatically_make_temporary`,"
            " the server will use a fresh temporary directory"
            " (effectively not persisting anything)."
            "\n\n"
            "Note that the `opentrons` library is also responsible for persisting"
            " certain things, and it has its own configuration."
        ),
    )

    maximum_runs: int = Field(
        default=20,
        gt=0,
        description=(
            "The maximum number of runs to allow HTTP clients to create before"
            " auto-deleting old ones."
        ),
    )

    maximum_unused_protocols: int = Field(
        default=5,
        gt=0,
        description=(
            'The maximum number of "unused protocols" to allow before auto-deleting'
            ' old ones. A protocol is "unused" if it isn\'t used by any run that'
            " currently exists."
        ),
    )

    model_config = SettingsConfigDict(env_prefix="OT_ROBOT_SERVER_")

    maximum_quick_transfer_protocols: int = Field(
        default=20,
        gt=0,
        description=(
            'The maximum number of "quick transfer protocols" to allow before auto-deleting'
            " old ones."
        ),
    )

    maximum_data_files: int = Field(
        default=50,
        gt=0,
        description=(
            "The maximum number of uploaded data files to allow before auto-deleting old ones."
        ),
    )
