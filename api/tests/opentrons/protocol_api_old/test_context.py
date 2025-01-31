""" Test the functions and classes in the protocol context """
from decoy import Decoy

from typing import Any, Callable, Dict, List, Optional, Tuple
import pytest
import mock
from pytest import MonkeyPatch

from opentrons_shared_data.labware.types import LabwareDefinition
from opentrons_shared_data.errors.exceptions import UnexpectedTipRemovalError
from opentrons.hardware_control.adapters import SynchronousAdapter
from opentrons.protocol_api import Labware

import opentrons.protocol_api as papi
import opentrons.protocols.api_support as papi_support
from opentrons.protocols.api_support.labware_like import LabwareLike
import opentrons.protocols.geometry as papi_geometry
from opentrons.protocols.api_support.deck_type import STANDARD_OT2_DECK
from opentrons.protocols.api_support import instrument as instrument_support
from opentrons.calibration_storage import types as cs_types
from opentrons.util.helpers import utc_now
from opentrons_shared_data.pipette.types import LabwareUri

from opentrons.protocol_api.module_contexts import (
    ThermocyclerContext,
    HeaterShakerContext,
)
from opentrons.types import Mount, Point, Location, TransferTipPolicy
from opentrons.hardware_control import API, ThreadManagedHardware
from opentrons.hardware_control.instruments.ot2.pipette import Pipette
from opentrons.hardware_control.types import Axis, CriticalPoint
from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.hardware_control.modules import SimulatingModule
from opentrons.protocols.advanced_control.common import MixStrategy, Mix, MixOpts
from opentrons.protocols.advanced_control.transfers import transfer as tf
from opentrons.protocols.api_support.types import APIVersion


# TODO (lc 12-8-2022) Not sure if we plan to keep these tests, but if we do
# we should re-write them to be agnostic to the underlying hardware. Otherwise
# I wouldn't really consider these to be proper unit tests.
pytestmark = pytest.mark.ot2_only


def set_version_added(attr: str, mp: MonkeyPatch, version: str) -> str:
    """helper to mock versionadded for an attr

    attr is the attr
    mp is a monkeypatch fixture
    version is an APIVersion
    """

    def get_wrapped(attr: str) -> str:
        if hasattr(attr, "__wrapped__"):
            return get_wrapped(attr.__wrapped__)
        return attr

    if hasattr(attr, "fget"):
        # this is a property probably
        orig = get_wrapped(attr.fget)
    else:
        orig = get_wrapped(attr)
    mp.setattr(orig, "__opentrons_version_added", version)
    return attr


async def test_motion(
    ctx: papi.ProtocolContext, hardware: ThreadManagedHardware
) -> None:
    ctx.home()
    instr = ctx.load_instrument("p10_single", Mount.RIGHT)
    old_pos = await hardware.current_position(instr._core.get_mount())
    instr.home()
    assert instr.move_to(Location(Point(0, 0, 0), None)) is instr
    old_pos[Axis.X] = 0.0
    old_pos[Axis.Y] = 0.0
    old_pos[Axis.A] = 0.0
    old_pos[Axis.C] = 2.5
    assert await hardware.current_position(instr._core.get_mount()) == pytest.approx(
        old_pos
    )


def test_max_speeds(
    ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch, hardware: ThreadManagedHardware
) -> None:
    ctx.home()
    with mock.patch.object(ctx._core.get_hardware(), "move_to") as mock_move:
        instr = ctx.load_instrument("p10_single", Mount.RIGHT)
        instr.move_to(Location(Point(0, 0, 0), None))
        assert all(
            kwargs["max_speeds"] == {} for args, kwargs in mock_move.call_args_list
        )

    with mock.patch.object(ctx._core.get_hardware(), "move_to") as mock_move:
        ctx.max_speeds["x"] = 10
        instr.move_to(Location(Point(0, 0, 1), None))
        assert all(
            kwargs["max_speeds"] == {Axis.X: 10}
            for args, kwargs in mock_move.call_args_list
        )

    with mock.patch.object(ctx._core.get_hardware(), "move_to") as mock_move:
        ctx.max_speeds["x"] = None
        instr.move_to(Location(Point(1, 0, 1), None))
        assert all(
            kwargs["max_speeds"] == {} for args, kwargs in mock_move.call_args_list
        )


async def test_location_cache(
    ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch, hardware: ThreadManagedHardware
) -> None:
    right = ctx.load_instrument("p10_single", Mount.RIGHT)
    lw = ctx.load_labware("corning_96_wellplate_360ul_flat", 1)
    ctx.home()

    test_args = None

    def fake_plan_move(
        from_loc: Location,
        to_loc: Location,
        deck: Deck,
        well_z_margin: Optional[float] = None,
        lw_z_margin: Optional[float] = None,
        force_direct: Optional[bool] = False,
        minimum_z_height: Optional[float] = None,
    ) -> List[Tuple[Point, Optional[CriticalPoint]]]:
        nonlocal test_args
        test_args = (from_loc, to_loc, deck, well_z_margin, lw_z_margin)
        return [
            (Point(0, 1, 10), None),
            (Point(1, 2, 10), None),
            (Point(1, 2, 3), None),
        ]

    monkeypatch.setattr(papi_geometry.planning, "plan_moves", fake_plan_move)
    # When we move without a cache, the from location should be the gantry
    # position
    gantry_pos = await hardware.gantry_position(Mount.RIGHT)
    right.move_to(lw.wells()[0].top())
    # The home position from hardware_control/simulator.py, taking into account
    # that the right pipette is a p10 single which is a different height than
    # the reference p300 single
    assert test_args[0].point == gantry_pos  # type: ignore[index]
    assert test_args[0].labware.is_empty  # type: ignore[index]

    # Once we have a location cache, that should be our from_loc
    right.move_to(lw.wells()[1].top())
    assert test_args[0].labware.as_well() == lw.wells()[0]  # type: ignore[index]


