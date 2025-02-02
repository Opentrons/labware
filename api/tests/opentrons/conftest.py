# Uncomment to enable logging during tests
from __future__ import annotations
import asyncio
import contextlib
import inspect
import io
import json
import os
import pathlib
import zipfile
from typing import (
    TYPE_CHECKING,
    Any,
    AsyncGenerator,
    Callable,
    Dict,
    Generator,
    NamedTuple,
    TextIO,
    Union,
    cast,
)

from typing_extensions import TypedDict

import pytest
from _pytest.fixtures import SubRequest
from decoy import Decoy

from opentrons.protocol_engine.types import PostRunHardwareState

try:
    import aionotify  # type: ignore[import-untyped]
except (OSError, ModuleNotFoundError):
    aionotify = None

from opentrons_shared_data.robot.types import RobotTypeEnum
from opentrons_shared_data.protocol.types import JsonProtocol
from opentrons_shared_data.labware.types import LabwareDefinition
from opentrons_shared_data.module.types import ModuleDefinitionV3
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
    ByPipetteSetting,
    ByTipTypeSetting,
    AspirateProperties,
    Submerge,
    PositionReference,
    DelayProperties,
    DelayParams,
    RetractAspirate,
    SingleDispenseProperties,
    RetractDispense,
    Coordinate,
    MixProperties,
    TouchTipProperties,
    BlowoutProperties,
    MixParams,
    LiquidClassTouchTipParams,
    MultiDispenseProperties,
    BlowoutParams,
    BlowoutLocation,
)
from opentrons_shared_data.deck.types import (
    RobotModel,
    DeckDefinitionV3,
    DeckDefinitionV5,
)
from opentrons_shared_data.deck import (
    load as load_deck,
    DEFAULT_DECK_DEFINITION_VERSION,
)

from opentrons import config
from opentrons import hardware_control as hc
from opentrons.drivers.rpi_drivers.gpio_simulator import SimulatingGPIOCharDev
from opentrons.hardware_control import (
    API,
    HardwareControlAPI,
    ThreadManager,
    ThreadManagedHardware,
)
from opentrons.protocol_api import ProtocolContext, Labware, create_protocol_context
from opentrons.protocol_api.core.legacy.legacy_labware_core import LegacyLabwareCore
from opentrons.protocol_api.core.legacy.deck import (
    DEFAULT_LEGACY_DECK_DEFINITION_VERSION,
)
from opentrons.protocol_engine.create_protocol_engine import (
    create_protocol_engine_in_thread,
)
from opentrons.protocol_engine import (
    Config as ProtocolEngineConfig,
    DeckType,
    error_recovery_policy,
)
from opentrons.protocols.api_support import deck_type
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.definitions import MAX_SUPPORTED_VERSION
from opentrons.types import Location, Point


if TYPE_CHECKING:
    from opentrons.drivers.smoothie_drivers import SmoothieDriver as SmoothieDriverType


class Protocol(NamedTuple):
    text: str
    filename: str
    filelike: TextIO


class Bundle(TypedDict):
    source_dir: pathlib.Path
    filename: str
    contents: str
    filelike: io.BytesIO
    binary_zipfile: bytes
    metadata: Dict[str, str]
    bundled_data: Dict[str, bytes]
    bundled_labware: Dict[str, LabwareDefinition]
    bundled_python: Dict[str, Any]


@pytest.fixture()
def ot_config_tempdir(tmp_path: pathlib.Path) -> Generator[pathlib.Path, None, None]:
    os.environ["OT_API_CONFIG_DIR"] = str(tmp_path)
    config.reload()

    yield tmp_path

    del os.environ["OT_API_CONFIG_DIR"]
    config.reload()


@pytest.fixture()
def is_robot(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "IS_ROBOT", True)


