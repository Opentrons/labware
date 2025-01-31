""" opentrons.simulate: functions and entrypoints for simulating protocols

This module has functions that provide a console entrypoint for simulating
a protocol from the command line.
"""
import argparse
import asyncio
import atexit
from contextlib import ExitStack, contextmanager
import sys
import logging
import os
import pathlib
import queue
from typing import (
    TYPE_CHECKING,
    Generator,
    Any,
    Dict,
    List,
    Mapping,
    TextIO,
    Tuple,
    BinaryIO,
    Optional,
    Union,
)
from typing_extensions import Literal

from opentrons_shared_data.robot.types import RobotType

import opentrons
from opentrons import should_use_ot3
from opentrons.hardware_control import (
    API as OT2API,
    ThreadManager,
    ThreadManagedHardware,
)
from opentrons.hardware_control.types import HardwareFeatureFlags

from opentrons.hardware_control.simulator_setup import load_simulator
from opentrons.protocol_api.core.engine import ENGINE_CORE_API_VERSION
from opentrons.protocol_api.protocol_context import ProtocolContext
from opentrons.protocol_engine.create_protocol_engine import (
    create_protocol_engine_in_thread,
    create_protocol_engine,
)
from opentrons.protocol_engine import error_recovery_policy
from opentrons.protocol_engine.state.config import Config
from opentrons.protocol_engine.types import DeckType, EngineStatus, PostRunHardwareState
from opentrons.protocol_reader.protocol_source import ProtocolSource
from opentrons.protocol_runner.protocol_runner import create_protocol_runner, LiveRunner
from opentrons.protocol_runner import RunOrchestrator
from opentrons.protocols.duration import DurationEstimator
from opentrons.protocols.execution import execute
from opentrons.legacy_broker import LegacyBroker
from opentrons.config import IS_ROBOT
from opentrons import protocol_api
from opentrons.legacy_commands import types as command_types

from opentrons.protocols import parse, bundle
from opentrons.protocols.types import (
    ApiDeprecationError,
    Protocol,
    PythonProtocol,
    BundleContents,
)
from opentrons.protocols.api_support.deck_type import (
    for_simulation as deck_type_for_simulation,
    should_load_fixed_trash,
    should_load_fixed_trash_labware_for_python_protocol,
)
from opentrons.protocols.api_support.types import APIVersion
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from .util import entrypoint_util

if TYPE_CHECKING:
    from opentrons_shared_data.labware.types import (
        LabwareDefinition as LabwareDefinitionDict,
    )


# See Jira RCORE-535.
_JSON_TOO_NEW_MESSAGE = (
    "Protocols created by recent versions of Protocol Designer"
    " cannot currently be simulated with"
    " the opentrons_simulate command-line tool"
    " or the opentrons.simulate.simulate() function."
    " Use the Opentrons App instead."
)


# When a ProtocolContext is using a ProtocolEngine to control the robot,
# it requires some long-lived resources. There's a background thread,
# an asyncio event loop in that thread, and some ProtocolEngine-controlled background tasks in that
# event loop.
#
# When we're executing a protocol file beginning-to-end, we can clean up those resources after it
# completes. However, when someone gets a live ProtocolContext through get_protocol_api(), we have
# no way of knowing when they're done with it. So, as a hack, we keep these resources open
# indefinitely, letting them leak.
#
# We keep this at module scope so that the contained context managers aren't garbage-collected.
# If they're garbage collected, they can close their resources prematurely.
# https://stackoverflow.com/a/69155026/497934
_LIVE_PROTOCOL_ENGINE_CONTEXTS = ExitStack()


# TODO(mm, 2023-10-05): Deduplicate this with opentrons.protocols.parse().
_UserSpecifiedRobotType = Literal["OT-2", "Flex"]
"""The user-facing robot type specifier.

This should match what `opentrons.protocols.parse()` accepts in a protocol's `requirements` dict.
"""


# TODO(mm, 2023-10-05): Type _SimulateResultRunLog more precisely by using TypedDicts from
# opentrons.legacy_commands.
_SimulateResultRunLog = List[Mapping[str, Any]]
_SimulateResult = Tuple[_SimulateResultRunLog, Optional[BundleContents]]


class _AccumulatingHandler(logging.Handler):
    def __init__(
        self,
        level: str,
        command_queue: "queue.Queue[object]",
    ) -> None:
        """Create the handler

        :param level: The logging level to capture
        :param command_queue: The queue.Queue to use for messages
        """
        self._command_queue = command_queue
        super().__init__(level)

    def emit(self, record: object) -> None:
        self._command_queue.put(record)