def test_location_cache_two_pipettes(
    ctx: papi.ProtocolContext, hardware: ThreadManagedHardware
) -> None:
    """It should be invalidated when next movement is a different pipette
    than the cached location."""
    ctx.home()
    left = ctx.load_instrument("p10_single", Mount.LEFT)
    right = ctx.load_instrument("p10_single", Mount.RIGHT)

    left_loc = Location(point=Point(1, 2, 3), labware="1")
    right_loc = Location(point=Point(3, 4, 5), labware="2")

    with mock.patch.object(papi_geometry.planning, "plan_moves") as m:
        # The first moves. The location cache is empty.
        left.move_to(left_loc)
        assert m.call_args[0][0].labware.is_empty
        assert m.call_args[0][1] == left_loc
        # The second move the location cache is not used because we're moving
        # a different pipette.
        right.move_to(right_loc)
        assert m.call_args[0][0].labware.is_empty
        assert m.call_args[0][1] == right_loc


def test_location_cache_two_pipettes_fails_pre_2_10(
    ctx: papi.ProtocolContext, hardware: ThreadManagedHardware
) -> None:
    """It should reuse location cache even if cached location was set by
    move of a different pipette."""
    ctx.home()
    left = ctx.load_instrument("p10_single", Mount.LEFT)
    right = ctx.load_instrument("p10_single", Mount.RIGHT)
    assert hasattr(left._core, "_api_version")
    assert hasattr(right._core, "_api_version")
    left._core._api_version = APIVersion(2, 9)
    right._core._api_version = APIVersion(2, 9)

    left_loc = Location(point=Point(1, 2, 3), labware="1")
    right_loc = Location(point=Point(3, 4, 5), labware="2")

    with mock.patch.object(papi_geometry.planning, "plan_moves") as m:
        # The first moves. The location cache is empty.
        left.move_to(left_loc)
        assert m.call_args[0][0].labware.is_empty
        assert m.call_args[0][1] == left_loc
        right.move_to(right_loc)
        assert m.call_args[0][0].labware == left_loc.labware
        assert m.call_args[0][1] == right_loc


def test_move_uses_arc(
    ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch, hardware: ThreadManagedHardware
) -> None:
    ctx.home()
    right = ctx.load_instrument("p10_single", Mount.RIGHT)
    lw = ctx.load_labware("corning_96_wellplate_360ul_flat", 1)
    ctx.home()

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move:
        right.move_to(lw.wells()[0].top())
        assert len(fake_move.call_args_list) == 3
        assert fake_move.call_args_list[-1][0] == (
            Mount.RIGHT,
            lw.wells()[0].top().point,
        )


def test_pipette_info(ctx: papi.ProtocolContext) -> None:
    right = ctx.load_instrument("p300_multi", Mount.RIGHT)
    left = ctx.load_instrument("p1000_single", Mount.LEFT)
    assert right.type == "multi"
    hardware = ctx._core.get_hardware()
    name = hardware.attached_instruments[Mount.RIGHT]["name"]
    model = hardware.attached_instruments[Mount.RIGHT]["model"]
    assert right.name == name
    assert right.model == model
    assert left.type == "single"
    name = hardware.attached_instruments[Mount.LEFT]["name"]
    model = hardware.attached_instruments[Mount.LEFT]["model"]
    assert left.name == name
    assert left.model == model


def test_pick_up_and_drop_tip(ctx: papi.ProtocolContext) -> None:
    ctx.home()
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 1)
    tip_length = tiprack.tip_length
    mount = Mount.LEFT

    instr = ctx.load_instrument("p300_single", mount, tip_racks=[tiprack])

    pipette: Pipette = ctx._core.get_hardware().hardware_instruments[mount]
    nozzle_offset = Point(*pipette.config.nozzle_offset)
    assert pipette.critical_point() == nozzle_offset
    target_location = tiprack["A1"].top()

    instr.pick_up_tip(target_location)
    assert pipette.ready_to_aspirate
    assert not tiprack.wells()[0].has_tip
    overlap = instr.hw_pipette["tip_overlap"][tiprack.uri]
    new_offset = nozzle_offset - Point(0, 0, tip_length - overlap)
    assert pipette.critical_point() == new_offset
    assert pipette.has_tip

    instr.drop_tip(target_location)
    assert not pipette.has_tip
    assert pipette.critical_point() == nozzle_offset


def test_pick_up_without_prep_after(ctx: papi.ProtocolContext) -> None:
    ctx.home()
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 1)
    lw = ctx.load_labware("corning_96_wellplate_360ul_flat", 2)
    mount = Mount.LEFT

    instr = ctx.load_instrument("p300_single", mount, tip_racks=[tiprack])

    pipette: Pipette = ctx._core.get_hardware().hardware_instruments[mount]

    # will not be prepared until after an aspirate
    instr.pick_up_tip(tiprack["A2"].top(), prep_after=False)
    assert not pipette.ready_to_aspirate
    instr.aspirate(1, lw.wells()[0].bottom())
    assert pipette.ready_to_aspirate
    instr.drop_tip(tiprack["A2"].top())


def test_pick_up_tip_old_version(
    hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    # API version 2.12, a pick-up tip would not prepare-for-aspirate
    api_version = APIVersion(2, 12)
    ctx = papi.create_protocol_context(
        api_version=api_version, hardware_api=hardware, deck_type=deck_definition_name
    )

    ctx.home()
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 1)
    lw = ctx.load_labware("corning_96_wellplate_360ul_flat", 2)
    mount = Mount.LEFT

    instr = ctx.load_instrument("p300_single", mount, tip_racks=[tiprack])

    pipette: Pipette = ctx._core.get_hardware().hardware_instruments[mount]

    # will not be prepared until after an aspirate
    assert not pipette.has_tip
    instr.pick_up_tip(tiprack["A1"].top())
    assert not pipette.ready_to_aspirate
    instr.aspirate(1, lw.wells()[0].bottom())
    assert pipette.ready_to_aspirate
    instr.drop_tip()

    # cannot run pick_up_tip() with a prep_after= arg
    assert not pipette.has_tip
    with pytest.raises(papi_support.util.APIVersionError):
        instr.pick_up_tip(tiprack["A2"].top(), prep_after=False)
    with pytest.raises(papi_support.util.APIVersionError):
        instr.pick_up_tip(tiprack["A2"].top(), prep_after=True)


