""" Test the Transfer class and its functions """
import pytest
from typing import TypedDict

from opentrons.types import Mount, TransferTipPolicy
from opentrons.protocols.advanced_control.transfers import transfer as tx
from opentrons.protocols.advanced_control.common import MixStrategy
from opentrons.protocols.api_support.types import APIVersion
from opentrons.hardware_control import ThreadManagedHardware
from opentrons.protocol_api.protocol_context import ProtocolContext
from opentrons.protocol_api.instrument_context import InstrumentContext
from opentrons.protocol_api.labware import Labware

import opentrons.protocol_api as papi

# TODO (lc 12-8-2022) We need to re-write these transfer tests so that
# they are agnostic to the underlying hardware.
pytestmark = pytest.mark.ot2_only


class InstrLabware(TypedDict):
    ctx: ProtocolContext
    instr: InstrumentContext
    lw1: Labware
    lw2: Labware
    tiprack: Labware
    instr_multi: InstrumentContext


@pytest.fixture
def _instr_labware(ctx: ProtocolContext) -> InstrLabware:
    lw1 = ctx.load_labware("biorad_96_wellplate_200ul_pcr", 1)
    lw2 = ctx.load_labware("corning_96_wellplate_360ul_flat", 2)
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    tiprack2 = ctx.load_labware("opentrons_96_tiprack_300ul", 4)
    instr = ctx.load_instrument("p300_single", Mount.RIGHT, tip_racks=[tiprack])
    instr_multi = ctx.load_instrument("p300_multi", Mount.LEFT, tip_racks=[tiprack2])

    return {
        "ctx": ctx,
        "instr": instr,
        "lw1": lw1,
        "lw2": lw2,
        "tiprack": tiprack,
        "instr_multi": instr_multi,
    }


# +++++++ Test Helper Functions ++++++++++
def test_check_if_zero() -> None:
    tclass = tx.TransferPlan
    assert tclass._check_volume_not_zero(APIVersion(2, 6), 0)
    assert tclass._check_volume_not_zero(APIVersion(2, 6), 15)
    assert not tclass._check_volume_not_zero(APIVersion(2, 8), 0)
    assert tclass._check_volume_not_zero(APIVersion(2, 8), 15)


