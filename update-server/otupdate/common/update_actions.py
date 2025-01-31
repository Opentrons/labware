"""
otupdate.common.update_actions: abc and resources for system-specific
update actions
"""

from __future__ import annotations

import abc
import contextlib
from typing import Callable, Generator, NamedTuple, Optional, cast
from aiohttp import web

from .constants import APP_VARIABLE_PREFIX


import logging


FILE_ACTIONS_VARNAME = APP_VARIABLE_PREFIX + "fileactions"

LOG = logging.getLogger(__name__)


class Partition(NamedTuple):
    number: int
    path: str
    mount_point: str = ""


class UpdateActionsInterface:
    @staticmethod
    def from_request(request: web.Request) -> Optional[UpdateActionsInterface]:
        """Get the update object from the aiohttp app store"""
        try:
            return cast(UpdateActionsInterface, request.app[FILE_ACTIONS_VARNAME])
        except KeyError:
            return None

    @classmethod
    def build_and_insert(cls, app: web.Application) -> None:
        """Build the object and put it in the app store"""
        app[FILE_ACTIONS_VARNAME] = cls()

    @abc.abstractmethod
    def validate_update(
        self,
        filepath: str,
        progress_callback: Callable[[float], None],
        cert_path: Optional[str],
    ) -> Optional[str]:
        """Worker for validation. Call in an executor (so it can return things)

        - Unzips filepath to its directory
        - Hashes the rootfs inside
        - If requested, checks the signature of the hash
        :param filepath: The path to the update zip file
        :param progress_callback: The function to call with progress between 0
                                  and 1.0. May never reach precisely 1.0, best
                                  only for user information
        :param cert_path: Path to an x.509 certificate to check the signature
                          against. If ``None``, signature checking is disabled
        :returns str: Path to the rootfs file to update

        Will also raise an exception if validation fails
        """

    @abc.abstractmethod
    def write_update(
        self,
        rootfs_filepath: str,
        progress_callback: Callable[[float], None],
        chunk_size: int = -1,
        file_size: Optional[int] = None,
    ) -> Partition:
        """
        Write the object to a specific rootfs path
        """
        ...

    @abc.abstractmethod
    @contextlib.contextmanager
    def mount_update(self) -> Generator[str, None, None]:
        """
        Mount the fs to overwrite with the update
        """
        ...

    @abc.abstractmethod
    def commit_update(self) -> None:
        """
        Command the hardware to boot from the freshly-updated filesystem
        """
        ...

    @abc.abstractmethod
    def write_machine_id(self, current_root: str, new_root: str) -> None:
        """Copy the machine id over to the new partition"""
        ...

    @abc.abstractmethod
    def clean_up(self, download_dir: str) -> None:
        """Deletes the update files from the download dir."""
        ...
