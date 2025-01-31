"""Wrappers for Protocol API v2 execution pipeline."""
import asyncio
from typing import Dict, Iterable, Optional, cast

from anyio import to_thread

from opentrons_shared_data.labware.types import (
    LabwareDefinition as LabwareDefinitionTypedDict,
)
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.calibration_storage.helpers import uri_from_details
from opentrons.hardware_control import HardwareControlAPI
from opentrons.legacy_broker import LegacyBroker
from opentrons.protocol_engine import ProtocolEngine
from opentrons.protocol_engine.types import (
    PrimitiveRunTimeParamValuesType,
    CSVRuntimeParamPaths,
)
from opentrons.protocol_reader import ProtocolSource, ProtocolFileRole
from opentrons.util.broker import Broker

from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    create_protocol_context,
    Parameters,
)
from opentrons.protocol_api.core.engine import ENGINE_CORE_API_VERSION
from opentrons.protocol_api.core.legacy.load_info import LoadInfo

from opentrons.protocols.parse import PythonParseMode, parse
from opentrons.protocols.execution.execute import run_protocol
from opentrons.protocols.execution.execute_python import exec_add_parameters
from opentrons.protocols.types import Protocol, PythonProtocol


# The earliest Python Protocol API version ("apiLevel") where the protocol's simulation
# and execution will be handled by Protocol Engine, rather than the previous direct hardware calls from protocol api.
#
# Note that even when simulation and execution are handled by the legacy machinery,
# Protocol Engine still has some involvement for analyzing the simulation and
# monitoring the execution.
LEGACY_PYTHON_API_VERSION_CUTOFF = ENGINE_CORE_API_VERSION


# The earliest JSON protocol schema version where the protocol is executed directly by
# Protocol Engine, rather than going through Python Protocol API v2.
LEGACY_JSON_SCHEMA_VERSION_CUTOFF = 6


class PythonAndLegacyFileReader:
    """Interface to read Protocol API v2 protocols prior to execution."""

    @staticmethod
    def read(
        protocol_source: ProtocolSource,
        labware_definitions: Iterable[LabwareDefinition],
        python_parse_mode: PythonParseMode,
    ) -> Protocol:
        """Read a PAPIv2 protocol into a data structure."""
        protocol_file_path = protocol_source.main_file
        protocol_contents = protocol_file_path.read_text(encoding="utf-8")
        extra_labware: Dict[str, LabwareDefinitionTypedDict] = {
            uri_from_details(
                namespace=lw.namespace,
                load_name=lw.parameters.loadName,
                version=lw.version,
            ): cast(LabwareDefinitionTypedDict, lw.model_dump(exclude_none=True))
            for lw in labware_definitions
        }
        data_file_paths = [
            data_file.path
            for data_file in protocol_source.files
            if data_file.role == ProtocolFileRole.DATA
        ]

        return parse(
            protocol_file=protocol_contents,
            filename=protocol_file_path.name,
            extra_labware=extra_labware,
            extra_data={
                data_path.name: data_path.read_bytes() for data_path in data_file_paths
            },
            python_parse_mode=python_parse_mode,
        )


class ProtocolContextCreator:
    """Interface to construct Protocol API v2 contexts."""

    _USE_SIMULATING_CORE = False

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        protocol_engine: ProtocolEngine,
    ) -> None:
        """Prepare the LegacyContextCreator.

        Args:
            hardware_api: The hardware control interface.
                Will be wrapped in a `SynchronousAdapter`.
                May be real hardware or a simulator.
            protocol_engine: Interface for the context to load labware offsets.
        """
        self._hardware_api = hardware_api
        self._protocol_engine = protocol_engine

    def create(
        self,
        protocol: Protocol,
        broker: Optional[LegacyBroker],
        equipment_broker: Optional[Broker[LoadInfo]],
    ) -> ProtocolContext:
        """Create a Protocol API v2 context."""
        extra_labware = (
            protocol.extra_labware if isinstance(protocol, PythonProtocol) else None
        )

        bundled_data = (
            protocol.bundled_data if isinstance(protocol, PythonProtocol) else None
        )

        return create_protocol_context(
            api_version=protocol.api_level,
            hardware_api=self._hardware_api,
            deck_type=self._protocol_engine.state_view.config.deck_type.value,
            protocol_engine=self._protocol_engine,
            protocol_engine_loop=asyncio.get_running_loop(),
            broker=broker,
            equipment_broker=equipment_broker,
            extra_labware=extra_labware,
            use_simulating_core=self._USE_SIMULATING_CORE,
            bundled_data=bundled_data,
        )


class SimulatingContextCreator(ProtocolContextCreator):
    """Interface to construct PAPIv2 contexts using simulating implementations.

    Avoids some calls to the hardware API for performance.
    See `opentrons.protocols.context.simulator`.
    """

    _USE_SIMULATING_CORE = True


class PythonProtocolExecutor:
    """Interface to execute Protocol API v2 protocols in a child thread."""

    @staticmethod
    async def execute(
        protocol: Protocol,
        context: ProtocolContext,
        run_time_parameters_with_overrides: Optional[Parameters],
    ) -> None:
        """Execute a PAPIv2 protocol with a given ProtocolContext in a child thread."""
        await to_thread.run_sync(
            run_protocol,
            protocol,
            context,
            run_time_parameters_with_overrides,
        )

    @staticmethod
    def extract_run_parameters(
        protocol: PythonProtocol,
        parameter_context: ParameterContext,
        run_time_param_overrides: Optional[PrimitiveRunTimeParamValuesType],
        run_time_param_file_overrides: Optional[CSVRuntimeParamPaths],
    ) -> Optional[Parameters]:
        """Extract the parameters defined in the protocol, overridden with values for the run."""
        return exec_add_parameters(
            protocol=protocol,
            parameter_context=parameter_context,
            run_time_param_overrides=run_time_param_overrides,
            run_time_param_file_overrides=run_time_param_file_overrides,
        )