@pytest.fixture
def mock_feature_flags(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    for name, func in inspect.getmembers(config.feature_flags, inspect.isfunction):
        params = inspect.getfullargspec(func)
        mock_get_ff = decoy.mock(func=func)
        if any("robot_type" in p for p in params.args):
            decoy.when(mock_get_ff(RobotTypeEnum.FLEX)).then_return(False)
        else:
            decoy.when(mock_get_ff()).then_return(False)
        monkeypatch.setattr(config.feature_flags, name, mock_get_ff)


@pytest.fixture
async def enable_ot3_hardware_controller(
    request: pytest.FixtureRequest,
    decoy: Decoy,
    mock_feature_flags: None,
) -> None:
    # this is from the command line parameters added in root conftest
    if request.config.getoption("--ot2-only"):
        pytest.skip("testing only ot2")

    decoy.when(config.feature_flags.enable_ot3_hardware_controller()).then_return(True)


@pytest.fixture()
def protocol_file() -> str:
    return "testosaur_v2.py"


@pytest.fixture()
def protocol(protocol_file: str) -> Generator[Protocol, None, None]:
    filename = os.path.join(os.path.dirname(__file__), "data", protocol_file)
    with open(filename, encoding="utf-8") as file:
        text = file.read()
        file.seek(0)
        yield Protocol(text=text, filename=filename, filelike=file)


@pytest.fixture()
def virtual_smoothie_env(monkeypatch: pytest.MonkeyPatch) -> None:
    # TODO (ben 20180426): move this to the .env file
    monkeypatch.setenv("ENABLE_VIRTUAL_SMOOTHIE", "true")


@pytest.fixture(params=["ot2", "ot3"])
async def machine_variant_ffs(
    request: SubRequest,
    decoy: Decoy,
    mock_feature_flags: None,
) -> None:
    device_param = request.param

    if request.node.get_closest_marker("ot3_only") and device_param == "ot2":
        pytest.skip()
    if request.node.get_closest_marker("ot2_only") and device_param == "ot3":
        pytest.skip()

    decoy.when(config.feature_flags.enable_ot3_hardware_controller()).then_return(
        device_param == "ot3"
    )


@contextlib.asynccontextmanager
async def _build_ot2_hw() -> AsyncGenerator[ThreadManagedHardware, None]:
    hw_sim = ThreadManager(API.build_hardware_simulator)
    old_config = config.robot_configs.load()
    try:
        yield hw_sim
    finally:
        config.robot_configs.clear()
        for m in hw_sim.wrapped().attached_modules:
            await m.cleanup()
        hw_sim.set_config(old_config)
        hw_sim.clean_up()


@pytest.fixture()
async def ot2_hardware(
    virtual_smoothie_env: None,
) -> AsyncGenerator[ThreadManagedHardware, None]:
    async with _build_ot2_hw() as hw:
        yield hw


@contextlib.asynccontextmanager
async def _build_ot3_hw() -> AsyncGenerator[ThreadManagedHardware, None]:
    from opentrons.hardware_control.ot3api import OT3API

    hw_sim = ThreadManager(OT3API.build_hardware_simulator)
    old_config = config.robot_configs.load()
    try:
        yield hw_sim
    finally:
        config.robot_configs.clear()
        for m in hw_sim.wrapped().attached_modules:
            await m.cleanup()
        hw_sim.set_config(old_config)
        hw_sim.clean_up()


@pytest.fixture()
async def ot3_hardware(
    request: pytest.FixtureRequest,
    enable_ot3_hardware_controller: None,
) -> AsyncGenerator[ThreadManagedHardware, None]:
    # this is from the command line parameters added in root conftest
    if request.config.getoption("--ot2-only"):
        pytest.skip("testing only ot2")
    async with _build_ot3_hw() as hw:
        yield hw


@pytest.fixture(params=["OT-2 Standard", "OT-3 Standard"])
async def robot_model(
    request: pytest.FixtureRequest,
    decoy: Decoy,
    mock_feature_flags: None,
    virtual_smoothie_env: None,
) -> AsyncGenerator[RobotModel, None]:
    which_machine = cast(RobotModel, request.param)
    if request.node.get_closest_marker("ot2_only") and which_machine == "OT-3 Standard":
        pytest.skip("test requests only ot-2")
    if request.node.get_closest_marker("ot3_only") and which_machine == "OT-2 Standard":
        pytest.skip("test requests only ot-3")
    if which_machine == "OT-3 Standard" and request.config.getoption("--ot2-only"):
        pytest.skip("testing only ot2")

    decoy.when(config.feature_flags.enable_ot3_hardware_controller()).then_return(
        which_machine == "OT-3 Standard"
    )
    yield which_machine


@pytest.fixture
def deck_definition_name(robot_model: RobotModel) -> str:
    if robot_model == "OT-3 Standard":
        return deck_type.STANDARD_OT3_DECK
    elif robot_model == "OT-2 Standard":
        # There are two OT-2 deck definitions (standard and short-trash),
        # but RobotModel does not draw such a distinction. We assume here that it's
        # sufficient to run OT-2 tests with the standard deck definition only.
        return deck_type.STANDARD_OT2_DECK


@pytest.fixture
def deck_definition(deck_definition_name: str) -> DeckDefinitionV5:
    return load_deck(deck_definition_name, DEFAULT_DECK_DEFINITION_VERSION)


@pytest.fixture
def legacy_deck_definition(deck_definition_name: str) -> DeckDefinitionV3:
    return load_deck(deck_definition_name, DEFAULT_LEGACY_DECK_DEFINITION_VERSION)


@pytest.fixture()
async def hardware(
    request: SubRequest,
    decoy: Decoy,
    mock_feature_flags: None,
    virtual_smoothie_env: None,
    robot_model: RobotModel,
) -> AsyncGenerator[ThreadManagedHardware, None]:
    hw_builder = {"OT-2 Standard": _build_ot2_hw, "OT-3 Standard": _build_ot3_hw}[
        robot_model
    ]

    async with hw_builder() as hw:
        decoy.when(config.feature_flags.enable_ot3_hardware_controller()).then_return(
            robot_model == "OT-3 Standard"
        )

        yield hw


def _make_ot2_non_pe_ctx(
    hardware: ThreadManagedHardware, deck_type: str
) -> ProtocolContext:
    """Return a ProtocolContext configured for an OT-2 and not backed by Protocol Engine."""
    return create_protocol_context(
        api_version=APIVersion(2, 13), hardware_api=hardware, deck_type=deck_type
    )


@contextlib.contextmanager
def _make_ot3_pe_ctx(
    hardware: ThreadManagedHardware,
    deck_type: str,
) -> Generator[ProtocolContext, None, None]:
    """Return a ProtocolContext configured for an OT-3 and backed by Protocol Engine."""
    with create_protocol_engine_in_thread(
        hardware_api=hardware.wrapped(),
        config=ProtocolEngineConfig(
            robot_type="OT-3 Standard",
            deck_type=DeckType.OT3_STANDARD,
            ignore_pause=True,
            use_virtual_pipettes=True,
            use_virtual_modules=True,
            use_virtual_gripper=True,
            # TODO figure out if we will want to use a "real" deck config here or if we are fine with simulated
            use_simulated_deck_config=True,
            block_on_door_open=False,
        ),
        deck_configuration=None,
        file_provider=None,
        error_recovery_policy=error_recovery_policy.never_recover,
        drop_tips_after_run=False,
        post_run_hardware_state=PostRunHardwareState.STAY_ENGAGED_IN_PLACE,
        # TODO(jbl 10-30-2023) load_fixed_trash being hardcoded to True will be refactored once we need tests to have
        #   this be False
        load_fixed_trash=True,
    ) as (
        engine,
        loop,
    ):
        yield create_protocol_context(
            api_version=MAX_SUPPORTED_VERSION,
            hardware_api=hardware,
            deck_type=deck_type,
            protocol_engine=engine,
            protocol_engine_loop=loop,
        )


@pytest.fixture()
def ctx(
    request: pytest.FixtureRequest,
    robot_model: RobotModel,
    hardware: ThreadManagedHardware,
    deck_definition_name: str,
) -> Generator[ProtocolContext, None, None]:
    if robot_model == "OT-2 Standard":
        yield _make_ot2_non_pe_ctx(hardware=hardware, deck_type=deck_definition_name)
    elif robot_model == "OT-3 Standard":
        if request.node.get_closest_marker("apiv2_non_pe_only"):
            pytest.skip("Test requests only non-Protocol-Engine ProtocolContexts")
        else:
            with _make_ot3_pe_ctx(
                hardware=hardware, deck_type=deck_definition_name
            ) as ctx:
                yield ctx


@pytest.fixture()
async def smoothie(
    virtual_smoothie_env: None,
    monkeypatch: pytest.MonkeyPatch,
) -> AsyncGenerator[SmoothieDriverType, None]:
    from opentrons.drivers.smoothie_drivers import SmoothieDriver
    from opentrons.config import robot_configs

    driver = SmoothieDriver(
        robot_configs.load_ot2(), SimulatingGPIOCharDev("simulated")
    )
    await driver.connect()
    yield driver
    try:
        await driver.disconnect()
    except AttributeError:
        # if the test disconnected
        pass


@pytest.fixture
def hardware_controller_lockfile(
    monkeypatch: pytest.MonkeyPatch, tmp_path: pathlib.Path
) -> pathlib.Path:
    lockfile_dir = tmp_path / "hardware_controller_lockfile"
    lockfile_dir.mkdir()
    lockfile = lockfile_dir / "hardware.lock"

    monkeypatch.setitem(config.CONFIG, "hardware_controller_lockfile", lockfile)

    return lockfile_dir


@pytest.mark.skipif(
    not hc.Controller,
    reason="hardware controller not available (probably windows)",
)
@pytest.fixture()
def cntrlr_mock_connect(monkeypatch: pytest.MonkeyPatch) -> None:
    async def mock_connect(obj: object, port: Any = None) -> None:
        return

    monkeypatch.setattr(hc.Controller, "connect", mock_connect)
    monkeypatch.setattr(hc.Controller, "fw_version", "virtual")


@pytest.fixture()
async def hardware_api(is_robot: None) -> HardwareControlAPI:
    hw_api = await API.build_hardware_simulator(loop=asyncio.get_running_loop())
    return hw_api


@pytest.fixture()
def get_labware_fixture() -> Callable[[str], LabwareDefinition]:
    def _get_labware_fixture(fixture_name: str) -> LabwareDefinition:
        with open(
            (
                pathlib.Path(__file__).parent
                / ".."
                / ".."
                / ".."
                / "shared-data"
                / "labware"
                / "fixtures"
                / "2"
                / f"{fixture_name}.json"
            ),
            "rb",
        ) as f:
            return cast(LabwareDefinition, json.loads(f.read().decode("utf-8")))

    return _get_labware_fixture


@pytest.fixture()
def get_json_protocol_fixture() -> Callable[[str, str, bool], Union[str, JsonProtocol]]:
    def _get_json_protocol_fixture(
        fixture_version: str,
        fixture_name: str,
        decode: bool = True,
    ) -> Union[str, JsonProtocol]:
        with open(
            pathlib.Path(__file__).parent
            / ".."
            / ".."
            / ".."
            / "shared-data"
            / "protocol"
            / "fixtures"
            / fixture_version
            / f"{fixture_name}.json",
            "rb",
        ) as f:
            contents = f.read().decode("utf-8")
            if decode:
                return cast(JsonProtocol, json.loads(contents))
            else:
                return contents

    return _get_json_protocol_fixture


@pytest.fixture
def get_bundle_fixture() -> Callable[[str], Bundle]:
    def get_std_labware(loadName: str, version: int = 1) -> LabwareDefinition:
        with open(
            pathlib.Path(__file__).parent
            / ".."
            / ".."
            / ".."
            / "shared-data"
            / "labware"
            / "definitions"
            / "2"
            / loadName
            / f"{version}.json",
            "rb",
        ) as f:
            labware_def = cast(LabwareDefinition, json.loads(f.read().decode("utf-8")))
        return labware_def

    def _get_bundle_protocol_fixture(fixture_name: str) -> Bundle:
        """
        It's ugly to store bundles as .zip's, so we'll build the .zip
        from fixtures and return it as `bytes`.
        We also need to hard-code fixture data here (bundled_labware,
        bundled_python, bundled_data, metadata) for the tests to use in
        their assertions.
        """
        fixture_dir = (
            pathlib.Path(__file__).parent
            / "protocols"
            / "fixtures"
            / "bundled_protocols"
            / fixture_name
        )

        result: Bundle = {  # type: ignore[typeddict-item]
            "filename": f"{fixture_name}.zip",
            "source_dir": fixture_dir,
        }

        fixed_trash_def = get_std_labware("opentrons_1_trash_1100ml_fixed")

        empty_protocol = "def run(context):\n    pass"

        if fixture_name == "simple_bundle":
            with open(fixture_dir / "protocol.py", "r") as f:
                result["contents"] = f.read()
            with open(fixture_dir / "data.txt", "rb") as f:
                result["bundled_data"] = {"data.txt": f.read()}
            with open(fixture_dir / "custom_labware.json", "r") as f:
                custom_labware = json.load(f)

            tiprack_def = get_std_labware("opentrons_96_tiprack_10ul")
            result["bundled_labware"] = {
                "opentrons/opentrons_1_trash_1100ml_fixed/1": fixed_trash_def,
                "custom_beta/custom_labware/1": custom_labware,
                "opentrons/opentrons_96_tiprack_10ul/1": tiprack_def,
            }
            result["bundled_python"] = {}

            # NOTE: this is copy-pasted from the .py fixture file
            result["metadata"] = {"author": "MISTER FIXTURE", "apiLevel": "2.0"}

            # make binary zipfile
            binary_zipfile = io.BytesIO()
            with zipfile.ZipFile(binary_zipfile, "w") as z:
                z.writestr("labware/custom_labware.json", json.dumps(custom_labware))
                z.writestr("labware/tiprack.json", json.dumps(tiprack_def))
                z.writestr("labware/fixed_trash.json", json.dumps(fixed_trash_def))
                z.writestr("protocol.ot2.py", result["contents"])
                z.writestr("data/data.txt", result["bundled_data"]["data.txt"])
            binary_zipfile.seek(0)
            result["binary_zipfile"] = binary_zipfile.read()
            binary_zipfile.seek(0)
            result["filelike"] = binary_zipfile

        elif fixture_name == "no_root_files_bundle":
            binary_zipfile = io.BytesIO()
            with zipfile.ZipFile(binary_zipfile, "w") as z:
                z.writestr("inner_dir/protocol.ot2.py", empty_protocol)
            binary_zipfile.seek(0)
            result["binary_zipfile"] = binary_zipfile.read()
            binary_zipfile.seek(0)
            result["filelike"] = binary_zipfile
        elif fixture_name == "no_entrypoint_protocol_bundle":
            binary_zipfile = io.BytesIO()
            with zipfile.ZipFile(binary_zipfile, "w") as z:
                z.writestr("rando_pyfile_name.py", empty_protocol)
            binary_zipfile.seek(0)
            result["binary_zipfile"] = binary_zipfile.read()
            binary_zipfile.seek(0)
            result["filelike"] = binary_zipfile
        elif fixture_name == "conflicting_labware_bundle":
            binary_zipfile = io.BytesIO()
            with zipfile.ZipFile(binary_zipfile, "w") as z:
                plate_def = get_std_labware("biorad_96_wellplate_200ul_pcr")
                z.writestr("protocol.ot2.py", empty_protocol)
                z.writestr("labware/fixed_trash.json", json.dumps(fixed_trash_def))
                z.writestr("labware/plate.json", json.dumps(plate_def))
                z.writestr("labware/same_plate.json", json.dumps(plate_def))
            binary_zipfile.seek(0)
            result["binary_zipfile"] = binary_zipfile.read()
            binary_zipfile.seek(0)
            result["filelike"] = binary_zipfile
        elif fixture_name == "missing_labware_bundle":
            # parsing should fail b/c this bundle lacks labware defs.
            with open(fixture_dir / "protocol.py", "r") as f:
                protocol_contents = f.read()
            binary_zipfile = io.BytesIO()
            with zipfile.ZipFile(binary_zipfile, "w") as z:
                z.writestr("protocol.ot2.py", protocol_contents)
            binary_zipfile.seek(0)
            result["binary_zipfile"] = binary_zipfile.read()
            binary_zipfile.seek(0)
            result["filelike"] = binary_zipfile
        else:
            raise ValueError(
                f"get_bundle_fixture has no case to handle " f'fixture "{fixture_name}"'
            )
        return result

    return _get_bundle_protocol_fixture


@pytest.fixture()
def minimal_labware_def() -> LabwareDefinition:
    return {
        "metadata": {
            "displayName": "minimal labware",
            "displayCategory": "other",
            "displayVolumeUnits": "mL",
        },
        "allowedRoles": ["labware"],
        "cornerOffsetFromSlot": {"x": 10, "y": 10, "z": 5},
        "parameters": {
            "isTiprack": False,
            "loadName": "minimal_labware_def",
            "isMagneticModuleCompatible": True,
            "format": "irregular",
        },
        "ordering": [["A1"], ["A2"]],
        "wells": {
            "A1": {
                "depth": 40,
                "totalLiquidVolume": 100,
                "diameter": 30,
                "x": 0,
                "y": 0,
                "z": 0,
                "shape": "circular",
            },
            "A2": {
                "depth": 40,
                "totalLiquidVolume": 100,
                "diameter": 30,
                "x": 10,
                "y": 0,
                "z": 0,
                "shape": "circular",
            },
        },
        "dimensions": {"xDimension": 1.0, "yDimension": 2.0, "zDimension": 3.0},
        "groups": [],
        "brand": {"brand": "opentrons"},
        "version": 1,
        "schemaVersion": 2,
        "namespace": "opentronstest",
    }


@pytest.fixture()
def minimal_labware_def2() -> LabwareDefinition:
    return {
        "metadata": {
            "displayName": "other test labware",
            "displayCategory": "other",
            "displayVolumeUnits": "mL",
        },
        "cornerOffsetFromSlot": {"x": 10, "y": 10, "z": 5},
        "parameters": {
            "isTiprack": False,
            "loadName": "minimal_labware_def",
            "isMagneticModuleCompatible": True,
            "format": "irregular",
        },
        "ordering": [["A1", "B1", "C1"], ["A2", "B2", "C2"]],
        "wells": {
            "A1": {
                "depth": 40,
                "totalLiquidVolume": 100,
                "diameter": 30,
                "x": 0,
                "y": 18,
                "z": 0,
                "shape": "circular",
            },
            "B1": {
                "depth": 40,
                "totalLiquidVolume": 100,
                "diameter": 30,
                "x": 0,
                "y": 9,
                "z": 0,
                "shape": "circular",
            },
            "C1": {
                "depth": 40,
                "totalLiquidVolume": 100,
                "diameter": 30,
                "x": 0,
                "y": 0,
                "z": 0,
                "shape": "circular",
            },
            "A2": {
                "depth": 40,
                "totalLiquidVolume": 100,
                "diameter": 30,
                "x": 9,
                "y": 18,
                "z": 0,
                "shape": "circular",
            },
            "B2": {
                "depth": 40,
                "totalLiquidVolume": 100,
                "diameter": 30,
                "x": 9,
                "y": 9,
                "z": 0,
                "shape": "circular",
            },
            "C2": {
                "depth": 40,
                "totalLiquidVolume": 100,
                "diameter": 30,
                "x": 9,
                "y": 0,
                "z": 0,
                "shape": "circular",
            },
        },
        "groups": [],
        "dimensions": {"xDimension": 1.0, "yDimension": 2.0, "zDimension": 3.0},
        "schemaVersion": 2,
        "version": 1,
        "namespace": "dummy_namespace",
        "brand": {"brand": "opentrons"},
    }


@pytest.fixture()
def min_lw_impl(minimal_labware_def: LabwareDefinition) -> LegacyLabwareCore:
    return LegacyLabwareCore(
        definition=minimal_labware_def, parent=Location(Point(0, 0, 0), "deck")
    )


@pytest.fixture()
def min_lw2_impl(minimal_labware_def2: LabwareDefinition) -> LegacyLabwareCore:
    return LegacyLabwareCore(
        definition=minimal_labware_def2, parent=Location(Point(0, 0, 0), "deck")
    )


@pytest.fixture()
def min_lw(min_lw_impl: LegacyLabwareCore) -> Labware:
    return Labware(
        core=min_lw_impl,
        api_version=APIVersion(2, 13),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )


@pytest.fixture()
def min_lw2(min_lw2_impl: LegacyLabwareCore) -> Labware:
    return Labware(
        core=min_lw2_impl,
        api_version=APIVersion(2, 13),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )


@pytest.fixture()
def minimal_module_def() -> ModuleDefinitionV3:
    return {
        "$otSharedSchema": "module/schemas/3",
        "moduleType": "temperatureModuleType",
        "model": "temperatureModuleV1",
        "labwareOffset": {"x": -0.15, "y": -0.15, "z": 80.09},
        "dimensions": {
            "bareOverallHeight": 84,
            "overLabwareHeight": 0,
            "xDimension": 123,
            "yDimension": 321,
        },
        "calibrationPoint": {"x": 12.0, "y": 8.75, "z": 0.0},
        "config": {},
        "displayName": "Sample Module",
        "quirks": [],
        "slotTransforms": {},
        "compatibleWith": ["temperatureModuleV2"],
        "cornerOffsetFromSlot": {"x": 0.1, "y": 0.1, "z": 0.0},
        "twoDimensionalRendering": {},
    }


@pytest.fixture
def minimal_liquid_class_def1() -> LiquidClassSchemaV1:
    return LiquidClassSchemaV1(
        liquidClassName="water1",
        displayName="water 1",
        schemaVersion=1,
        namespace="test-fixture-1",
        byPipette=[],
    )


@pytest.fixture
def minimal_liquid_class_def2() -> LiquidClassSchemaV1:
    return LiquidClassSchemaV1(
        liquidClassName="water2",
        displayName="water 2",
        schemaVersion=1,
        namespace="test-fixture-2",
        byPipette=[
            ByPipetteSetting(
                pipetteModel="flex_1channel_50",
                byTipType=[
                    ByTipTypeSetting(
                        tiprack="opentrons_flex_96_tiprack_50ul",
                        aspirate=AspirateProperties(
                            submerge=Submerge(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=0, y=0, z=-5),
                                speed=100,
                                delay=DelayProperties(
                                    enable=True, params=DelayParams(duration=1.5)
                                ),
                            ),
                            retract=RetractAspirate(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=0, y=0, z=5),
                                speed=100,
                                airGapByVolume=[(5.0, 3.0), (10.0, 4.0)],
                                touchTip=TouchTipProperties(enable=False),
                                delay=DelayProperties(enable=False),
                            ),
                            positionReference=PositionReference.WELL_BOTTOM,
                            offset=Coordinate(x=0, y=0, z=-5),
                            flowRateByVolume=[(10.0, 40.0), (20.0, 30.0)],
                            correctionByVolume=[(15.0, 1.5), (30.0, -5.0)],
                            preWet=True,
                            mix=MixProperties(enable=False),
                            delay=DelayProperties(
                                enable=True, params=DelayParams(duration=2)
                            ),
                        ),
                        singleDispense=SingleDispenseProperties(
                            submerge=Submerge(
                                positionReference=PositionReference.LIQUID_MENISCUS,
                                offset=Coordinate(x=0, y=0, z=-5),
                                speed=100,
                                delay=DelayProperties(enable=False),
                            ),
                            retract=RetractDispense(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=0, y=0, z=5),
                                speed=100,
                                airGapByVolume=[(5.0, 3.0), (10.0, 4.0)],
                                blowout=BlowoutProperties(enable=False),
                                touchTip=TouchTipProperties(enable=False),
                                delay=DelayProperties(enable=False),
                            ),
                            positionReference=PositionReference.WELL_BOTTOM,
                            offset=Coordinate(x=0, y=0, z=-5),
                            flowRateByVolume=[(10.0, 40.0), (20.0, 30.0)],
                            correctionByVolume=[(15.0, -1.5), (30.0, 5.0)],
                            mix=MixProperties(enable=False),
                            pushOutByVolume=[(10.0, 7.0), (20.0, 10.0)],
                            delay=DelayProperties(enable=False),
                        ),
                        multiDispense=None,
                    )
                ],
            )
        ],
    )


