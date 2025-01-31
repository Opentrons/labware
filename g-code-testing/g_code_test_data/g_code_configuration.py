import os
from pathlib import Path
from typing import (
    Callable,
    ClassVar,
    List,
    Optional,
    Set,
    Type,
    Union,
)
from typing_extensions import (
    Annotated,
    Final,
    Literal,
)

import pytest
from _pytest.mark.structures import Mark
from g_code_parsing.g_code_engine import GCodeEngine
from g_code_parsing.g_code_program.supported_text_modes import SupportedTextModes
from opentrons.hardware_control.emulation.settings import Settings, SmoothieSettings
from opentrons.protocols.api_support.types import APIVersion

from pydantic import (
    StringConstraints,
    ConfigDict,
    BaseModel,
    Field,
    model_validator,
)

BUCKET_NAME = "g-code-comparison"
COMPARISON_FILES_FOLDER_PATH = os.path.join(os.path.dirname(__file__), 'comparison_files')


class SharedFunctionsMixin:
    """Functions that GCodeConfirmConfig classes share."""
    def add_mark(self, user_mark: Mark) -> None:
        self.marks.append(user_mark)



class ProtocolGCodeConfirmConfig(BaseModel, SharedFunctionsMixin):
    path: str
    name: Optional[Annotated[str, StringConstraints(pattern=r'^[a-z0-9_]*$')]] = None
    settings: Settings
    results_dir: ClassVar[str] = "protocols"
    driver: str = 'protocol'
    marks: List[Mark] = [pytest.mark.g_code_confirm]
    versions: Set[Union[APIVersion,int]] = Field(..., min_length=1)
    model_config = ConfigDict(arbitrary_types_allowed=True)

    @model_validator(mode="after")
    def _populate_name_from_path(self) -> "ProtocolGCodeConfirmConfig":
        """If `.name` was not given, give it a default based on `.path`."""
        derived_name = os.path.splitext(os.path.basename(self.path))[0]
        if self.name is None:
            self.name = derived_name
        return self

    def _get_full_path(self, version: APIVersion):
        return os.path.join(
            COMPARISON_FILES_FOLDER_PATH,
            self.get_comparison_file_path(version)
            )

    def get_configuration_paths(self, version: APIVersion) -> str:
        """Get the configuration file path."""
        return os.path.join(self.results_dir, self.name, version.__str__())

    def get_comparison_file_path(self, version: APIVersion) -> str:
        """Get that path of comparison file."""
        return os.path.join(self.results_dir, version.__str__(), f"{self.name}.txt")

    def get_comparison_file(self, version: APIVersion) -> str:
        """Pull comparison file and print it's content."""
        file_path = self._get_full_path(version)
        file = open(file_path, "r")
        return ''.join(file.readlines()).strip()

    async def update_comparison(self, version: APIVersion) -> str:
        """Run config and override the comparison file with output."""
        Path(os.path.dirname(self._get_full_path(version))).mkdir(parents=True, exist_ok=True)
        with open(self._get_full_path(version), 'w') as file:
            file.write(await self.execute(version))
        return "File uploaded successfully"

    def comparison_file_exists(self, version: APIVersion) -> bool:
        return os.path.exists(self._get_full_path(version))

    async def execute(self, version: APIVersion):
        async with GCodeEngine(self.settings).run_protocol(self.path, version) as program:
            return program.get_text_explanation(SupportedTextModes.CONCISE)


class HTTPGCodeConfirmConfig(BaseModel, SharedFunctionsMixin):
    name: Annotated[str, StringConstraints(pattern=r'^[a-z0-9_]*$')]
    executable: Callable
    settings: Settings
    results_dir: ClassVar[str] = "http"
    driver: str = 'http'
    marks: List[Mark] = [pytest.mark.g_code_confirm]
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def _get_full_path(self) -> str:
        return os.path.join(COMPARISON_FILES_FOLDER_PATH, self.get_comparison_file_path())

    def comparison_file_exists(self) -> bool:
        return os.path.exists(self._get_full_path())

    def get_configuration_paths(self) -> str:
        """Get the configuration file path."""
        return os.path.join(self.results_dir, f"{self.name}")

    def get_comparison_file_path(self) -> str:
        """Get that path of comparison file."""
        return os.path.join(self.results_dir, f"{self.name}.txt")

    def get_comparison_file(self) -> str:
        """Pull comparison file and print it's content."""
        file = open(self._get_full_path(), "r")
        return ''.join(file.readlines()).strip()

    async def update_comparison(self) -> str:
        """Run config and override the comparison file with output."""
        with open(self._get_full_path(), 'w') as file:
            file.write(await self.execute())
        return "File uploaded successfully"

    def execute(self):
        with GCodeEngine(self.settings).run_http(self.executable) as program:
            return program.get_text_explanation(SupportedTextModes.CONCISE)