# +++++++ Test transfer types ++++++++++++
def test_default_transfers(_instr_labware: InstrLabware) -> None:
    # Transfer 100ml from row1 of labware1 to row1 of labware2: first with
    #  new_tip = ONCE, then with new_tip = NEVER
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    # ========== Transfer ===========
    xfer_plan = tx.TransferPlan(
        100,
        lw1.columns()[0],
        lw2.columns()[0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][4], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][4], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][5], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][5], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][6], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][6], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][7], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][7], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1

    # ========== Distribute ===========
    dist_plan = tx.TransferPlan(
        50,
        lw1.columns()[0][0],
        lw2.columns()[0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="distribute",
    )
    dist_plan_list = []
    for step in dist_plan:
        dist_plan_list.append(step)
    exp2 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [300, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [50, lw2.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [50, lw2.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [50, lw2.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [50, lw2.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [50, lw2.columns()[0][4], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [50, lw2.columns()[0][5], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [50, lw2.columns()[0][6], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [50, lw2.columns()[0][7], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert dist_plan_list == exp2

    # ========== Consolidate ===========
    consd_plan = tx.TransferPlan(
        50,
        lw1.columns()[0],
        lw2.columns()[0][0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="consolidate",
    )
    consd_plan_list = []
    for step in consd_plan:
        consd_plan_list.append(step)
    exp3 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [50, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [50, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [50, lw1.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [50, lw1.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [50, lw1.columns()[0][4], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [50, lw1.columns()[0][5], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [300, lw2.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [50, lw1.columns()[0][6], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [50, lw1.columns()[0][7], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert consd_plan_list == exp3


def test_uneven_transfers(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(new_tip=TransferTipPolicy.NEVER)
    )

    # ========== One-to-Many ==========
    xfer_plan = tx.TransferPlan(
        100,
        lw1.columns()[0][0],
        lw2.columns()[1][:4],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    one_to_many_plan_list = []
    for step in xfer_plan:
        one_to_many_plan_list.append(step)
    exp1 = [
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[1][1], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[1][2], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[1][3], 1.0], "kwargs": {}},
    ]
    assert one_to_many_plan_list == exp1

    # ========== Few-to-Many ==========
    xfer_plan = tx.TransferPlan(
        [100, 90, 80, 70],
        lw1.columns()[0][:2],
        lw2.columns()[1][:4],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    few_to_many_plan_list = []
    for step in xfer_plan:
        few_to_many_plan_list.append(step)
    exp2 = [
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [90, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [90, lw2.columns()[1][1], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [80, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [80, lw2.columns()[1][2], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [70, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [70, lw2.columns()[1][3], 1.0], "kwargs": {}},
    ]
    assert few_to_many_plan_list == exp2

    # ========== Many-to-One ==========
    xfer_plan = tx.TransferPlan(
        [100, 90, 80, 70],
        lw1.columns()[0][:4],
        lw2.columns()[1][0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    many_to_one_plan_list = []
    for step in xfer_plan:
        many_to_one_plan_list.append(step)
    exp3 = [
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [90, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [90, lw2.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [80, lw1.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [80, lw2.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [70, lw1.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [70, lw2.columns()[1][0], 1.0], "kwargs": {}},
    ]
    assert many_to_one_plan_list == exp3


def test_location_wells(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    aspirate_loc = lw1.wells()[0].top()
    # Test single-channel transfer with locations
    list_of_locs = [well.bottom(5) for col in lw2.columns()[0:11] for well in col]

    xfer_plan = tx.TransferPlan(
        30,
        aspirate_loc,
        list_of_locs,
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
    )
    idx_dest = 0
    for step in xfer_plan:
        if step["method"] == "aspirate":
            assert isinstance(step["args"], list)
            assert step["args"][1].point == aspirate_loc.point
        elif step["method"] == "dispense":
            assert isinstance(step["args"], list)
            assert step["args"][1].point == list_of_locs[idx_dest].point
            idx_dest += 1

    multi_locs = [col[0].bottom(5) for col in lw2.columns()[0:11]]
    # Test multi-channel transfer with locations
    xfer_plan = tx.TransferPlan(
        30,
        aspirate_loc,
        multi_locs,
        _instr_labware["instr_multi"],
        max_volume=_instr_labware["instr_multi"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
    )

    idx_dest = 0
    for step in xfer_plan:
        if step["method"] == "aspirate":
            assert isinstance(step["args"], list)
            assert step["args"][1].point == aspirate_loc.point
        elif step["method"] == "dispense":
            assert isinstance(step["args"], list)
            assert step["args"][1].point == multi_locs[idx_dest].point
            idx_dest += 1


def test_no_new_tip(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(new_tip=TransferTipPolicy.NEVER)
    )
    # ========== Transfer ==========
    xfer_plan = tx.TransferPlan(
        100,
        lw1.columns()[0],
        lw2.columns()[0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    for step in xfer_plan:
        assert step["method"] != "pick_up_tip"
        assert step["method"] != "drop_tip"

    # ========== Distribute ===========
    dist_plan = tx.TransferPlan(
        30,
        lw1.columns()[0][0],
        lw2.columns()[0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="distribute",
        options=options,
    )
    for step in dist_plan:
        assert step["method"] != "pick_up_tip"
        assert step["method"] != "drop_tip"

    # ========== Consolidate ===========
    consd_plan = tx.TransferPlan(
        40,
        lw1.columns()[0],
        lw2.rows()[0][1],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    for step in consd_plan:
        assert step["method"] != "pick_up_tip"
        assert step["method"] != "drop_tip"


def test_new_tip_always(
    _instr_labware: InstrLabware, monkeypatch: pytest.MonkeyPatch
) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    tiprack = _instr_labware["tiprack"]
    i_ctx = _instr_labware["instr"]

    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            new_tip=TransferTipPolicy.ALWAYS, drop_tip_strategy=tx.DropTipStrategy.TRASH
        )
    )

    xfer_plan = tx.TransferPlan(
        100,
        lw1.columns()[0][1:5],
        lw2.columns()[0][1:5],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][4], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.columns()[0][4], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1
    for cmd in xfer_plan_list:
        getattr(i_ctx, cmd["method"])(*cmd["args"], **cmd["kwargs"])
    assert tiprack.next_tip() == tiprack.columns()[0][4]


def test_transfer_w_touchtip_blowout(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    assert hasattr(_instr_labware["instr"].trash_container, "wells")

    # ========== Transfer ==========
    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            touch_tip_strategy=tx.TouchTipStrategy.ALWAYS,
            blow_out_strategy=tx.BlowOutStrategy.TRASH,
            new_tip=TransferTipPolicy.NEVER,
        )
    )

    xfer_plan = tx.TransferPlan(
        100,
        lw1.columns()[0][:3],
        lw2.rows()[0][:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "aspirate", "args": [100, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.rows()[0][0], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {
            "method": "blow_out",
            "args": [_instr_labware["instr"].trash_container.wells()[0]],
            "kwargs": {},
        },
        {"method": "aspirate", "args": [100, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.rows()[0][1], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {
            "method": "blow_out",
            "args": [_instr_labware["instr"].trash_container.wells()[0]],
            "kwargs": {},
        },
        {"method": "aspirate", "args": [100, lw1.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.rows()[0][2], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {
            "method": "blow_out",
            "args": [_instr_labware["instr"].trash_container.wells()[0]],
            "kwargs": {},
        },
    ]
    assert xfer_plan_list == exp1

    # ========== Distribute ==========
    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            disposal_volume=_instr_labware["instr"].min_volume,
            touch_tip_strategy=tx.TouchTipStrategy.ALWAYS,
            new_tip=TransferTipPolicy.NEVER,
        )
    )

    dist_plan = tx.TransferPlan(
        30,
        lw1.columns()[0][0],
        lw2.rows()[0][:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="distribute",
        options=options,
    )
    dist_plan_list = []
    for step in dist_plan:
        dist_plan_list.append(step)
    exp2 = [
        {"method": "aspirate", "args": [120, lw1.columns()[0][0], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2.rows()[0][0], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2.rows()[0][1], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2.rows()[0][2], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {
            "method": "blow_out",
            "args": [_instr_labware["instr"].trash_container.wells()[0]],
            "kwargs": {},
        },
    ]
    assert dist_plan_list == exp2


def test_transfer_w_airgap_blowout(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            air_gap=10,
            blow_out_strategy=tx.BlowOutStrategy.DEST,
            new_tip=TransferTipPolicy.NEVER,
        )
    )

    # ========== Transfer ==========
    xfer_plan = tx.TransferPlan(
        100,
        lw1.columns()[0][1:5],
        lw2.rows()[0][1:5],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "aspirate", "args": [100, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [110, lw2.rows()[0][1], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2.rows()[0][1]], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [110, lw2.rows()[0][2], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2.rows()[0][2]], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [110, lw2.rows()[0][3], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2.rows()[0][3]], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][4], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [110, lw2.rows()[0][4], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2.rows()[0][4]], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1

    # ========== Distribute ==========
    dist_plan = tx.TransferPlan(
        60,
        lw1.columns()[1][0],
        lw2.rows()[1][1:6],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="distribute",
        options=options,
    )
    dist_plan_list = []
    for step in dist_plan:
        dist_plan_list.append(step)
    exp2 = [
        {"method": "aspirate", "args": [240, lw1.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [70, lw2.rows()[1][1], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [70, lw2.rows()[1][2], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [70, lw2.rows()[1][3], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [70, lw2.rows()[1][4], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2.rows()[1][4]], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [70, lw2.rows()[1][5], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2.rows()[1][5]], "kwargs": {}},
    ]
    assert dist_plan_list == exp2

    # ========== Consolidate ==========
    consd_plan = tx.TransferPlan(
        60,
        lw1.columns()[1],
        lw2.rows()[1][1],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="consolidate",
        options=options,
    )
    consd_plan_list = []
    for step in consd_plan:
        consd_plan_list.append(step)
    exp3 = [
        {"method": "aspirate", "args": [60, lw1.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][1], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][2], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][3], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [280, lw2.rows()[1][1], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2.rows()[1][1]], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][4], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][5], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][6], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][7], 1.0], "kwargs": {}},
        {"method": "air_gap", "args": [10], "kwargs": {}},
        {"method": "dispense", "args": [280, lw2.rows()[1][1], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2.rows()[1][1]], "kwargs": {}},
    ]
    assert consd_plan_list == exp3


def test_touchtip_mix(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            new_tip=TransferTipPolicy.NEVER,
            touch_tip_strategy=tx.TouchTipStrategy.ALWAYS,
            mix_strategy=MixStrategy.AFTER,
        )
    )

    # ========== Transfer ==========
    xfer_plan = tx.TransferPlan(
        100,
        lw1.columns()[0][1:5],
        lw2.rows()[0][1:5],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "aspirate", "args": [100, lw1.columns()[0][1], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.rows()[0][1], 1.0], "kwargs": {}},
        {"method": "mix", "args": [], "kwargs": {"location": lw2.rows()[0][1]}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][2], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.rows()[0][2], 1.0], "kwargs": {}},
        {"method": "mix", "args": [], "kwargs": {"location": lw2.rows()[0][2]}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][3], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.rows()[0][3], 1.0], "kwargs": {}},
        {"method": "mix", "args": [], "kwargs": {"location": lw2.rows()[0][3]}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][4], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2.rows()[0][4], 1.0], "kwargs": {}},
        {"method": "mix", "args": [], "kwargs": {"location": lw2.rows()[0][4]}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1

    # ========== Distribute ==========
    dist_plan = tx.TransferPlan(
        60,
        lw1.columns()[1][0],
        lw2.rows()[1][1:6],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="distribute",
        options=options,
    )
    dist_plan_list = []
    for step in dist_plan:
        dist_plan_list.append(step)
    exp2 = [
        {"method": "aspirate", "args": [300, lw1.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [60, lw2.rows()[1][1], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [60, lw2.rows()[1][2], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [60, lw2.rows()[1][3], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [60, lw2.rows()[1][4], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [60, lw2.rows()[1][5], 1.0], "kwargs": {}},
        {"method": "mix", "args": [], "kwargs": {"location": lw2.rows()[1][5]}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
    ]

    assert dist_plan_list == exp2

    # ========== Consolidate ==========
    consd_plan = tx.TransferPlan(
        60,
        lw1.columns()[1],
        lw2.rows()[1][1],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="consolidate",
        options=options,
    )
    consd_plan_list = []
    for step in consd_plan:
        consd_plan_list.append(step)
    exp3 = [
        {"method": "aspirate", "args": [60, lw1.columns()[1][0], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][1], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][2], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][3], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][4], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [300, lw2.rows()[1][1], 1.0], "kwargs": {}},
        {"method": "mix", "args": [], "kwargs": {"location": lw2.rows()[1][1]}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][5], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][6], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [60, lw1.columns()[1][7], 1.0], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
        {"method": "dispense", "args": [180, lw2.rows()[1][1], 1.0], "kwargs": {}},
        {"method": "mix", "args": [], "kwargs": {"location": lw2.rows()[1][1]}},
        {"method": "touch_tip", "args": [], "kwargs": {}},
    ]
    assert consd_plan_list == exp3


def test_all_options(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            new_tip=TransferTipPolicy.ONCE,
            drop_tip_strategy=tx.DropTipStrategy.RETURN,
            touch_tip_strategy=tx.TouchTipStrategy.ALWAYS,
            mix_strategy=MixStrategy.AFTER,
        ),
        pick_up_tip=options.pick_up_tip._replace(presses=4, increment=2),
        touch_tip=options.touch_tip._replace(speed=1.6),
        mix=options.mix._replace(
            mix_after=options.mix.mix_after._replace(repetitions=2)
        ),
        blow_out=options.blow_out._replace(location=lw2.columns()[10][0]),
        aspirate=options.aspirate._replace(rate=1.5),
    )

    xfer_plan = tx.TransferPlan(
        100,
        lw1.columns()[0][1:4],
        lw2.rows()[0][1:4],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
        options=options,
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {"presses": 4, "increment": 2}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][1], 1.5], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {"speed": 1.6}},
        {"method": "dispense", "args": [100, lw2.rows()[0][1], 1.0], "kwargs": {}},
        {
            "method": "mix",
            "args": [],
            "kwargs": {"repetitions": 2, "location": lw2.rows()[0][1]},
        },
        {"method": "touch_tip", "args": [], "kwargs": {"speed": 1.6}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][2], 1.5], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {"speed": 1.6}},
        {"method": "dispense", "args": [100, lw2.rows()[0][2], 1.0], "kwargs": {}},
        {
            "method": "mix",
            "args": [],
            "kwargs": {"repetitions": 2, "location": lw2.rows()[0][2]},
        },
        {"method": "touch_tip", "args": [], "kwargs": {"speed": 1.6}},
        {"method": "aspirate", "args": [100, lw1.columns()[0][3], 1.5], "kwargs": {}},
        {"method": "touch_tip", "args": [], "kwargs": {"speed": 1.6}},
        {"method": "dispense", "args": [100, lw2.rows()[0][3], 1.0], "kwargs": {}},
        {
            "method": "mix",
            "args": [],
            "kwargs": {"repetitions": 2, "location": lw2.rows()[0][3]},
        },
        {"method": "touch_tip", "args": [], "kwargs": {"speed": 1.6}},
        {"method": "return_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1


def test_invalid_air_gap_disposal_sum_distribute(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    # Supply the disposal volume assessment with the instrument followed by a disposal value equal to the max volume

    options = tx.TransferOptions(
        transfer=tx.Transfer(
            disposal_volume=_instr_labware["instr"].max_volume / 2,
            air_gap=_instr_labware["instr"].max_volume / 2,
        )
    )
    with pytest.raises(ValueError):
        plan = tx.TransferPlan(
            700,
            lw1.columns()[0][0],
            lw2.rows()[0][1:3],
            _instr_labware["instr"],
            max_volume=_instr_labware["instr"].hw_pipette["max_volume"],
            api_version=_instr_labware["ctx"].api_version,
            mode="distribute",
            options=options,
        )
        # Exhaust the iterator in case it raises the expected exception lazily.
        list(plan)


def test_invalid_air_gap_distribute(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    # Supply the disposal volume assessment with the instrument followed by a disposal value equal to the max volume

    options = tx.TransferOptions(
        transfer=tx.Transfer(air_gap=_instr_labware["instr"].max_volume)
    )
    with pytest.raises(ValueError):
        plan = tx.TransferPlan(
            700,
            lw1.columns()[0][0],
            lw2.rows()[0][1:3],
            _instr_labware["instr"],
            max_volume=_instr_labware["instr"].hw_pipette["max_volume"],
            api_version=_instr_labware["ctx"].api_version,
            mode="distribute",
            options=options,
        )
        # Exhaust the iterator in case it raises the expected exception lazily.
        list(plan)


def test_invalid_disposal_volume_distribute(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    # Supply the disposal volume assessment with the instrument followed by a disposal value equal to the max volume

    options = tx.TransferOptions(
        transfer=tx.Transfer(disposal_volume=_instr_labware["instr"].max_volume)
    )
    with pytest.raises(ValueError):
        plan = tx.TransferPlan(
            700,
            lw1.columns()[0][0],
            lw2.rows()[0][1:3],
            _instr_labware["instr"],
            max_volume=_instr_labware["instr"].hw_pipette["max_volume"],
            api_version=_instr_labware["ctx"].api_version,
            mode="distribute",
            options=options,
        )
        # Exhaust the iterator in case it raises the expected exception lazily.
        list(plan)


def test_oversized_distribute(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    xfer_plan = tx.TransferPlan(
        700,
        lw1.columns()[0][0],
        lw2.rows()[0][1:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="distribute",
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {
            "method": "aspirate",
            "args": [300, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [300, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [300, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [300, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1


def test_oversized_consolidate(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    xfer_plan = tx.TransferPlan(
        700,
        lw2.rows()[0][1:3],
        lw1.wells_by_index()["A1"],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="consolidate",
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {
            "method": "aspirate",
            "args": [300, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [300, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [300, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [300, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw1.wells_by_index()["A1"], 1.0],
            "kwargs": {},
        },
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1


def test_oversized_transfer(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]

    xfer_plan = tx.TransferPlan(
        700,
        lw2.rows()[0][1:3],
        lw1.columns()[0][1:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=_instr_labware["ctx"].api_version,
        mode="transfer",
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {
            "method": "aspirate",
            "args": [300, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [300, lw1.wells_by_index()["B1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw1.wells_by_index()["B1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw1.wells_by_index()["B1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [300, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [300, lw1.wells_by_index()["C1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw1.wells_by_index()["C1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "aspirate",
            "args": [200, lw2.wells_by_index()["A3"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [200, lw1.wells_by_index()["C1"], 1.0],
            "kwargs": {},
        },
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1


def test_multichannel_transfer_old_version(
    hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    # for API version below 2.2, multichannel pipette can only
    # reach row A of 384-well plates
    ctx = papi.create_protocol_context(
        api_version=APIVersion(2, 1),
        hardware_api=hardware,
        deck_type=deck_definition_name,
    )

    lw1 = ctx.load_labware("biorad_96_wellplate_200ul_pcr", 1)
    lw2 = ctx.load_labware("corning_384_wellplate_112ul_flat", 2)
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    instr_multi = ctx.load_instrument("p300_multi", Mount.LEFT, tip_racks=[tiprack])

    xfer_plan = tx.TransferPlan(
        100,
        lw1.rows()[0][0],
        [lw2.rows()[0][1], lw2.rows()[1][1]],
        instr_multi,
        max_volume=instr_multi.hw_pipette["working_volume"],
        api_version=ctx.api_version,
        mode="distribute",
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {
            "method": "aspirate",
            "args": [100, lw1.wells_by_name()["A1"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [100, lw2.wells_by_index()["A2"], 1.0],
            "kwargs": {},
        },
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1

    # target without row limit
    with pytest.raises(IndexError):
        xfer_plan = tx.TransferPlan(
            100,
            lw1.rows()[0][1],
            lw2.rows()[1][1],
            instr_multi,
            max_volume=instr_multi.hw_pipette["working_volume"],
            api_version=ctx.api_version,
            # todo(mm, 2021-03-17): This test intends to test mode='transfer',
            # but it's always accidentally tested mode='consolidate' because of
            # a quirk in how TransferPlan used to guess the mode when not
            # explicitly specified. If this is changed to mode='transfer' now,
            # it raises ZeroDivisionError instead of IndexError. Bug #7516.
            mode="consolidate",
        )
        xfer_plan_list = []
        for step in xfer_plan:
            xfer_plan_list.append(step)


def test_multichannel_transfer_locs(
    hardware: ThreadManagedHardware, deck_definition_name: str
) -> None:
    ctx = papi.create_protocol_context(
        api_version=APIVersion(2, 2),
        hardware_api=hardware,
        deck_type=deck_definition_name,
    )

    lw1 = ctx.load_labware("biorad_96_wellplate_200ul_pcr", 1)
    lw2 = ctx.load_labware("corning_384_wellplate_112ul_flat", 2)
    tiprack = ctx.load_labware("opentrons_96_tiprack_300ul", 3)
    instr_multi = ctx.load_instrument("p300_multi", Mount.LEFT, tip_racks=[tiprack])

    # targets within row limit
    xfer_plan = tx.TransferPlan(
        100,
        lw1.rows()[0][1],
        lw2.rows()[1][1],
        instr_multi,
        max_volume=instr_multi.hw_pipette["working_volume"],
        api_version=ctx.api_version,
        mode="transfer",
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    exp1 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {
            "method": "aspirate",
            "args": [100, lw1.wells_by_name()["A2"], 1.0],
            "kwargs": {},
        },
        {
            "method": "dispense",
            "args": [100, lw2.wells_by_index()["B2"], 1.0],
            "kwargs": {},
        },
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    assert xfer_plan_list == exp1

    # targets outside of row limit will be skipped
    xfer_plan = tx.TransferPlan(
        100,
        lw1.rows()[0][1],
        [lw2.rows()[1][1], lw2.rows()[2][1]],
        instr_multi,
        max_volume=instr_multi.hw_pipette["working_volume"],
        api_version=ctx.api_version,
        mode="transfer",
    )
    xfer_plan_list = []
    for step in xfer_plan:
        xfer_plan_list.append(step)
    assert xfer_plan_list == exp1

    # no valid source or targets, raise error
    with pytest.raises(RuntimeError):
        assert tx.TransferPlan(
            100,
            lw1.rows()[0][1],
            lw2.rows()[2][1],
            instr_multi,
            max_volume=instr_multi.hw_pipette["working_volume"],
            api_version=ctx.api_version,
            mode="transfer",
        )


def test_zero_volume_results_in_no_transfer(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    API_VERSION = _instr_labware["ctx"].api_version

    exp_no_vol = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]

    # ========== Transfer ===========
    xfer_plan = tx.TransferPlan(
        0,
        lw1.columns()[0],
        lw2.columns()[0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="transfer",
    )
    for step, expected in zip(xfer_plan, exp_no_vol):
        assert step == expected

    xfer_plan = tx.TransferPlan(
        [100, 0, 200],
        lw1.wells()[0:3],
        lw2.wells()[0:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="transfer",
    )
    exp2 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [200, lw1["C1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [200, lw2["C1"], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step2, expected2 in zip(xfer_plan, exp2):
        assert step2 == expected2

    # ========== Distribute ===========
    dist_plan = tx.TransferPlan(
        0,
        lw1.columns()[0][0],
        lw2.rows()[0][1:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="distribute",
    )
    for step, expected in zip(dist_plan, exp_no_vol):
        assert step == expected

    dist_plan = tx.TransferPlan(
        [100, 0],
        lw1.columns()[0][0],
        lw2.rows()[0][1:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="distribute",
    )
    exp3 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2["A2"], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step2, expected2 in zip(dist_plan, exp3):
        assert step2 == expected2

    # ========== Consolidate ===========
    consd_plan = tx.TransferPlan(
        0,
        lw1.columns()[0],
        lw2.columns()[0][0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="consolidate",
    )
    for step, expected in zip(consd_plan, exp_no_vol):
        assert step == expected

    cons_list = [100, 200, 300, 200, 0, 0, 100, 200]
    consd_plan = tx.TransferPlan(
        cons_list,
        lw1.columns()[0],
        lw2.columns()[0][0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="consolidate",
    )
    exp4 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [200, lw1["B1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [300, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [300, lw1["C1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [300, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [200, lw1["D1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1["G1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [300, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [200, lw1["H1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [200, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step2, expected2 in zip(consd_plan, exp4):
        assert step2 == expected2


def test_zero_volume_causes_transfer_of_disposal_vol(
    _instr_labware: InstrLabware,
) -> None:
    # This test checks the old behavior of distribute and consolidate
    # with zero volumes in which case the volume aspirated/dispensed
    # was the min volume + disposal volume if a zero volume was
    # specified.
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    API_VERSION = APIVersion(2, 6)
    assert isinstance(_instr_labware["instr"].trash_container, Labware)
    blow_out = _instr_labware["instr"].trash_container.wells()[0]

    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            disposal_volume=_instr_labware["instr"].min_volume
        )
    )

    # ========== Distribute ===========
    dist_plan = tx.TransferPlan(
        0,
        lw1.columns()[0][0],
        lw2.rows()[0][1:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="distribute",
        options=options,
    )

    exp_no_vol = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [30, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [0, lw2["A2"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [0, lw2["A3"], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [blow_out], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step, expected in zip(dist_plan, exp_no_vol):
        assert step == expected

    dist_plan = tx.TransferPlan(
        [100, 0],
        lw1.columns()[0][0],
        lw2.rows()[0][1:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="distribute",
        options=options,
    )
    exp = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [130, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [100, lw2["A2"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [0, lw2["A3"], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [blow_out], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step, expected in zip(dist_plan, exp):
        assert step == expected

    # ========== Consolidate ===========
    consd_plan = tx.TransferPlan(
        0,
        lw1.columns()[0],
        lw2.columns()[0][0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="consolidate",
    )

    exp_no_vol = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["B1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["C1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["D1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["E1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["F1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["G1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["H1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [0, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step, expected in zip(consd_plan, exp_no_vol):
        assert step == expected

    cons_list = [100, 200, 300, 200, 0, 0, 100, 200]
    consd_plan = tx.TransferPlan(
        cons_list,
        lw1.columns()[0],
        lw2.columns()[0][0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="consolidate",
    )
    exp2 = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [200, lw1["B1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [300, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [300, lw1["C1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [300, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [200, lw1["D1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["E1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [0, lw1["F1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [100, lw1["G1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [300, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [200, lw1["H1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [200, lw2["A1"], 1.0], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step, expected in zip(consd_plan, exp2):
        assert step == expected


def test_blowout_to_source(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    API_VERSION = APIVersion(2, 6)

    # ========== Transfer ===========
    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            disposal_volume=_instr_labware["instr"].min_volume,
            blow_out_strategy=tx.BlowOutStrategy.SOURCE,
        )
    )

    xfer_plan = tx.TransferPlan(
        30,
        [lw1["A1"], lw1["A2"]],
        [lw2["B1"], lw2["B2"]],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="transfer",
        options=options,
    )

    exp = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [30, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2["B1"], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw1["A1"]], "kwargs": {}},
        {"method": "aspirate", "args": [30, lw1["A2"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2["B2"], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw1["A2"]], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step, expected in zip(xfer_plan, exp):
        assert step == expected

    # ========== Distribute ===========
    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            disposal_volume=_instr_labware["instr"].min_volume,
            blow_out_strategy=tx.BlowOutStrategy.SOURCE,
        )
    )

    dist_plan = tx.TransferPlan(
        30,
        lw1.columns()[0][0],
        lw2.rows()[0][1:3],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="distribute",
        options=options,
    )

    exp = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [90, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2["A2"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2["A3"], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw1["A1"]], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step, expected in zip(dist_plan, exp):
        assert step == expected


def test_blowout_to_dest(_instr_labware: InstrLabware) -> None:
    _instr_labware["ctx"].home()
    lw1 = _instr_labware["lw1"]
    lw2 = _instr_labware["lw2"]
    API_VERSION = APIVersion(2, 6)

    # ========== Transfer ===========
    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(
            disposal_volume=_instr_labware["instr"].min_volume,
            blow_out_strategy=tx.BlowOutStrategy.DEST,
        )
    )

    xfer_plan = tx.TransferPlan(
        30,
        [lw1["A1"], lw1["A2"]],
        [lw2["B1"], lw2["B2"]],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="transfer",
        options=options,
    )

    exp = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [30, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2["B1"], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2["B1"]], "kwargs": {}},
        {"method": "aspirate", "args": [30, lw1["A2"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [30, lw2["B2"], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw2["B2"]], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step, expected in zip(xfer_plan, exp):
        assert step == expected

    # ========== Consolidate ===========
    options = tx.TransferOptions()
    options = options._replace(
        transfer=options.transfer._replace(blow_out_strategy=tx.BlowOutStrategy.DEST)
    )

    consd_plan = tx.TransferPlan(
        30,
        lw2.rows()[0][1:3],
        lw1.columns()[0][0],
        _instr_labware["instr"],
        max_volume=_instr_labware["instr"].hw_pipette["working_volume"],
        api_version=API_VERSION,
        mode="consolidate",
        options=options,
    )

    exp = [
        {"method": "pick_up_tip", "args": [], "kwargs": {}},
        {"method": "aspirate", "args": [30, lw2["A2"], 1.0], "kwargs": {}},
        {"method": "aspirate", "args": [30, lw2["A3"], 1.0], "kwargs": {}},
        {"method": "dispense", "args": [60, lw1["A1"], 1.0], "kwargs": {}},
        {"method": "blow_out", "args": [lw1["A1"]], "kwargs": {}},
        {"method": "drop_tip", "args": [], "kwargs": {}},
    ]
    for step, expected in zip(consd_plan, exp):
        assert step == expected
