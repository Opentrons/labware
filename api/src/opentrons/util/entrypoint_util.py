""" opentrons.util.entrypoint_util: functions common to entrypoints
"""

import asyncio
import contextlib
from dataclasses import dataclass
import json
import logging
import pathlib
import subprocess
import sys
import tempfile
from typing import (
    Dict,
    Generator,
    List,
    Optional,
    Sequence,
    Union,
    TYPE_CHECKING,
)

from opentrons.calibration_storage.deck_configuration import (
    deserialize_deck_configuration,
)
from opentrons.config import (
    ARCHITECTURE,
    IS_ROBOT,
    JUPYTER_NOTEBOOK_LABWARE_DIR,
    SystemArchitecture,
)
from opentrons.protocols import labware
from opentrons.calibration_storage import helpers
from opentrons.protocol_engine.errors.error_occurrence import (
    ErrorOccurrence as ProtocolEngineErrorOccurrence,
)
from opentrons.protocol_engine.types import DeckConfigurationType
from opentrons.protocol_reader import ProtocolReader, ProtocolSource
from opentrons.protocols.types import JsonProtocol, Protocol, PythonProtocol

if TYPE_CHECKING:
    from opentrons_shared_data.labware.types import LabwareDefinition


log = logging.getLogger(__name__)


@dataclass
class FoundLabware:
    """An individual labware found by `labware_from_paths()`."""

    path: pathlib.Path
    definition: "LabwareDefinition"


def labware_from_paths(
    paths: Sequence[Union[str, pathlib.Path]]
) -> Dict[str, FoundLabware]:
    """Search paths for labware definitions.

    Returns:
        A dict, keyed by labware URI, where each value has the file path and the parsed def.
    """
    labware_defs: Dict[str, FoundLabware] = {}

    for strpath in paths:
        log.info(f"local labware: checking path {strpath}")
        purepath = pathlib.PurePath(strpath)
        if purepath.is_absolute():
            path = pathlib.Path(purepath)
        else:
            path = pathlib.Path.cwd() / purepath
        if not path.is_dir():
            raise RuntimeError(f"{path} is not a directory")
        for child in path.iterdir():
            if child.is_file() and child.suffix.endswith("json"):
                try:
                    defn = labware.verify_definition(child.read_bytes())
                except labware.NotALabwareError:
                    log.info(f"{child}: invalid labware, ignoring")
                    log.debug(
                        f"{child}: labware invalid because of this exception.",
                        exc_info=True,
                    )
                else:
                    uri = helpers.uri_from_definition(defn)
                    labware_defs[uri] = FoundLabware(path=child, definition=defn)
                    log.info(f"loaded labware {uri} from {child}")
            else:
                log.info(f"ignoring {child} in labware path")
    return labware_defs


def find_jupyter_labware() -> Optional[Dict[str, FoundLabware]]:
    """Return labware files in this robot's Jupyter Notebook directory.

    Returns:
        If we're running on an Opentrons robot:
        A dict, keyed by labware URI, where each value has the file path and the parsed def.

        Otherwise: None.
    """
    if IS_ROBOT:
        # JUPYTER_NOTEBOOK_LABWARE_DIR should never be None when IS_ROBOT == True.
        assert JUPYTER_NOTEBOOK_LABWARE_DIR is not None
        if JUPYTER_NOTEBOOK_LABWARE_DIR.is_dir():
            return labware_from_paths([JUPYTER_NOTEBOOK_LABWARE_DIR])

    return None


def datafiles_from_paths(paths: Sequence[Union[str, pathlib.Path]]) -> Dict[str, bytes]:
    datafiles: Dict[str, bytes] = {}
    for strpath in paths:
        log.info(f"data files: checking path {strpath}")
        purepath = pathlib.PurePath(strpath)
        if purepath.is_absolute():
            path = pathlib.Path(purepath)
        else:
            path = pathlib.Path.cwd() / purepath
        if path.is_file():
            datafiles[path.name] = path.read_bytes()
            log.info(f"read {path} into custom data as {path.name}")
        elif path.is_dir():
            for child in path.iterdir():
                if child.is_file():
                    datafiles[child.name] = child.read_bytes()
                    log.info(f"read {child} into data path as {child.name}")
                else:
                    log.info(f"ignoring {child} in data path")
    return datafiles


