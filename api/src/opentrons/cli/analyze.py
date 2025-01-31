"""Opentrons analyze CLI."""
import click

from anyio import run
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from pydantic import BaseModel
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Sequence,
    Union,
    Literal,
    Callable,
    IO,
    TypeVar,
    Iterator,
)
import logging
import sys
import json

from opentrons.protocol_engine.types import (
    RunTimeParameter,
    CSVRuntimeParamPaths,
    PrimitiveRunTimeParamValuesType,
    EngineStatus,
)
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_reader import (
    ProtocolReader,
    ProtocolFileRole,
    ProtocolType,
    JsonProtocolConfig,
    ProtocolFilesInvalidError,
    ProtocolSource,
)
from opentrons.protocol_runner.create_simulating_orchestrator import (
    create_simulating_orchestrator,
)
from opentrons.protocol_runner import RunResult
from opentrons.protocol_runner.run_orchestrator import ParseMode

from opentrons.protocol_engine import (
    Command,
    ErrorOccurrence,
    LoadedLabware,
    LoadedPipette,
    LoadedModule,
    Liquid,
    LiquidClassRecordWithId,
    StateSummary,
)
from opentrons.protocol_engine.protocol_engine import code_in_error_tree
from opentrons.protocol_engine.types import CommandAnnotation

from opentrons_shared_data.robot.types import RobotType

from opentrons_shared_data.errors import ErrorCodes
from opentrons_shared_data.errors.exceptions import (
    EnumeratedError,
    PythonException,
)


OutputKind = Literal["json", "human-json"]


@dataclass(frozen=True)
class _Output:
    to_file: IO[bytes]
    kind: OutputKind


@click.command()
@click.argument(
    "files",
    nargs=-1,
    required=True,
    type=click.Path(exists=True, path_type=Path, file_okay=True, dir_okay=True),
)
@click.option(
    "--json-output",
    help="Return analysis results as machine-readable JSON. Specify --json-output=- to use stdout, but be aware that Python protocols may contain print() which will make the output JSON invalid.",
    type=click.File(mode="wb"),
)
@click.option(
    "--human-json-output",
    help="Return analysis results as JSON, formatted for human eyes. Specify --human-json-output=- to use stdout, but be aware that Python protocols may contain print() which will make the output JSON invalid.",
    type=click.File(mode="wb"),
)
@click.option(
    "--check",
    help="Fail (via exit code) if the protocol had an error. If not specified, always succeed.",
    is_flag=True,
    default=False,
)
@click.option(
    "--log-output",
    help="Where to send logs. Can be a path, - for stdout, or stderr for stderr.",
    default="stderr",
    type=str,
)
@click.option(
    "--log-level",
    help="Level of logs to capture.",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"], case_sensitive=False),
    default="WARNING",
)
@click.option(
    "--rtp-values",
    help="Serialized JSON of runtime parameter variable names to values.",
    default="{}",
    type=str,
)
@click.option(
    "--rtp-files",
    help="Serialized JSON of runtime parameter variable names to file paths.",
    default="{}",
    type=str,
)
def analyze(
    files: Sequence[Path],
    rtp_values: str,
    rtp_files: str,
    json_output: Optional[IO[bytes]],
    human_json_output: Optional[IO[bytes]],
    log_output: str,
    log_level: str,
    check: bool,
) -> int:
    """Analyze a protocol.

    You can use `opentrons analyze` to get a protocol's expected
    equipment and commands.
    """
    outputs = _get_outputs(json=json_output, human_json=human_json_output)
    if not outputs and not check:
        raise click.UsageError(
            message="Please specify at least --check or one of the output options."
        )

    try:
        with _capture_logs(log_output, log_level):
            sys.exit(run(_analyze, files, rtp_values, rtp_files, outputs, check))
    except click.ClickException:
        raise
    except Exception as e:
        raise click.ClickException(str(e))


@contextmanager
def _capture_logs_to_stream(stream: IO[str]) -> Iterator[None]:
    handler = logging.StreamHandler(stream)
    logging.getLogger().addHandler(handler)
    try:
        yield
    finally:
        logging.getLogger().removeHandler(handler)


@contextmanager
def _capture_logs_to_file(filepath: Path) -> Iterator[None]:
    handler = logging.FileHandler(filepath, mode="w")
    logging.getLogger().addHandler(handler)
    try:
        yield
    finally:
        logging.getLogger().removeHandler(handler)


@contextmanager
def _capture_logs(write_to: str, log_level: str) -> Iterator[None]:
    try:
        level = getattr(logging, log_level)
    except AttributeError:
        raise click.ClickException(f"No such log level {log_level}")
    logging.getLogger().setLevel(level)
    if write_to in ("-", "stdout"):
        with _capture_logs_to_stream(sys.stdout):
            yield
    elif write_to == "stderr":
        with _capture_logs_to_stream(sys.stderr):
            yield
    else:
        with _capture_logs_to_file(Path(write_to)):
            yield