def test_return_tip_old_version(
    hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    # API version 2.2, a returned tip would be picked up by the
    # next pick up tip call
    api_version = APIVersion(2, 1)
    ctx = papi.create_protocol_context(
        api_version=api_version, hardware_api=hardware, deck_type=deck_definition_name
    )
    ctx.home()
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 1)
    mount = Mount.LEFT

    instr = ctx.load_instrument("p300_single", mount, tip_racks=[tiprack])

    with pytest.raises(TypeError):
        instr.return_tip()

    pipette: Pipette = ctx._core.get_hardware().hardware_instruments[mount]

    target_location = tiprack["A1"].top()
    instr.pick_up_tip(target_location)
    assert not tiprack.wells()[0].has_tip
    assert pipette.has_tip

    instr.return_tip()
    assert not pipette.has_tip
    assert tiprack.wells()[0].has_tip

    instr.pick_up_tip()
    assert pipette.has_tip
    assert not tiprack.wells()[0].has_tip


def test_return_tip(ctx: papi.ProtocolContext) -> None:
    ctx.home()
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 1)
    mount = Mount.LEFT

    instr = ctx.load_instrument("p300_single", mount, tip_racks=[tiprack])

    with pytest.raises(TypeError):
        instr.return_tip()

    pipette: Pipette = ctx._core.get_hardware().hardware_instruments[mount]

    target_location = tiprack["A1"].top()
    instr.pick_up_tip(target_location)
    assert not tiprack.wells()[0].has_tip
    assert pipette.has_tip

    instr.return_tip()
    assert not pipette.has_tip
    assert not tiprack.wells()[0].has_tip

    instr.pick_up_tip()
    assert pipette.has_tip
    assert not tiprack.wells()[1].has_tip


def test_use_filter_tips(ctx: papi.ProtocolContext) -> None:
    ctx.home()

    tiprack = ctx.load_labware_by_name("opentrons_96_filtertiprack_200ul", 2)

    mount = Mount.LEFT

    instr = ctx.load_instrument("p300_single", mount, tip_racks=[tiprack])
    pipette: Pipette = ctx._core.get_hardware().hardware_instruments[mount]

    assert pipette.available_volume == pipette.liquid_class.max_volume

    instr.pick_up_tip()
    assert pipette.available_volume < pipette.liquid_class.max_volume


@pytest.mark.parametrize("pipette_model", ["p10_single", "p20_single_gen2"])
@pytest.mark.parametrize(
    "tiprack_kind", ["opentrons_96_tiprack_10ul", "eppendorf_96_tiprack_10ul_eptips"]
)
def test_pick_up_tip_no_location(
    ctx: papi.ProtocolContext, pipette_model: str, tiprack_kind: str
) -> None:
    ctx.home()

    tiprack1 = ctx.load_labware(tiprack_kind, 1)
    tip_length1 = tiprack1.tip_length

    tiprack2 = ctx.load_labware(tiprack_kind, 2)
    tip_length2 = tip_length1 + 1.0
    tiprack2.tip_length = tip_length2

    mount = Mount.LEFT

    instr = ctx.load_instrument(pipette_model, mount, tip_racks=[tiprack1, tiprack2])

    pipette: Pipette = ctx._core.get_hardware().hardware_instruments[mount]
    nozzle_offset = Point(*pipette.config.nozzle_offset)
    assert pipette.critical_point() == nozzle_offset

    instr.pick_up_tip()

    assert "picking up tip" in ",".join([cmd.lower() for cmd in ctx.commands()])
    assert not tiprack1.wells()[0].has_tip
    overlap = instr.hw_pipette["tip_overlap"][tiprack1.uri]
    new_offset = nozzle_offset - Point(0, 0, tip_length1 - overlap)
    assert pipette.critical_point() == new_offset

    # TODO: remove argument and verify once trash container is added
    instr.drop_tip(tiprack1.wells()[0].top())
    assert not pipette.has_tip
    assert pipette.critical_point() == nozzle_offset

    for well in tiprack1.wells():
        if well.has_tip:
            tiprack1.use_tips(well)

    assert tiprack1.next_tip() is None

    assert tiprack2.wells()[0].has_tip
    instr.pick_up_tip()
    assert not tiprack2.wells()[0].has_tip


def test_instrument_trash(ctx: papi.ProtocolContext) -> None:
    ctx.home()

    mount = Mount.LEFT
    instr = ctx.load_instrument("p300_single", mount)

    assert isinstance(instr.trash_container, Labware)

    assert instr.trash_container.name == "opentrons_1_trash_1100ml_fixed"

    new_trash = ctx.load_labware("usascientific_12_reservoir_22ml", 2)
    instr.trash_container = new_trash

    assert instr.trash_container.name == "usascientific_12_reservoir_22ml"


@pytest.mark.ot3_only
def test_instrument_trash_ot3(ctx: papi.ProtocolContext) -> None:
    ctx.home()

    mount = Mount.LEFT
    instr = ctx.load_instrument("flex_1channel_1000", mount)

    assert isinstance(instr, papi.ProtocolContext)

    assert instr.trash_container.name == "opentrons_1_trash_3200ml_fixed"