class _CommandScraper:
    def __init__(
        self, logger: logging.Logger, level: str, broker: LegacyBroker
    ) -> None:
        """An object that handles scraping the broker for commands and integrating log messages
        with them.

        Params:
            logger: The logger to integrate messages from, e.g. ``logging.getLogger("opentrons")``.
            level: The log level to scrape.
            broker: The broker to subscribe to for commands.
        """
        self._logger = logger
        self._level = level
        self._broker = broker
        self._commands: _SimulateResultRunLog = []

    @property
    def commands(self) -> _SimulateResultRunLog:
        """The list of commands scraped while `.scrape()` was open, integrated with log messages.

        See :py:obj:`simulate` for the return type.
        """
        return self._commands

    @contextmanager
    def scrape(self) -> Generator[None, None, None]:
        """While this context manager is open, scrape the broker for commands and integrate log
        messages with them. The accumulated commands will be accessible through `.commands`.
        """
        log_queue: "queue.Queue[object]" = queue.Queue()

        depth = 0

        def handle_command(message: command_types.CommandMessage) -> None:
            """The callback that we will subscribe to the broker."""
            nonlocal depth
            payload = message["payload"]
            if message["$"] == "before":
                self._commands.append({"level": depth, "payload": payload, "logs": []})
                depth += 1
            else:
                while not log_queue.empty():
                    self._commands[-1]["logs"].append(log_queue.get())
                depth = max(depth - 1, 0)

        if self._level != "none":
            # The simulation entry points probably leave logging unconfigured, so the level will be
            # Python's default. Set it to what the user asked to make sure we see the expected
            # records.
            #
            # TODO(mm, 2023-10-03): This is a bit too intrusive for something whose job is just to
            # "scrape." The entry point function should be responsible for setting the underlying
            # logger's level. Also, we should probably restore the original level when we're done.
            level = getattr(logging, self._level.upper(), logging.WARNING)
            self._logger.setLevel(level)

            log_handler: Optional[_AccumulatingHandler] = _AccumulatingHandler(
                self._level.upper(), log_queue
            )
        else:
            log_handler = None

        with ExitStack() as exit_stack:
            if log_handler is not None:
                self._logger.addHandler(log_handler)
                exit_stack.callback(self._logger.removeHandler, log_handler)

            unsubscribe_from_broker = self._broker.subscribe(
                command_types.COMMAND, handle_command
            )
            exit_stack.callback(unsubscribe_from_broker)

            yield