def _get_outputs(
    json: Optional[IO[bytes]],
    human_json: Optional[IO[bytes]],
) -> List[_Output]:
    outputs: List[_Output] = []
    if json:
        outputs.append(_Output(to_file=json, kind="json"))
    if human_json:
        outputs.append(_Output(to_file=human_json, kind="human-json"))
    return outputs


def _get_input_files(files_and_dirs: Sequence[Path]) -> List[Path]:
    results: List[Path] = []

    for entry in files_and_dirs:
        if entry.is_dir():
            results.extend(entry.glob("**/*"))
        else:
            results.append(entry)

    return results


def _get_runtime_parameter_values(
    serialized_rtp_values: str,
) -> PrimitiveRunTimeParamValuesType:
    rtp_values = {}
    try:
        for variable_name, value in json.loads(serialized_rtp_values).items():
            if not isinstance(value, (bool, int, float, str)):
                raise click.BadParameter(
                    f"Runtime parameter '{value}' is not of allowed type boolean, integer, float or string",
                    param_hint="--rtp-values",
                )
            rtp_values[variable_name] = value
    except json.JSONDecodeError as error:
        raise click.BadParameter(
            f"JSON decode error: {error}", param_hint="--rtp-values"
        )
    return rtp_values


def _get_runtime_parameter_paths(serialized_rtp_files: str) -> CSVRuntimeParamPaths:
    try:
        return {
            variable_name: Path(path_string)
            for variable_name, path_string in json.loads(serialized_rtp_files).items()
        }
    except json.JSONDecodeError as error:
        raise click.BadParameter(
            f"JSON decode error: {error}", param_hint="--rtp-files"
        )


R = TypeVar("R")


def _call_for_output_of_kind(
    kind: OutputKind, outputs: Sequence[_Output], fn: Callable[[IO[bytes]], R]
) -> Optional[R]:
    for output in outputs:
        if output.kind == kind:
            return fn(output.to_file)
    return None


def _get_return_code(analysis: RunResult) -> int:
    if analysis.state_summary.errors:
        return -1
    return 0


class UnexpectedAnalysisError(EnumeratedError):
    """An error raised while setting up the runner for analysis."""

    def __init__(
        self,
        message: Optional[str] = None,
        wrapping: Optional[Sequence[Union[EnumeratedError, Exception]]] = None,
    ) -> None:
        """Build a UnexpectedAnalysisError exception."""

        def _convert_exc() -> Iterator[EnumeratedError]:
            if not wrapping:
                return
            for exc in wrapping:
                if isinstance(exc, EnumeratedError):
                    yield exc
                else:
                    yield PythonException(exc)

        super().__init__(
            code=ErrorCodes.GENERAL_ERROR,
            message=message,
            wrapping=[e for e in _convert_exc()],
        )


async def _do_analyze(
    protocol_source: ProtocolSource,
    rtp_values: PrimitiveRunTimeParamValuesType,
    rtp_paths: CSVRuntimeParamPaths,
) -> RunResult:

    orchestrator = await create_simulating_orchestrator(
        robot_type=protocol_source.robot_type, protocol_config=protocol_source.config
    )
    try:
        await orchestrator.load(
            protocol_source=protocol_source,
            parse_mode=ParseMode.NORMAL,
            run_time_param_values=rtp_values,
            run_time_param_paths=rtp_paths,
        )
    except Exception as error:
        err_id = "analysis-setup-error"
        err_created_at = datetime.now(tz=timezone.utc)
        if isinstance(error, EnumeratedError):
            error_occ = ErrorOccurrence.from_failed(
                id=err_id, createdAt=err_created_at, error=error
            )
        else:
            enumerated_wrapper = UnexpectedAnalysisError(
                message=str(error),
                wrapping=[error],
            )
            error_occ = ErrorOccurrence.from_failed(
                id=err_id, createdAt=err_created_at, error=enumerated_wrapper
            )
        analysis = RunResult(
            commands=[],
            state_summary=StateSummary(
                errors=[error_occ],
                status=EngineStatus.IDLE,
                labware=[],
                pipettes=[],
                modules=[],
                labwareOffsets=[],
                liquids=[],
                wells=[],
                hasEverEnteredErrorRecovery=False,
                files=[],
                liquidClasses=[],
            ),
            parameters=[],
            command_annotations=[],
        )
        return analysis
    return await orchestrator.run(deck_configuration=[])