def test_aspirate(ctx: papi.ProtocolContext) -> None:
    ctx.home()
    lw = ctx.load_labware("corning_96_wellplate_360ul_flat", 1)
    tiprack = ctx.load_labware("opentrons_96_tiprack_10ul", 2)
    instr = ctx.load_instrument("p10_single", Mount.RIGHT, tip_racks=[tiprack])

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move, mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "aspirate"
    ) as fake_hw_aspirate:
        instr.pick_up_tip()
        instr.aspirate(2.0, lw.wells()[0].bottom())
        assert "aspirating" in ",".join([cmd.lower() for cmd in ctx.commands()])

        fake_hw_aspirate.assert_called_once_with(Mount.RIGHT, 2.0, 1.0)
        assert fake_move.call_args_list[-1] == mock.call(
            Mount.RIGHT,
            lw.wells()[0].bottom().point,
            critical_point=None,
            speed=400,
            max_speeds={},
        )

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move, mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "aspirate"
    ) as fake_hw_aspirate:
        instr.well_bottom_clearance.aspirate = 1.0
        instr.aspirate(2.0, lw.wells()[0])
        dest_point, dest_lw = lw.wells()[0].bottom()
        assert isinstance(dest_point, Point)
        dest_point = dest_point._replace(z=dest_point.z + 1.0)
        assert len(fake_move.call_args_list) == 1
        assert fake_move.call_args_list[0] == mock.call(
            Mount.RIGHT, dest_point, critical_point=None, speed=400, max_speeds={}
        )

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move, mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "aspirate"
    ) as fake_hw_aspirate:
        hardware = ctx._core.get_hardware()
        assert isinstance(hardware, SynchronousAdapter)
        mount = hardware._obj_to_adapt.hardware_instruments[Mount.RIGHT]
        assert mount is not None
        mount._current_volume = 1

        instr.aspirate(2.0)
        fake_move.assert_not_called()

        instr.blow_out()

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move, mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "aspirate"
    ) as fake_hw_aspirate:
        instr.aspirate(2.0)
        assert len(fake_move.call_args_list) == 2
        assert isinstance(dest_lw, LabwareLike)
        # reset plunger at the top of the well after blowout
        assert fake_move.call_args_list[0] == mock.call(
            Mount.RIGHT,
            dest_lw.as_well().top().point,
            critical_point=None,
            speed=400,
            max_speeds={},
        )
        assert fake_move.call_args_list[1] == mock.call(
            Mount.RIGHT, dest_point, critical_point=None, speed=400, max_speeds={}
        )


def test_dispense(ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch) -> None:
    ctx.home()
    lw = ctx.load_labware("corning_96_wellplate_360ul_flat", 1)
    instr = ctx.load_instrument("p10_single", Mount.RIGHT)

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move, mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "dispense"
    ) as fake_hw_dispense:
        instr.dispense(2.0, lw.wells()[0].bottom())
        assert "dispensing" in ",".join([cmd.lower() for cmd in ctx.commands()])
        fake_hw_dispense.assert_called_once_with(Mount.RIGHT, 2.0, 1.0)
        fake_move.assert_called_with(
            Mount.RIGHT,
            lw.wells()[0].bottom().point,
            critical_point=None,
            speed=400,
            max_speeds={},
        )

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move, mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "dispense"
    ) as fake_hw_dispense:
        instr.well_bottom_clearance.dispense = 2.0
        instr.dispense(2.0, lw.wells()[0])
        dest_point, dest_lw = lw.wells()[0].bottom()
        assert isinstance(dest_point, Point)
        dest_point = dest_point._replace(z=dest_point.z + 2.0)
        fake_move.assert_called_with(
            Mount.RIGHT, dest_point, critical_point=None, speed=400, max_speeds={}
        )

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move, mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "dispense"
    ) as fake_hw_dispense:
        instr.well_bottom_clearance.dispense = 2.0
        instr.dispense(2.0, lw.wells()[0])
        dest_point, dest_lw = lw.wells()[0].bottom()
        assert isinstance(dest_point, Point)
        dest_point = dest_point._replace(z=dest_point.z + 2.0)
        fake_move.assert_called_with(
            Mount.RIGHT, dest_point, critical_point=None, speed=400, max_speeds={}
        )
        instr.dispense(2.0)
        fake_move.reset_mock()
        fake_move.assert_not_called()


def test_prevent_liquid_handling_without_tip(ctx: papi.ProtocolContext) -> None:
    ctx.home()

    tr = ctx.load_labware("opentrons_96_tiprack_300ul", "1")
    plate = ctx.load_labware("corning_384_wellplate_112ul_flat", "2")
    pipR = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tr])

    with pytest.raises(UnexpectedTipRemovalError):
        pipR.aspirate(100, plate.wells()[0])

    pipR.pick_up_tip()

    pipR.aspirate(100, plate.wells()[0])
    pipR.drop_tip()

    with pytest.raises(UnexpectedTipRemovalError):
        pipR.dispense(100, plate.wells()[1])


def test_starting_tip_and_reset_tipracks(
    ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch
) -> None:
    ctx.home()

    tr = ctx.load_labware("opentrons_96_tiprack_300ul", 1)
    tr_2 = ctx.load_labware("opentrons_96_tiprack_300ul", 2)
    pipL = ctx.load_instrument("p300_single", Mount.LEFT, tip_racks=[tr, tr_2])
    pipR = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tr, tr_2])

    pipL.starting_tip = tr.wells()[2]
    pipL.pick_up_tip()
    assert pipL._last_tip_picked_up_from == tr.wells()[2]
    pipL.drop_tip()

    pipR.starting_tip = tr.wells()[2]
    pipR.pick_up_tip()
    assert pipR._last_tip_picked_up_from == tr.wells()[3]
    pipR.drop_tip()

    tr.wells()[95].has_tip = False
    pipL.starting_tip = tr.wells()[95]
    pipL.pick_up_tip()
    assert pipL._last_tip_picked_up_from == tr_2.wells()[0]

    pipL.reset_tipracks()
    assert tr.wells()[2].has_tip
    assert tr.wells()[3].has_tip