def get_protocol_api(
    version: Union[str, APIVersion],
    bundled_labware: Optional[Dict[str, "LabwareDefinitionDict"]] = None,
    bundled_data: Optional[Dict[str, bytes]] = None,
    extra_labware: Optional[Dict[str, "LabwareDefinitionDict"]] = None,
    hardware_simulator: Optional[ThreadManagedHardware] = None,
    # Additional arguments are kw-only to make mistakes harder in environments without
    # type checking, like Jupyter Notebook.
    *,
    robot_type: Optional[_UserSpecifiedRobotType] = None,
    use_virtual_hardware: bool = True,
) -> protocol_api.ProtocolContext:
    """
    Build and return a ``protocol_api.ProtocolContext`` that simulates robot control.

    This can be used to simulate protocols from interactive Python sessions
    such as Jupyter or an interpreter on the command line:

    .. code-block:: python

        >>> from opentrons.simulate import get_protocol_api
        >>> protocol = get_protocol_api('2.0')
        >>> instr = protocol.load_instrument('p300_single', 'right')
        >>> instr.home()

    :param version: The API version to use. This must be lower than
        ``opentrons.protocol_api.MAX_SUPPORTED_VERSION``.
        It may be specified either as a string (``'2.0'``) or
        as a ``protocols.types.APIVersion``
        (``APIVersion(2, 0)``).
    :param bundled_labware: If specified, a mapping from labware names to
        labware definitions for labware to consider in the
        protocol. Note that if you specify this, *only*
        labware in this argument will be allowed in the
        protocol. This is preparation for a beta feature
        and is best not used.
    :param bundled_data: If specified, a mapping from filenames to contents
        for data to be available in the protocol from
        :py:obj:`opentrons.protocol_api.ProtocolContext.bundled_data`.
    :param extra_labware: A mapping from labware load names to custom labware definitions.
        If this is ``None`` (the default), and this function is called on a robot,
        it will look for labware in the ``labware`` subdirectory of the Jupyter
        data directory.
    :param hardware_simulator: This is only for internal use by Opentrons. If specified,
        it's a hardware simulator instance to reuse instead of creating a fresh one.
    :param robot_type: The type of robot to simulate: either ``"Flex"`` or ``"OT-2"``.
        If you're running this function on a robot, the default is the type of that
        robot. Otherwise, the default is ``"OT-2"``, for backwards compatibility.
    :param use_virtual_hardware: This is only for internal use by Opentrons.
        If ``True``, use the Protocol Engine's virtual hardware. If ``False``, use the
        lower level hardware simulator.
    :return: The protocol context.
    """
    if isinstance(version, str):
        checked_version = parse.version_from_string(version)
    elif not isinstance(version, APIVersion):
        raise TypeError("version must be either a string or an APIVersion")
    else:
        checked_version = version

    current_robot_type = _get_current_robot_type()
    if robot_type is None:
        if current_robot_type is None:
            parsed_robot_type: RobotType = "OT-2 Standard"
        else:
            parsed_robot_type = current_robot_type
    else:
        # TODO(mm, 2023-10-09): This raises a slightly wrong error message, mentioning the camelCase
        # `robotType` field in Python files instead of the snake_case `robot_type` argument for this
        # function.
        parsed_robot_type = parse.robot_type_from_python_identifier(robot_type)
    _validate_can_simulate_for_robot_type(parsed_robot_type)
    deck_type = deck_type_for_simulation(parsed_robot_type)

    if extra_labware is None:
        extra_labware = {
            uri: details.definition
            for uri, details in (entrypoint_util.find_jupyter_labware() or {}).items()
        }

    checked_hardware = _make_hardware_simulator(
        override=hardware_simulator, robot_type=parsed_robot_type
    )

    if checked_version < ENGINE_CORE_API_VERSION:
        context = _create_live_context_non_pe(
            api_version=checked_version,
            deck_type=deck_type,
            hardware_api=checked_hardware,
            bundled_labware=bundled_labware,
            bundled_data=bundled_data,
            extra_labware=extra_labware,
        )
    else:
        if bundled_labware is not None:
            # Protocol Engine has a deep assumption that standard labware definitions are always
            # implicitly loadable.
            raise NotImplementedError(
                f"The bundled_labware argument is not currently supported for Python protocols"
                f" with apiLevel {ENGINE_CORE_API_VERSION} or newer."
            )
        context = _create_live_context_pe(
            api_version=checked_version,
            robot_type=parsed_robot_type,
            deck_type=deck_type,
            hardware_api=checked_hardware,
            bundled_data=bundled_data,
            extra_labware=extra_labware,
            use_pe_virtual_hardware=use_virtual_hardware,
        )

    # Intentional difference from execute.get_protocol_api():
    # For the caller's convenience, we home the virtual hardware so they don't get MustHomeErrors.
    # Since this hardware is virtual, there's no harm in commanding this "movement" implicitly.
    #
    # Calling `checked_hardware_sync.home()` is a hack. It ought to be redundant with
    # `context.home()`. We need it here to work around a Protocol Engine simulation bug
    # where both the `HardwareControlAPI` level and the `ProtocolEngine` level need to
    # be homed for certain commands to work. https://opentrons.atlassian.net/browse/EXEC-646
    checked_hardware.sync.home()
    context.home()

    return context


def _make_hardware_simulator(
    override: Optional[ThreadManagedHardware], robot_type: RobotType
) -> ThreadManagedHardware:
    if override:
        return override
    elif robot_type == "OT-3 Standard":
        # Local import because this isn't available on OT-2s.
        from opentrons.hardware_control.ot3api import OT3API

        return ThreadManager(
            OT3API.build_hardware_simulator,
            feature_flags=HardwareFeatureFlags.build_from_ff(),
        )
    elif robot_type == "OT-2 Standard":
        return ThreadManager(
            OT2API.build_hardware_simulator,
            feature_flags=HardwareFeatureFlags.build_from_ff(),
        )


@contextmanager
def _make_hardware_simulator_cm(
    config_file_path: Optional[pathlib.Path], robot_type: RobotType
) -> Generator[ThreadManagedHardware, None, None]:
    if config_file_path is not None:
        result = ThreadManager(
            load_simulator,
            pathlib.Path(config_file_path),
        )
        try:
            yield result
        finally:
            result.clean_up()
    else:
        result = _make_hardware_simulator(override=None, robot_type=robot_type)
        try:
            yield result
        finally:
            result.clean_up()


def _get_current_robot_type() -> Optional[RobotType]:
    """Return the type of robot that we're running on, or None if we're not on a robot."""
    if IS_ROBOT:
        return "OT-3 Standard" if should_use_ot3() else "OT-2 Standard"
    else:
        return None


def _validate_can_simulate_for_robot_type(robot_type: RobotType) -> None:
    """Raise if this device cannot simulate protocols written for the given robot type."""
    current_robot_type = _get_current_robot_type()
    if current_robot_type is None:
        # When installed locally, this package can simulate protocols for any robot type.
        pass
    elif robot_type != current_robot_type:
        # Match robot server behavior: raise an early error if we're on a robot and the caller
        # tries to simulate a protocol written for a different robot type.

        # FIXME: This exposes the internal strings "OT-2 Standard" and "OT-3 Standard".
        # https://opentrons.atlassian.net/browse/RSS-370
        raise RuntimeError(
            f'This robot is of type "{current_robot_type}",'
            f' so it can\'t simulate protocols for robot type "{robot_type}"'
        )