async def _analyze(
    files_and_dirs: Sequence[Path],
    rtp_values: str,
    rtp_files: str,
    outputs: Sequence[_Output],
    check: bool,
) -> int:
    input_files = _get_input_files(files_and_dirs)
    parsed_rtp_values = _get_runtime_parameter_values(rtp_values)
    rtp_paths = _get_runtime_parameter_paths(rtp_files)

    try:
        protocol_source = await ProtocolReader().read_saved(
            files=input_files,
            directory=None,
        )
    except ProtocolFilesInvalidError as error:
        raise click.ClickException(str(error))

    analysis = await _do_analyze(protocol_source, parsed_rtp_values, rtp_paths)
    return_code = _get_return_code(analysis)

    if not outputs:
        return return_code

    if len(analysis.state_summary.errors) > 0:
        if any(
            code_in_error_tree(
                root_error=error, code=ErrorCodes.RUNTIME_PARAMETER_VALUE_REQUIRED
            )
            for error in analysis.state_summary.errors
        ):
            result = AnalysisResult.PARAMETER_VALUE_REQUIRED
        else:
            result = AnalysisResult.NOT_OK
    else:
        result = AnalysisResult.OK

    results = AnalyzeResults.model_construct(
        createdAt=datetime.now(tz=timezone.utc),
        files=[
            ProtocolFile.model_construct(name=f.path.name, role=f.role)
            for f in protocol_source.files
        ],
        config=(
            JsonConfig.model_construct(
                schemaVersion=protocol_source.config.schema_version
            )
            if isinstance(protocol_source.config, JsonProtocolConfig)
            else PythonConfig.model_construct(
                apiVersion=protocol_source.config.api_version
            )
        ),
        result=result,
        metadata=protocol_source.metadata,
        robotType=protocol_source.robot_type,
        runTimeParameters=analysis.parameters,
        commands=analysis.commands,
        errors=analysis.state_summary.errors,
        labware=analysis.state_summary.labware,
        pipettes=analysis.state_summary.pipettes,
        modules=analysis.state_summary.modules,
        liquids=analysis.state_summary.liquids,
        commandAnnotations=analysis.command_annotations,
        liquidClasses=analysis.state_summary.liquidClasses,
    )

    _call_for_output_of_kind(
        "json",
        outputs,
        lambda to_file: to_file.write(
            results.model_dump_json(exclude_none=True).encode("utf-8"),
        ),
    )
    _call_for_output_of_kind(
        "human-json",
        outputs,
        lambda to_file: to_file.write(
            results.model_dump_json(exclude_none=True, indent=2).encode("utf-8")
        ),
    )
    if check:
        return return_code
    else:
        return 0


class ProtocolFile(BaseModel):
    """A file in a protocol analysis."""

    name: str
    role: ProtocolFileRole


class JsonConfig(BaseModel):
    """Configuration of a JSON protocol."""

    protocolType: Literal[ProtocolType.JSON] = ProtocolType.JSON
    schemaVersion: int


class PythonConfig(BaseModel):
    """Configuration of a Python protocol."""

    protocolType: Literal[ProtocolType.PYTHON] = ProtocolType.PYTHON
    apiVersion: APIVersion


class AnalysisResult(str, Enum):
    """Result of a completed protocol analysis.

    The result indicates whether the protocol is expected to run successfully.

    Properties:
        OK: No problems were found during protocol analysis.
        NOT_OK: Problems were found during protocol analysis. Inspect
            `analysis.errors` for error occurrences.
        PARAMETER_VALUE_REQUIRED: A value is required to be set for a parameter
            in order for the protocol to be analyzed/run. The absence of this does not
            inherently mean there are no parameters, as there may be defaults for all
            or unset parameters are not referenced or handled via try/except clauses.
    """

    OK = "ok"
    NOT_OK = "not-ok"
    PARAMETER_VALUE_REQUIRED = "parameter-value-required"


class AnalyzeResults(BaseModel):
    """Results of a protocol analysis.

    See robot-server's analysis models for field documentation.
    """

    # We want to unify this local analysis model with the one that robot-server returns.
    # Until that happens, we need to keep these fields in sync manually.

    # Fields that are currently unique to this local analysis module, missing from robot-server:
    createdAt: datetime
    files: List[ProtocolFile]
    config: Union[JsonConfig, PythonConfig]
    metadata: Dict[str, Any]

    # Fields that should match robot-server:
    result: AnalysisResult
    robotType: RobotType
    runTimeParameters: List[RunTimeParameter]
    commands: List[Command]
    labware: List[LoadedLabware]
    pipettes: List[LoadedPipette]
    modules: List[LoadedModule]
    liquids: List[Liquid]
    liquidClasses: List[LiquidClassRecordWithId]
    errors: List[ErrorOccurrence]
    commandAnnotations: List[CommandAnnotation]