def test_mix(ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch) -> None:
    ctx.home()
    lw = ctx.load_labware("opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap", 1)
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    instr = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tiprack])

    instr.pick_up_tip()
    mix_steps = []
    aspirate_called_with = None
    dispense_called_with = None

    def fake_aspirate(
        vol: Optional[float] = None,
        loc: Optional[Location] = None,
        rate: Optional[int] = None,
    ) -> None:
        nonlocal aspirate_called_with
        nonlocal mix_steps
        aspirate_called_with = ("aspirate", vol, loc, rate)
        mix_steps.append(aspirate_called_with)

    def fake_dispense(
        vol: Optional[float] = None,
        loc: Optional[Location] = None,
        rate: Optional[int] = None,
    ) -> None:
        nonlocal dispense_called_with
        nonlocal mix_steps
        dispense_called_with = ("dispense", vol, loc, rate)
        mix_steps.append(dispense_called_with)

    monkeypatch.setattr(instr, "aspirate", fake_aspirate)
    monkeypatch.setattr(instr, "dispense", fake_dispense)

    repetitions = 2
    volume = 5
    location = lw.wells()[0]
    rate = 2
    instr.mix(repetitions, volume, location, rate)
    expected_mix_steps = [
        ("aspirate", volume, location, 2),
        ("dispense", volume, None, 2),
        ("aspirate", volume, None, 2),
        ("dispense", volume, None, 2),
    ]

    assert mix_steps == expected_mix_steps


def test_touch_tip_default_args(
    monkeypatch: MonkeyPatch, hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    api_version = APIVersion(2, 3)
    ctx = papi.create_protocol_context(
        api_version=api_version, hardware_api=hardware, deck_type=deck_definition_name
    )
    ctx.home()
    lw = ctx.load_labware("opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap", 1)
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    instr = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tiprack])

    instr.pick_up_tip()

    instr.aspirate(10, lw.wells()[0])
    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move:
        instr.touch_tip()
        z_offset = Point(0, 0, 1)  # default z offset of 1mm
        speed = 60  # default speed
        edges = [
            lw.wells()[0].from_center_cartesian(1, 0, 1) - z_offset,
            lw.wells()[0].from_center_cartesian(-1, 0, 1) - z_offset,
            lw.wells()[0].from_center_cartesian(0, 1, 1) - z_offset,
            lw.wells()[0].from_center_cartesian(0, -1, 1) - z_offset,
        ]
        assert fake_move.call_count == 5
        for i in range(1, 5):
            assert fake_move.call_args_list[i] == mock.call(
                Mount.RIGHT, edges[i - 1], speed
            )
        old_z = fake_move.call_args_list[1][0][1].z
    # Check that the old api version initial well move has the same z height
    # as the calculated edges.
    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move:
        instr.touch_tip(v_offset=1)
        assert fake_move.call_args_list[0][0][1].z != old_z


def test_touch_tip_new_default_args(
    ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch
) -> None:
    ctx.home()
    lw = ctx.load_labware("opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap", 1)
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    instr = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tiprack])

    instr.pick_up_tip()

    instr.aspirate(10, lw.wells()[0])

    z_offset = Point(0, 0, 1)  # default z offset of 1mm
    speed = 60.0  # default speed
    edges = [
        lw.wells()[0].from_center_cartesian(1, 0, 1) - z_offset,
        lw.wells()[0].from_center_cartesian(-1, 0, 1) - z_offset,
        lw.wells()[0].from_center_cartesian(0, 0, 1) - z_offset,
        lw.wells()[0].from_center_cartesian(0, 1, 1) - z_offset,
        lw.wells()[0].from_center_cartesian(0, -1, 1) - z_offset,
    ]

    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move:
        instr.touch_tip()
        for i in range(1, 5):
            assert fake_move.call_args_list[i] == mock.call(
                Mount.RIGHT, edges[i - 1], speed
            )
        old_z = fake_move.call_args_list[0][0][1].z

    # Check that the new api version initial well move has the same z height
    # as the calculated edges.
    with mock.patch.object(
        ctx._core.get_hardware()._obj_to_adapt, "move_to"
    ) as fake_move:
        instr.touch_tip(v_offset=1)
        assert fake_move.call_args_list[0][0][1].z != old_z


def test_touch_tip_disabled(
    ctx: papi.ProtocolContext,
    monkeypatch: MonkeyPatch,
    get_labware_fixture: Callable[[str], LabwareDefinition],
) -> None:
    ctx.home()
    trough1 = get_labware_fixture("fixture_12_trough")
    trough_lw = ctx.load_labware_from_definition(trough1, "1")
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    instr = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tiprack])
    instr.pick_up_tip()
    move_mock = mock.Mock()
    monkeypatch.setattr(API, "move_to", move_mock)
    instr.touch_tip(trough_lw["A1"])
    move_mock.assert_not_called()


def test_blow_out(ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch) -> None:
    ctx.home()
    lw = ctx.load_labware("opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap", 1)
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    instr = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tiprack])

    move_location = None
    instr.pick_up_tip()
    instr.aspirate(10, lw.wells()[0])

    def fake_move(location: Point) -> None:
        nonlocal move_location
        move_location = location

    monkeypatch.setattr(instr._core, "move_to", fake_move)

    instr.blow_out()
    # pipette should not move, if no location is passed
    assert move_location is None

    instr.aspirate(10)
    instr.blow_out(lw.wells()[0])
    # pipette should blow out at the top of the well as default
    assert move_location == lw.wells()[0].top()

    instr.aspirate(10)
    instr.blow_out(lw.wells()[0].bottom())
    # pipette should blow out at the location defined
    assert move_location == lw.wells()[0].bottom()