def bundle_from_sim(
    protocol: PythonProtocol, context: opentrons.protocol_api.ProtocolContext
) -> BundleContents:
    """
    From a protocol, and the context that has finished simulating that
    protocol, determine what needs to go in a bundle for the protocol.
    """
    bundled_labware: Dict[str, "LabwareDefinitionDict"] = {}
    for lw in context.loaded_labwares.values():
        if (
            isinstance(lw, opentrons.protocol_api.labware.Labware)
            and lw.uri not in bundled_labware
        ):
            bundled_labware[lw.uri] = lw._core.get_definition()

    return BundleContents(
        protocol.text,
        bundled_data=context.bundled_data,
        bundled_labware=bundled_labware,
        bundled_python={},
    )


def simulate(
    protocol_file: Union[BinaryIO, TextIO],
    file_name: Optional[str] = None,
    custom_labware_paths: Optional[List[str]] = None,
    custom_data_paths: Optional[List[str]] = None,
    propagate_logs: bool = False,
    hardware_simulator_file_path: Optional[str] = None,
    duration_estimator: Optional[DurationEstimator] = None,
    log_level: str = "warning",
) -> _SimulateResult:
    """
    Simulate the protocol itself.

    This is a one-stop function to simulate a protocol, whether Python or JSON,
    no matter the API version, from external (i.e. not bound up in other
    internal server infrastructure) sources.

    To simulate an opentrons protocol from other places, pass in a file-like
    object as ``protocol_file``; this function either returns (if the simulation
    has no problems) or raises an exception.

    To call from the command line, use either the autogenerated entrypoint
    ``opentrons_simulate`` (``opentrons_simulate.exe``, on windows) or
    ``python -m opentrons.simulate``.

    The return value is the run log, a list of dicts that represent the
    commands executed by the robot; and either the contents of the protocol
    that would be required to bundle, or ``None``.

    Each dict element in the run log has the following keys:

        - ``level``: The depth at which this command is nested. If this an
          aspirate inside a mix inside a transfer, for instance, it would be 3.

        - ``payload``: The command. The human-readable run log text is available at
          ``payload["text"]``. The other keys of ``payload`` are command-dependent;
          see ``opentrons.legacy_commands``.

          .. note::
            In older software versions, ``payload["text"]`` was a
            `format string <https://docs.python.org/3/library/string.html#formatstrings>`_.
            To get human-readable text, you had to do ``payload["text"].format(**payload)``.
            Don't do that anymore. If ``payload["text"]`` happens to contain any
            ``{`` or ``}`` characters, it can confuse ``.format()`` and cause it to raise a
            ``KeyError``.

        - ``logs``: Any log messages that occurred during execution of this
          command, as a standard Python :py:obj:`~logging.LogRecord`.

    :param protocol_file: The protocol file to simulate.
    :param file_name: The name of the file
    :param custom_labware_paths: A list of directories to search for custom labware.
        Loads valid labware from these paths and makes them available
        to the protocol context. If this is ``None`` (the default), and
        this function is called on a robot, it will look in the ``labware``
        subdirectory of the Jupyter data directory.
    :param custom_data_paths: A list of directories or files to load custom
        data files from. Ignored if the apiv2 feature
        flag if not set. Entries may be either files or
        directories. Specified files and the
        non-recursive contents of specified directories
        are presented by the protocol context in
        ``protocol_api.ProtocolContext.bundled_data``.
    :param hardware_simulator_file_path: A path to a JSON file defining the simulated
        hardware. This is mainly for internal use by Opentrons, and is not necessary
        to simulate protocols.
    :param duration_estimator: For internal use only.
        Optional duration estimator object.
    :param propagate_logs: Whether this function should allow logs from the
        Opentrons stack to propagate up to the root handler.
        This can be useful if you're integrating this
        function in a larger application, but most logs that
        occur during protocol simulation are best associated
        with the actions in the protocol that cause them.
        Default: ``False``
    :param log_level: The level of logs to capture in the run log:
        ``"debug"``, ``"info"``, ``"warning"``, or ``"error"``.
        Defaults to ``"warning"``.
    :returns: A tuple of a run log for user output, and possibly the required
        data to write to a bundle to bundle this protocol. The bundle is
        only emitted if bundling is allowed
        and this is an unbundled Protocol API
        v2 python protocol. In other cases it is None.
    """
    stack_logger = logging.getLogger("opentrons")
    stack_logger.propagate = propagate_logs
    # _CommandScraper will set the level of this logger.

    # TODO(mm, 2023-10-02): Switch this truthy check to `is not None`
    # to match documented behavior.
    # See notes in https://github.com/Opentrons/opentrons/pull/13107
    if custom_labware_paths:
        extra_labware = entrypoint_util.labware_from_paths(custom_labware_paths)
    else:
        extra_labware = entrypoint_util.find_jupyter_labware() or {}

    if custom_data_paths:
        extra_data = entrypoint_util.datafiles_from_paths(custom_data_paths)
    else:
        extra_data = {}

    contents = protocol_file.read()
    try:
        protocol = parse.parse(
            contents,
            file_name,
            extra_labware={
                uri: details.definition for uri, details in extra_labware.items()
            },
            extra_data=extra_data,
        )
    except parse.JSONSchemaVersionTooNewError as e:
        # opentrons.protocols.parse() doesn't support new JSON protocols.
        # The code to do that should be moved from opentrons.protocol_reader.
        # See https://opentrons.atlassian.net/browse/PLAT-94.
        raise NotImplementedError(_JSON_TOO_NEW_MESSAGE) from e

    if protocol.api_level < APIVersion(2, 0):
        raise ApiDeprecationError(version=protocol.api_level)

    _validate_can_simulate_for_robot_type(protocol.robot_type)

    with _make_hardware_simulator_cm(
        config_file_path=(
            None
            if hardware_simulator_file_path is None
            else pathlib.Path(hardware_simulator_file_path)
        ),
        robot_type=protocol.robot_type,
    ) as hardware_simulator:
        if protocol.api_level < ENGINE_CORE_API_VERSION:
            return _run_file_non_pe(
                protocol=protocol,
                hardware_api=hardware_simulator,
                logger=stack_logger,
                level=log_level,
                duration_estimator=duration_estimator,
            )
        else:
            # TODO(mm, 2023-07-06): Once these NotImplementedErrors are resolved, consider removing
            # the enclosing if-else block and running everything through _run_file_pe() for simplicity.
            if custom_data_paths:
                raise NotImplementedError(
                    f"The custom_data_paths argument is not currently supported for Python protocols"
                    f" with apiLevel {ENGINE_CORE_API_VERSION} or newer."
                )
            protocol_file.seek(0)
            return _run_file_pe(
                protocol=protocol,
                robot_type=protocol.robot_type,
                hardware_api=hardware_simulator,
                stack_logger=stack_logger,
                log_level=log_level,
            )