def get_deck_configuration() -> DeckConfigurationType:
    """Return the host robot's current deck configuration.

    This is a hacky implementation because the deck configuration is owned by
    robot-server. See `robot_server.deck_configuration.cli`.
    """
    match ARCHITECTURE:
        # These hard-coded paths need to be kept in sync with robot-server's
        # systemd configuration:
        case SystemArchitecture.BUILDROOT:
            robot_server_persistence_dir = "/data/opentrons_robot_server"
        case SystemArchitecture.YOCTO:
            robot_server_persistence_dir = "/var/lib/opentrons-robot-server"
        case SystemArchitecture.HOST:
            # todo(mm, 2024-08-13):
            # It's unclear what should happen if you run an `opentrons.execute` entry
            # point on a non-robot device that doesn't have robot-server. I can't
            # imagine we'd let actual users do this, but it might happen in internal
            # testing. This empty list return value is totally arbitrary and will
            # probably not do the right thing.
            return []

    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "robot_server.deck_configuration.cli",
            "--persistence-directory",
            robot_server_persistence_dir,
        ],
        check=True,
        capture_output=True,
    )
    deserialized_deck_configuration = deserialize_deck_configuration(proc.stdout)
    if deserialized_deck_configuration is None:
        raise RuntimeError("Error getting the host robot's deck configuration.")

    cutout_fixture_placements, _ = deserialized_deck_configuration

    return [
        (
            cutout_fixture_placement.cutout_id,
            cutout_fixture_placement.cutout_fixture_id,
            cutout_fixture_placement.opentrons_module_serial_number,
        )
        for cutout_fixture_placement in cutout_fixture_placements
    ]


@contextlib.contextmanager
def adapt_protocol_source(protocol: Protocol) -> Generator[ProtocolSource, None, None]:
    """Convert a `Protocol` to a `ProtocolSource`.

    `Protocol` and `ProtocolSource` do basically the same thing. `Protocol` is the traditional
    interface. `ProtocolSource` is the newer, but not necessarily better, interface that's required
    to run stuff through Protocol Engine. Ideally, the two would be unified. Until then, we have
    this shim.

    This is a context manager because it needs to keep some temp files around.
    """
    # ProtocolReader needs to know the filename of the main protocol file so it can infer from its
    # extension whether it's a JSON or Python protocol. But that filename doesn't necessarily exist,
    # like when a user passes a text stream to opentrons.simulate.simulate(). As a hack, work
    # backwards and synthesize a dummy filename with the correct extension.
    if protocol.filename is not None:
        # We were given a filename, so no need to guess.
        #
        # It's not well-defined in our customer-facing interfaces whether the supplied protocol_name
        # should be just the filename part, or a path with separators. In case it contains stuff
        # like "../", sanitize it to just the filename part so we don't save files somewhere bad.
        main_file_name = pathlib.Path(protocol.filename).name
    elif isinstance(protocol, JsonProtocol):
        main_file_name = "protocol.json"
    else:
        main_file_name = "protocol.py"

    with tempfile.TemporaryDirectory() as temporary_directory:
        # FIXME(mm, 2023-06-26): Copying these files is pure overhead, and it introduces encoding
        # hazards. Remove this when we can parse JSONv6+ and PAPIv2.14+ protocols without going
        # through the filesystem. https://opentrons.atlassian.net/browse/RSS-281

        main_file = pathlib.Path(temporary_directory) / main_file_name
        if isinstance(protocol.text, str):
            main_file.write_text(protocol.text, encoding="utf-8")
        else:
            main_file.write_bytes(protocol.text)

        labware_files: List[pathlib.Path] = []
        if isinstance(protocol, PythonProtocol) and protocol.extra_labware is not None:
            for labware_index, labware_definition in enumerate(
                protocol.extra_labware.values()
            ):
                new_labware_file = (
                    pathlib.Path(temporary_directory) / f"{labware_index}.json"
                )
                new_labware_file.write_text(
                    json.dumps(labware_definition), encoding="utf-8"
                )
                labware_files.append(new_labware_file)

        protocol_source = asyncio.run(
            ProtocolReader().read_saved(
                files=[main_file] + labware_files,
                directory=None,
                files_are_prevalidated=False,
            )
        )

        yield protocol_source


class ProtocolEngineExecuteError(Exception):
    def __init__(self, errors: List[ProtocolEngineErrorOccurrence]) -> None:
        """Raised when there was any fatal error running a protocol through Protocol Engine.

        Protocol Engine reports errors as data, not as exceptions.
        But the only way for `opentrons.execute.execute()` and `opentrons.simulate.simulate()`
        to signal problems to their callers is to raise something.
        So we need this class to wrap them.

        Params:
            errors: The errors that Protocol Engine reported.
        """
        # Show the full error details if this is part of a traceback. Don't try to summarize.
        super().__init__(errors)

        self._error_occurrences = errors

    def to_stderr_string(self) -> str:
        """Return a string suitable as the stderr output of the `opentrons_execute` CLI.

        This summarizes from the full error details.
        """
        # It's unclear what exactly we should extract here.
        #
        # First, do we print the first element, or the last, or all of them?
        #
        # Second, do we print the .detail? .errorCode? .errorInfo? .wrappedErrors?
        # By contract, .detail seems like it would be insufficient, but experimentally,
        # it includes a lot, like:
        #
        #     ProtocolEngineError [line 3]: Error 4000 GENERAL_ERROR (ProtocolEngineError):
        #     UnexpectedProtocolError: Labware "fixture_12_trough" not found with version 1
        #     in namespace "fixture".
        return self._error_occurrences[0].detail