def test_transfer_options(ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch) -> None:
    lw1 = ctx.load_labware("biorad_96_wellplate_200ul_pcr", 1)
    lw2 = ctx.load_labware("corning_96_wellplate_360ul_flat", 2)
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    instr = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tiprack])

    ctx.home()
    transfer_options = None

    def fake_execute_transfer(xfer_plan: tf.TransferPlan) -> None:
        nonlocal transfer_options
        transfer_options = xfer_plan._options

    monkeypatch.setattr(instr, "_execute_transfer", fake_execute_transfer)
    instr.transfer(
        10,
        lw1.columns()[0],
        lw2.columns()[0],
        new_tip="always",
        mix_before=(2, 10),
        mix_after=(3, 20),
        blow_out=True,
    )
    expected_xfer_options1 = tf.TransferOptions(
        transfer=tf.Transfer(
            new_tip=TransferTipPolicy.ALWAYS,
            air_gap=0,
            carryover=True,
            gradient_function=None,
            disposal_volume=0,
            mix_strategy=MixStrategy.BOTH,
            drop_tip_strategy=tf.DropTipStrategy.TRASH,
            blow_out_strategy=tf.BlowOutStrategy.TRASH,
            touch_tip_strategy=tf.TouchTipStrategy.NEVER,
        ),
        pick_up_tip=tf.PickUpTipOpts(),
        mix=Mix(
            mix_before=MixOpts(repetitions=2, volume=10, rate=None),
            mix_after=MixOpts(repetitions=3, volume=20, rate=None),
        ),
        blow_out=tf.BlowOutOpts(),
        touch_tip=tf.TouchTipOpts(),
        aspirate=tf.AspirateOpts(),
        dispense=tf.DispenseOpts(),
    )
    assert transfer_options == expected_xfer_options1

    instr.pick_up_tip()
    instr.distribute(
        50,
        lw1.rows()[0][0],
        lw2.columns()[0],
        new_tip="never",
        touch_tip=True,
        trash=False,
        disposal_volume=10,
        mix_before=(2, 30),
        mix_after=(3, 20),
    )
    instr.drop_tip()
    expected_xfer_options2 = tf.TransferOptions(
        transfer=tf.Transfer(
            new_tip=TransferTipPolicy.NEVER,
            air_gap=0,
            carryover=True,
            gradient_function=None,
            disposal_volume=10,
            mix_strategy=MixStrategy.BEFORE,
            drop_tip_strategy=tf.DropTipStrategy.RETURN,
            blow_out_strategy=tf.BlowOutStrategy.NONE,
            touch_tip_strategy=tf.TouchTipStrategy.ALWAYS,
        ),
        pick_up_tip=tf.PickUpTipOpts(),
        mix=Mix(
            mix_before=MixOpts(repetitions=2, volume=30, rate=None),
            mix_after=MixOpts(),
        ),
        blow_out=tf.BlowOutOpts(),
        touch_tip=tf.TouchTipOpts(),
        aspirate=tf.AspirateOpts(),
        dispense=tf.DispenseOpts(),
    )
    assert transfer_options == expected_xfer_options2
    with pytest.raises(ValueError, match="air_gap.*"):
        instr.transfer(300, lw1["A1"], lw2["A1"], air_gap=300)
    with pytest.raises(ValueError, match="air_gap.*"):
        instr.transfer(300, lw1["A1"], lw2["A1"], air_gap=10000)


def test_flow_rate(ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch) -> None:
    instr = ctx.load_instrument("p300_single", Mount.RIGHT)
    old_sfm = instr._core.set_flow_rate

    def pass_on(
        aspirate: Optional[int] = None,
        dispense: Optional[int] = None,
        blow_out: Optional[int] = None,
    ) -> None:
        old_sfm(aspirate=aspirate, dispense=dispense, blow_out=blow_out)

    set_flow_rate = mock.Mock(side_effect=pass_on)
    monkeypatch.setattr(instr._core, "set_flow_rate", set_flow_rate)

    ctx.home()
    instr.flow_rate.aspirate = 1
    set_flow_rate.assert_called_once_with(aspirate=1)
    set_flow_rate.reset_mock()
    instr.flow_rate.dispense = 10
    set_flow_rate.assert_called_once_with(dispense=10)
    set_flow_rate.reset_mock()
    instr.flow_rate.blow_out = 2
    set_flow_rate.assert_called_once_with(blow_out=2)
    assert instr.flow_rate.aspirate == 1
    assert instr.flow_rate.dispense == 10
    assert instr.flow_rate.blow_out == 2


def test_pipette_speed(ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch) -> None:
    instr = ctx.load_instrument("p300_single", Mount.RIGHT)
    assert hasattr(instr._core, "set_pipette_speed")
    old_sfm = instr._core.set_pipette_speed

    def pass_on(
        aspirate: Optional[int] = None,
        dispense: Optional[int] = None,
        blow_out: Optional[int] = None,
    ) -> None:
        old_sfm(aspirate=aspirate, dispense=dispense, blow_out=blow_out)

    set_speed = mock.Mock(side_effect=pass_on)
    monkeypatch.setattr(instr._core, "set_pipette_speed", set_speed)
    ctx.home()
    instr.speed.aspirate = 1
    set_speed.assert_called_once_with(aspirate=1)
    set_speed.reset_mock()
    instr.speed.dispense = 10
    set_speed.assert_called_once_with(dispense=10)
    set_speed.reset_mock()
    instr.speed.blow_out = 2
    set_speed.assert_called_once_with(blow_out=2)
    assert instr.speed.aspirate == 1
    assert instr.speed.dispense == 10
    assert instr.speed.blow_out == 2


def test_loaded_labwares(ctx: papi.ProtocolContext) -> None:
    assert ctx.loaded_labwares == {12: ctx.fixed_trash}
    lw1 = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    lw2 = ctx.load_labware("opentrons_96_tiprack_300ul", 8)
    ctx.load_module("tempdeck", 4)
    mod2 = ctx.load_module("magdeck", 5)
    mod_lw = mod2.load_labware("biorad_96_wellplate_200ul_pcr")
    assert ctx.loaded_labwares[3] == lw1
    assert ctx.loaded_labwares[8] == lw2
    assert ctx.loaded_labwares[5] == mod_lw
    assert sorted(ctx.loaded_labwares.keys()) == sorted([3, 5, 8, 12])


def _safe_cast_to_int(value: Any) -> int:
    result = int(value)
    return result