@pytest.fixture
def maximal_liquid_class_def() -> LiquidClassSchemaV1:
    """Return a liquid class def with all properties enabled."""
    return LiquidClassSchemaV1(
        liquidClassName="test_water",
        displayName="Test Water",
        schemaVersion=1,
        namespace="opentrons",
        byPipette=[
            ByPipetteSetting(
                pipetteModel="flex_1channel_50",
                byTipType=[
                    ByTipTypeSetting(
                        tiprack="opentrons_flex_96_tiprack_50ul",
                        aspirate=AspirateProperties(
                            submerge=Submerge(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=1, y=2, z=3),
                                speed=100,
                                delay=DelayProperties(
                                    enable=True, params=DelayParams(duration=10.0)
                                ),
                            ),
                            retract=RetractAspirate(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=3, y=2, z=1),
                                speed=50,
                                airGapByVolume=[(1.0, 0.1), (49.9, 0.1), (50.0, 0.0)],
                                touchTip=TouchTipProperties(
                                    enable=True,
                                    params=LiquidClassTouchTipParams(
                                        zOffset=-1, mmFromEdge=0.5, speed=30
                                    ),
                                ),
                                delay=DelayProperties(
                                    enable=True, params=DelayParams(duration=20)
                                ),
                            ),
                            positionReference=PositionReference.WELL_BOTTOM,
                            offset=Coordinate(x=10, y=20, z=30),
                            flowRateByVolume=[(1.0, 35.0), (10.0, 24.0), (50.0, 35.0)],
                            correctionByVolume=[(0.0, 0.0)],
                            preWet=True,
                            mix=MixProperties(
                                enable=True, params=MixParams(repetitions=1, volume=50)
                            ),
                            delay=DelayProperties(
                                enable=True, params=DelayParams(duration=0.2)
                            ),
                        ),
                        singleDispense=SingleDispenseProperties(
                            submerge=Submerge(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=30, y=20, z=10),
                                speed=100,
                                delay=DelayProperties(
                                    enable=True, params=DelayParams(duration=0.0)
                                ),
                            ),
                            retract=RetractDispense(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=11, y=22, z=33),
                                speed=50,
                                airGapByVolume=[(1.0, 0.1), (49.9, 0.1), (50.0, 0.0)],
                                blowout=BlowoutProperties(
                                    enable=True,
                                    params=BlowoutParams(
                                        location=BlowoutLocation.SOURCE,
                                        flowRate=100,
                                    ),
                                ),
                                touchTip=TouchTipProperties(
                                    enable=True,
                                    params=LiquidClassTouchTipParams(
                                        zOffset=-1, mmFromEdge=0.75, speed=30
                                    ),
                                ),
                                delay=DelayProperties(
                                    enable=True, params=DelayParams(duration=10)
                                ),
                            ),
                            positionReference=PositionReference.WELL_BOTTOM,
                            offset=Coordinate(x=33, y=22, z=11),
                            flowRateByVolume=[(1.0, 50.0)],
                            correctionByVolume=[(0.0, 0.0)],
                            mix=MixProperties(
                                enable=True, params=MixParams(repetitions=1, volume=50)
                            ),
                            pushOutByVolume=[
                                (1.0, 7.0),
                                (4.999, 7.0),
                                (5.0, 2.0),
                                (10.0, 2.0),
                                (50.0, 2.0),
                            ],
                            delay=DelayProperties(
                                enable=True, params=DelayParams(duration=0.5)
                            ),
                        ),
                        multiDispense=MultiDispenseProperties(
                            submerge=Submerge(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=0, y=0, z=2),
                                speed=100,
                                delay=DelayProperties(
                                    enable=False, params=DelayParams(duration=0.0)
                                ),
                            ),
                            retract=RetractDispense(
                                positionReference=PositionReference.WELL_TOP,
                                offset=Coordinate(x=2, y=3, z=1),
                                speed=50,
                                airGapByVolume=[(1.0, 0.1), (49.9, 0.1), (50.0, 0.0)],
                                blowout=BlowoutProperties(enable=False, params=None),
                                touchTip=TouchTipProperties(
                                    enable=False,
                                    params=LiquidClassTouchTipParams(
                                        zOffset=-1, mmFromEdge=0.5, speed=30
                                    ),
                                ),
                                delay=DelayProperties(
                                    enable=False, params=DelayParams(duration=0)
                                ),
                            ),
                            positionReference=PositionReference.WELL_BOTTOM,
                            offset=Coordinate(x=1, y=3, z=2),
                            flowRateByVolume=[(50.0, 50.0)],
                            correctionByVolume=[(0.0, 0.0)],
                            conditioningByVolume=[(1.0, 5.0), (45.0, 5.0), (50.0, 0.0)],
                            disposalByVolume=[(1.0, 5.0), (45.0, 5.0), (50.0, 0.0)],
                            delay=DelayProperties(
                                enable=True, params=DelayParams(duration=0.2)
                            ),
                        ),
                    )
                ],
            )
        ],
    )