def format_runlog(runlog: List[Mapping[str, Any]]) -> str:
    """
    Format a run log (return value of :py:obj:`simulate`) into a
    human-readable string

    :param runlog: The output of a call to :py:obj:`simulate`
    """
    to_ret = []
    for command in runlog:
        to_ret.append("\t" * command["level"] + command["payload"].get("text", ""))
        if command["logs"]:
            to_ret.append("\t" * command["level"] + "Logs from this command:")
            to_ret.extend(
                [
                    "\t" * command["level"]
                    + f"{l.levelname} ({l.module}): {l.msg}" % l.args
                    for l in command["logs"]  # noqa: E741
                ]
            )
    return "\n".join(to_ret)


def _get_bundle_args(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument(
        "-b",
        "--bundle",
        nargs="?",
        const="PROTOCOL.ot2.zip",
        default=None,
        action="store",
        type=str,
        help="Bundle the specified protocol file, any labware used in it, and "
        "any files in the data directories specified with -D into a "
        "bundle. This bundle can be executed on a robot and carries with "
        "it all the custom labware and data required to run. Without a "
        "value specified in this argument, the bundle will be called "
        "(protocol name without the .py).ot2.zip, but you can specify "
        "a different output name. \n"
        "These bundles are a beta feature, and their behavior may change",
    )
    return parser


def allow_bundle() -> bool:
    """
    Check if bundling is allowed with a special not-exposed-to-the-app flag.

    Returns ``True`` if the environment variable
    ``OT_API_FF_allowBundleCreation`` is ``"1"``
    """
    return os.getenv("OT_API_FF_allowBundleCreation") == "1"


def get_arguments(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    """Get the argument parser for this module

    Useful if you want to use this module as a component of another CLI program
    and want to add its arguments.

    :param parser: A parser to add arguments to. If not specified, one will be created.
    :returns argparse.ArgumentParser: The parser with arguments added.
    """
    parser.add_argument(
        "-l",
        "--log-level",
        choices=["debug", "info", "warning", "error", "none"],
        default="warning",
        help="Specify the level filter for logs to show on the command line. "
        'Log levels below warning can be chatty. If "none", do not show logs',
    )

    parser.add_argument(
        "-L",
        "--custom-labware-path",
        action="append",
        default=[os.getcwd()],
        help="Specify directories to search for custom labware definitions. "
        "You can specify this argument multiple times. Once you specify "
        "a directory in this way, labware definitions in that directory "
        "will become available in ProtocolContext.load_labware(). "
        "Only directories specified directly by "
        "this argument are searched, not their children. JSON files that "
        "do not define labware will be ignored with a message. "
        "The current directory (the one from which you are "
        "invoking this program) will always be included implicitly, "
        "in addition to any directories that you specify.",
    )
    parser.add_argument(
        "-D",
        "--custom-data-path",
        action="append",
        nargs="?",
        const=".",
        default=[],
        help="Specify directories to search for custom data files. "
        "You can specify this argument multiple times. Once you specify "
        "a directory in this way, files located in the specified "
        "directory will be available in ProtocolContext.bundled_data. "
        "Note that bundle execution will still only allow data files in "
        "the bundle. If you specify this without a path, it will "
        "add the current path implicitly. If you do not specify this "
        "argument at all, no data files will be added. Any file in the "
        "specified paths will be loaded into memory and included in the "
        "bundle if --bundle is passed, so be careful that any directory "
        "you specify has only the files you want. It is usually a "
        "better idea to use -d so no files are accidentally included. "
        "Also note that data files are made available as their name, not "
        "their full path, so name them uniquely.",
    )
    parser.add_argument(
        "-s",
        "--custom-hardware-simulator-file",
        type=str,
        default=None,
        help="Specify a file that describes the features present in the "
        "hardware simulator. Features can be instruments, modules, and "
        "configuration.",
    )
    parser.add_argument(
        "-d",
        "--custom-data-file",
        action="append",
        default=[],
        help="Specify data files to be made available in "
        "ProtocolContext.bundled_data (and possibly bundled if --bundle "
        "is passed). Can be specified multiple times with different "
        "files. It is usually a better idea to use this than -D because "
        "there is less possibility of accidentally including something.",
    )
    if allow_bundle():
        parser = _get_bundle_args(parser)

    parser.add_argument(
        "-e",
        "--estimate-duration",
        action="store_true",
        # TODO (AL, 2021-07-26): Better wording.
        help="Estimate how long the protocol will take to complete."
        " This is an experimental feature.",
    )

    parser.add_argument(
        "protocol",
        metavar="PROTOCOL",
        type=argparse.FileType("rb"),
        help="The protocol file to simulate. If you pass '-', you can pipe "
        "the protocol via stdin; this could be useful if you want to use this "
        "utility as part of an automated workflow.",
    )
    parser.add_argument(
        "-v",
        "--version",
        action="version",
        version=f"%(prog)s {opentrons.__version__}",
        help="Print the opentrons package version and exit",
    )
    parser.add_argument(
        "-o",
        "--output",
        action="store",
        help="What to output during simulations",
        choices=["runlog", "nothing"],
        default="runlog",
    )
    return parser


def _get_bundle_dest(
    bundle_name: Optional[str], default_key: str, proto_name: str
) -> Optional[BinaryIO]:
    if bundle_name == default_key:
        protopath = pathlib.Path(proto_name)
        # strip all the suffixes since protocols are often named
        # .ot2.zip
        if protopath.name.endswith(".ot2.py"):
            protoname = pathlib.Path(protopath.stem).stem
        else:
            protoname = protopath.stem
        bundle_name = str((pathlib.Path.cwd() / protoname).with_suffix(".ot2.zip"))
        return open(bundle_name, "wb")
    elif bundle_name:
        return open(bundle_name, "wb")
    else:
        return None


def _create_live_context_non_pe(
    api_version: APIVersion,
    hardware_api: ThreadManagedHardware,
    deck_type: str,
    extra_labware: Optional[Dict[str, "LabwareDefinitionDict"]],
    bundled_labware: Optional[Dict[str, "LabwareDefinitionDict"]],
    bundled_data: Optional[Dict[str, bytes]],
) -> ProtocolContext:
    """Return a live ProtocolContext.

    This controls the robot through the older infrastructure, instead of through Protocol Engine.
    """
    assert api_version < ENGINE_CORE_API_VERSION
    return protocol_api.create_protocol_context(
        api_version=api_version,
        deck_type=deck_type,
        hardware_api=hardware_api,
        bundled_labware=bundled_labware,
        bundled_data=bundled_data,
        extra_labware=extra_labware,
    )


def _create_live_context_pe(
    api_version: APIVersion,
    hardware_api: ThreadManagedHardware,
    robot_type: RobotType,
    deck_type: str,
    extra_labware: Dict[str, "LabwareDefinitionDict"],
    bundled_data: Optional[Dict[str, bytes]],
    use_pe_virtual_hardware: bool = True,
) -> ProtocolContext:
    """Return a live ProtocolContext that controls the robot through ProtocolEngine."""
    assert api_version >= ENGINE_CORE_API_VERSION
    hardware_api_wrapped = hardware_api.wrapped()
    global _LIVE_PROTOCOL_ENGINE_CONTEXTS
    pe, loop = _LIVE_PROTOCOL_ENGINE_CONTEXTS.enter_context(
        create_protocol_engine_in_thread(
            hardware_api=hardware_api_wrapped,
            config=_get_protocol_engine_config(
                robot_type, use_pe_virtual_hardware=use_pe_virtual_hardware
            ),
            deck_configuration=None,
            file_provider=None,
            error_recovery_policy=error_recovery_policy.never_recover,
            drop_tips_after_run=False,
            post_run_hardware_state=PostRunHardwareState.STAY_ENGAGED_IN_PLACE,
            load_fixed_trash=should_load_fixed_trash_labware_for_python_protocol(
                api_version
            ),
        )
    )

    # `async def` so we can use loop.run_coroutine_threadsafe() to wait for its completion.
    # Non-async would use call_soon_threadsafe(), which makes the waiting harder.
    async def add_all_extra_labware() -> None:
        for labware_definition_dict in extra_labware.values():
            labware_definition = LabwareDefinition.model_validate(
                labware_definition_dict
            )
            pe.add_labware_definition(labware_definition)

    # Add extra_labware to ProtocolEngine, being careful not to modify ProtocolEngine from this
    # thread. See concurrency notes in ProtocolEngine docstring.
    future = asyncio.run_coroutine_threadsafe(add_all_extra_labware(), loop)
    future.result()

    return protocol_api.create_protocol_context(
        api_version=api_version,
        hardware_api=hardware_api,
        deck_type=deck_type,
        protocol_engine=pe,
        protocol_engine_loop=loop,
        bundled_data=bundled_data,
    )


def _run_file_non_pe(
    protocol: Protocol,
    hardware_api: ThreadManagedHardware,
    logger: logging.Logger,
    level: str,
    duration_estimator: Optional[DurationEstimator],
) -> _SimulateResult:
    """Run a protocol file without Protocol Engine, with the older infrastructure instead."""
    if isinstance(protocol, PythonProtocol):
        extra_labware = protocol.extra_labware
        bundled_labware = protocol.bundled_labware
        bundled_data = protocol.bundled_data
    else:
        # JSON protocols do have "bundled labware" embedded in them, but those aren't represented in
        # the parsed Protocol object and we don't need to create the ProtocolContext with them.
        # execute_apiv2.run_protocol() will pull them out of the JSON and load them into the
        # ProtocolContext.
        extra_labware = None
        bundled_labware = None
        bundled_data = None

    context = _create_live_context_non_pe(
        api_version=protocol.api_level,
        hardware_api=hardware_api,
        deck_type=deck_type_for_simulation(protocol.robot_type),
        extra_labware=extra_labware,
        bundled_labware=bundled_labware,
        bundled_data=bundled_data,
    )

    scraper = _CommandScraper(logger=logger, level=level, broker=context.broker)
    if duration_estimator:
        context.broker.subscribe(command_types.COMMAND, duration_estimator.on_message)

    context.home()
    with scraper.scrape():
        try:
            execute.run_protocol(
                protocol, context, run_time_parameters_with_overrides=None
            )
            if (
                isinstance(protocol, PythonProtocol)
                and protocol.api_level >= APIVersion(2, 0)
                and protocol.bundled_labware is None
                and allow_bundle()
            ):
                bundle_contents: Optional[BundleContents] = bundle_from_sim(
                    protocol, context
                )
            else:
                bundle_contents = None

        finally:
            context.cleanup()

    return scraper.commands, bundle_contents


def _run_file_pe(
    protocol: Protocol,
    robot_type: RobotType,
    hardware_api: ThreadManagedHardware,
    stack_logger: logging.Logger,
    log_level: str,
) -> _SimulateResult:
    """Run a protocol file with Protocol Engine."""
    # TODO (spp, 2024-03-18): use run-time param overrides once enabled for cli protocol simulation.

    async def run(protocol_source: ProtocolSource) -> _SimulateResult:
        hardware_api_wrapped = hardware_api.wrapped()
        protocol_engine = await create_protocol_engine(
            hardware_api=hardware_api_wrapped,
            config=_get_protocol_engine_config(
                robot_type, use_pe_virtual_hardware=True
            ),
            error_recovery_policy=error_recovery_policy.never_recover,
            load_fixed_trash=should_load_fixed_trash(protocol_source.config),
        )

        protocol_runner = create_protocol_runner(
            protocol_config=protocol_source.config,
            protocol_engine=protocol_engine,
            hardware_api=hardware_api_wrapped,
        )

        orchestrator = RunOrchestrator(
            hardware_api=hardware_api_wrapped,
            protocol_engine=protocol_engine,
            json_or_python_protocol_runner=protocol_runner,
            fixit_runner=LiveRunner(
                protocol_engine=protocol_engine, hardware_api=hardware_api_wrapped
            ),
            setup_runner=LiveRunner(
                protocol_engine=protocol_engine, hardware_api=hardware_api_wrapped
            ),
            protocol_live_runner=LiveRunner(
                protocol_engine=protocol_engine, hardware_api=hardware_api_wrapped
            ),
        )

        # TODO(mm, 2024-08-06): This home is theoretically redundant with Protocol
        # Engine `home` commands within the `RunOrchestrator`. However, we need this to
        # work around Protocol Engine bugs where both the `HardwareControlAPI` level
        # and the `ProtocolEngine` level need to be homed for certain commands to work.
        # https://opentrons.atlassian.net/browse/EXEC-646
        await hardware_api_wrapped.home()

        scraper = _CommandScraper(stack_logger, log_level, protocol_runner.broker)
        with scraper.scrape():
            result = await orchestrator.run(
                # deck_configuration=[] is a placeholder value, ignored because
                # the Protocol Engine config specifies use_simulated_deck_config=True.
                deck_configuration=[],
                protocol_source=protocol_source,
            )

        if result.state_summary.status != EngineStatus.SUCCEEDED:
            raise entrypoint_util.ProtocolEngineExecuteError(
                result.state_summary.errors
            )

        # We don't currently support returning bundle contents from protocols run through
        # Protocol Engine. To get them, bundle_from_sim() requires direct access to the
        # ProtocolContext, which opentrons.protocol_runner does not grant us.
        bundle_contents = None

        return scraper.commands, bundle_contents

    with entrypoint_util.adapt_protocol_source(protocol) as protocol_source:
        return asyncio.run(run(protocol_source))


def _get_protocol_engine_config(
    robot_type: RobotType, use_pe_virtual_hardware: bool
) -> Config:
    """Return a Protocol Engine config to execute protocols on this device."""
    return Config(
        robot_type=robot_type,
        deck_type=DeckType(deck_type_for_simulation(robot_type)),
        ignore_pause=True,
        use_virtual_pipettes=use_pe_virtual_hardware,
        use_virtual_modules=use_pe_virtual_hardware,
        use_virtual_gripper=use_pe_virtual_hardware,
        use_simulated_deck_config=True,
    )


@atexit.register
def _clear_live_protocol_engine_contexts() -> None:
    global _LIVE_PROTOCOL_ENGINE_CONTEXTS
    _LIVE_PROTOCOL_ENGINE_CONTEXTS.close()


# Note - this script is also set up as a setuptools entrypoint and thus does
# an absolute minimum of work since setuptools does something odd generating
# the scripts
def main() -> int:
    """Run the simulation"""
    parser = argparse.ArgumentParser(
        prog="opentrons_simulate",
        description="Simulate a protocol for an Opentrons robot",
    )
    parser = get_arguments(parser)

    args = parser.parse_args()

    # TODO(mm, 2022-12-01): Configure the DurationEstimator with the correct deck type.
    duration_estimator = DurationEstimator() if args.estimate_duration else None

    try:
        runlog, maybe_bundle = simulate(
            protocol_file=args.protocol,
            file_name=args.protocol.name,
            custom_labware_paths=args.custom_labware_path,
            custom_data_paths=(args.custom_data_path + args.custom_data_file),
            duration_estimator=duration_estimator,
            hardware_simulator_file_path=getattr(
                args, "custom_hardware_simulator_file"
            ),
            log_level=args.log_level,
        )
    except entrypoint_util.ProtocolEngineExecuteError as error:
        print(error.to_stderr_string(), file=sys.stderr)
        return 1

    if maybe_bundle:
        bundle_name = getattr(args, "bundle", None)
        if bundle_name == args.protocol.name:
            raise RuntimeError("Bundle path and input path must be different")
        bundle_dest = _get_bundle_dest(
            bundle_name, "PROTOCOL.ot2.zip", args.protocol.name
        )
        if bundle_dest:
            bundle.create_bundle(maybe_bundle, bundle_dest)

    if args.output == "runlog":
        print(format_runlog(runlog))

    if duration_estimator:
        duration_seconds = duration_estimator.get_total_duration()
        hours = int(duration_seconds / 60 / 60)
        minutes = int((duration_seconds % (60 * 60)) / 60)
        print("--------------------------------------------------------------")
        print(f"Estimated protocol duration: {hours}h:{minutes}m")
        print("--------------------------------------------------------------")
        print("WARNING: Protocol duration estimation is an experimental feature")

    return 0


if __name__ == "__main__":
    sys.exit(main())