def test_loaded_modules(ctx: papi.ProtocolContext, monkeypatch: MonkeyPatch) -> None:
    assert ctx.loaded_modules == {}
    from collections import OrderedDict

    mag1 = ctx.load_module("magnetic module gen2", 1)
    mag2 = ctx.load_module("magnetic module", 2)
    temp1 = ctx.load_module("temperature module", 3)
    temp2 = ctx.load_module("temperature module", 4)

    expected_load_order = OrderedDict(
        {
            _safe_cast_to_int(mod.geometry.parent): mod
            for mod in [mag1, mag2, temp1, temp2]
        }
    )

    assert ctx.loaded_modules == expected_load_order
    assert ctx.loaded_modules[1] == mag1
    assert ctx.loaded_modules[2] == mag2
    assert ctx.loaded_modules[3] == temp1
    assert ctx.loaded_modules[4] == temp2


def test_order_of_module_load() -> None:
    import opentrons.hardware_control as hardware_control
    import opentrons.protocol_api as protocol_api

    mods = {
        "tempdeck": [
            SimulatingModule(serial_number="111", model="temperatureModuleV1"),
            SimulatingModule(serial_number="333", model="temperatureModuleV2"),
        ],
        "thermocycler": [
            SimulatingModule(serial_number="222", model="thermocyclerModuleV2")
        ],
    }
    thread_manager = hardware_control.ThreadManager(
        hardware_control.API.build_hardware_simulator, attached_modules=mods
    )
    fake_hardware = thread_manager.sync

    attached_modules = fake_hardware.attached_modules
    hw_temp1 = attached_modules[0]
    hw_temp2 = attached_modules[1]

    ctx1 = protocol_api.create_protocol_context(
        api_version=APIVersion(2, 13),
        hardware_api=fake_hardware,
        deck_type=STANDARD_OT2_DECK,
    )

    temp1 = ctx1.load_module("tempdeck", 4)
    ctx1.load_module("thermocycler")
    temp2 = ctx1.load_module("tempdeck", 1)
    async_temp1 = temp1._core._sync_module_hardware._obj_to_adapt  # type: ignore[union-attr]
    async_temp2 = temp2._core._sync_module_hardware._obj_to_adapt  # type: ignore[union-attr]

    assert id(async_temp1) == id(hw_temp1)
    assert id(async_temp2) == id(hw_temp2)

    # Test that the order remains the same for the
    # hardware modules regardless of the slot it
    # was loaded into
    ctx2 = protocol_api.create_protocol_context(
        api_version=APIVersion(2, 13),
        hardware_api=fake_hardware,
        deck_type=STANDARD_OT2_DECK,
    )

    ctx2.load_module("thermocycler")
    temp1 = ctx2.load_module("tempdeck", 1)
    temp2 = ctx2.load_module("tempdeck", 4)

    async_temp1 = temp1._core._sync_module_hardware._obj_to_adapt  # type: ignore[union-attr]
    async_temp2 = temp2._core._sync_module_hardware._obj_to_adapt  # type: ignore[union-attr]
    assert id(async_temp1) == id(hw_temp1)
    assert id(async_temp2) == id(hw_temp2)


def test_tip_length_for_caldata(
    ctx: papi.ProtocolContext, decoy: Decoy, monkeypatch: MonkeyPatch
) -> None:
    # TODO (lc 10-27-2022) We need to investigate why the pipette id is
    # being reported as none for this test (and probably all the others)
    from opentrons.hardware_control.instruments.ot2 import (
        instrument_calibration as instr_cal,
    )
    from opentrons.calibration_storage import types as CSTypes

    instr = ctx.load_instrument("p20_single_gen2", "left")
    tip_rack = ctx.load_labware("geb_96_tiprack_10ul", "1")

    mock_load_tip_length = decoy.mock(func=instr_cal.load_tip_length_for_pipette)
    monkeypatch.setattr(instr_cal, "load_tip_length_for_pipette", mock_load_tip_length)

    decoy.when(mock_load_tip_length(None, tip_rack._core.get_definition())).then_return(  # type: ignore[arg-type]
        instr_cal.TipLengthCalibration(
            tip_length=2,
            last_modified=utc_now(),
            source=cs_types.SourceType.user,
            status=CSTypes.CalibrationStatus(markedBad=False),
            uri=LabwareUri("opentrons/geb_96_tiprack_10ul/1"),
            tiprack="somehash",
            pipette=None,  # type: ignore[arg-type]
        )
    )

    assert (
        instrument_support.tip_length_for(
            pipette=instr.hw_pipette,
            tip_rack_definition=tip_rack._core.get_definition(),
        )
        == 2
    )

    decoy.when(mock_load_tip_length(None, tip_rack._core.get_definition())).then_raise(  # type: ignore[arg-type]
        cs_types.TipLengthCalNotFound("oh no")
    )

    assert instrument_support.tip_length_for(
        pipette=instr.hw_pipette,
        tip_rack_definition=tip_rack._core.get_definition(),
    ) == (
        tip_rack._core.get_definition()["parameters"]["tipLength"]
        - instr.hw_pipette["tip_overlap"]["opentrons/geb_96_tiprack_10ul/1"]
    )


def test_bundled_labware(
    get_labware_fixture: Callable[[str], LabwareDefinition],
    hardware: ThreadManagedHardware,
) -> None:
    fixture_96_plate = get_labware_fixture("fixture_96_plate")
    bundled_labware = {"fixture/fixture_96_plate/1": fixture_96_plate}

    ctx = papi.create_protocol_context(
        api_version=APIVersion(2, 13),
        hardware_api=hardware,
        deck_type=STANDARD_OT2_DECK,
        bundled_labware=bundled_labware,
    )

    lw1 = ctx.load_labware("fixture_96_plate", 3, namespace="fixture")
    assert ctx.loaded_labwares[3] == lw1
    assert ctx.loaded_labwares[3]._core.get_definition() == fixture_96_plate


def test_bundled_labware_missing(
    get_labware_fixture: Callable[[str], LabwareDefinition],
    hardware: ThreadManagedHardware,
) -> None:
    bundled_labware: Dict[str, Any] = {}
    with pytest.raises(
        RuntimeError, match="No labware found in bundle with load name fixture_96_plate"
    ):
        ctx = papi.create_protocol_context(
            api_version=APIVersion(2, 13),
            hardware_api=hardware,
            deck_type=STANDARD_OT2_DECK,
            bundled_labware=bundled_labware,
        )
        ctx.load_labware("fixture_96_plate", 3, namespace="fixture")

    fixture_96_plate = get_labware_fixture("fixture_96_plate")
    bundled_labware = {"fixture/fixture_96_plate/1": fixture_96_plate}
    with pytest.raises(
        RuntimeError, match="No labware found in bundle with load name fixture_96_plate"
    ):
        ctx = papi.create_protocol_context(
            api_version=APIVersion(2, 13),
            hardware_api=hardware,
            deck_type=STANDARD_OT2_DECK,
            bundled_labware={},
            extra_labware=bundled_labware,
        )
        ctx.load_labware("fixture_96_plate", 3, namespace="fixture")


def test_bundled_data(
    hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    bundled_data = {"foo": b"1,2,3"}
    ctx = papi.create_protocol_context(
        api_version=APIVersion(2, 13),
        hardware_api=hardware,
        deck_type=deck_definition_name,
        bundled_data=bundled_data,
    )

    assert ctx.bundled_data == bundled_data


def test_extra_labware(
    get_labware_fixture: Callable[[str], LabwareDefinition],
    hardware: ThreadManagedHardware,
    deck_definition_name: str,
) -> None:
    fixture_96_plate = get_labware_fixture("fixture_96_plate")
    bundled_labware = {"fixture/fixture_96_plate/1": fixture_96_plate}
    ctx = papi.create_protocol_context(
        api_version=APIVersion(2, 13),
        hardware_api=hardware,
        deck_type=deck_definition_name,
        extra_labware=bundled_labware,
    )

    ls1 = ctx.load_labware("fixture_96_plate", 3, namespace="fixture")
    assert ctx.loaded_labwares[3] == ls1
    assert ctx.loaded_labwares[3]._core.get_definition() == fixture_96_plate


def test_api_version_checking(
    hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    minor_over = APIVersion(
        papi.MAX_SUPPORTED_VERSION.major,
        papi.MAX_SUPPORTED_VERSION.minor + 1,
    )
    with pytest.raises(ValueError):
        papi.create_protocol_context(
            api_version=minor_over,
            hardware_api=hardware,
            deck_type=deck_definition_name,
        )

    major_over = APIVersion(
        papi.MAX_SUPPORTED_VERSION.major + 1,
        papi.MAX_SUPPORTED_VERSION.minor,
    )
    with pytest.raises(ValueError):
        papi.create_protocol_context(
            api_version=major_over,
            hardware_api=hardware,
            deck_type=deck_definition_name,
        )


def test_api_per_call_checking(
    monkeypatch: MonkeyPatch, hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    ctx = papi.create_protocol_context(
        api_version=APIVersion(1, 9),
        hardware_api=hardware,
        deck_type=deck_definition_name,
    )

    assert ctx.deck  # 1.9 < 2.0, but api version 1 is excepted from checking

    ctx = papi.create_protocol_context(
        api_version=APIVersion(2, 1),
        hardware_api=hardware,
        deck_type=deck_definition_name,
    )
    # versions > 2.0 are ok
    assert ctx.deck
    # set_rail_lights() was added in 2.5
    with pytest.raises(papi_support.util.APIVersionError):
        ctx.set_rail_lights(on=True)


def test_home_plunger(
    monkeypatch: MonkeyPatch, hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    ctx = papi.create_protocol_context(
        api_version=APIVersion(2, 0),
        hardware_api=hardware,
        deck_type=deck_definition_name,
    )
    ctx.home()
    instr = ctx.load_instrument("p1000_single", "left")
    instr.home_plunger()


def test_move_to_with_thermocycler(
    ctx: papi.ProtocolContext,
) -> None:
    """Test move_to raises for unsafe moves with thermocycler."""

    def raiser(*args: Any, **kwargs: Any) -> None:
        raise RuntimeError("Cannot")

    mod = ctx.load_module("thermocycler")

    assert isinstance(mod, ThermocyclerContext)
    mod._core.flag_unsafe_move = mock.MagicMock(side_effect=raiser)  # type: ignore[attr-defined]
    instr = ctx.load_instrument("p1000_single", "left")
    with pytest.raises(RuntimeError, match="Cannot"):
        instr.move_to(Location(Point(0, 0, 0), None))
    mod._core.flag_unsafe_move.assert_called_once_with(  # type: ignore[attr-defined]  # type: ignore[attr-defined]
        to_loc=Location(Point(0, 0, 0), None), from_loc=Location(Point(0, 0, 0), None)
    )


def test_move_to_with_heater_shaker(
    ctx: papi.ProtocolContext,
    hardware: ThreadManagedHardware,
) -> None:
    """Test move_to raises for unsafe moves with heater-shaker."""

    def raiser(*args: Any, **kwargs: Any) -> None:
        raise RuntimeError("Cannot")

    mod = ctx.load_module("heaterShakerModuleV1", 1)

    assert isinstance(mod, HeaterShakerContext)
    mod._core.flag_unsafe_move = mock.MagicMock(side_effect=raiser)  # type: ignore[attr-defined]

    instr = ctx.load_instrument("p300_multi", "left")
    with pytest.raises(RuntimeError, match="Cannot"):
        instr.move_to(Location(Point(0, 0, 0), None))
    mod._core.flag_unsafe_move.assert_called_once_with(  # type: ignore[attr-defined]
        to_loc=Location(Point(0, 0, 0), None),
        is_multichannel=True,
    )
