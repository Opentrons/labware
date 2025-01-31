import inspect
from datetime import datetime
from typing import Union, cast

import pytest
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]
from decoy import Decoy

from opentrons_shared_data.labware.types import (
    LabwareUri,
    LabwareDefinition as LabwareDefDict,
)
from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition,
    Parameters,
)


from opentrons import calibration_storage, types as top_types
from opentrons.calibration_storage import helpers as calibration_storage_helpers
from opentrons.calibration_storage.ot2.models import v1 as v1_models
from opentrons.hardware_control.instruments.ot2 import instrument_calibration as subject
from opentrons.hardware_control.instruments.ot3 import (
    instrument_calibration as subject_ot3,
)


@pytest.fixture(autouse=True)
def _use_mock_calibration_storage(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out the opentrons.calibration_storage module."""
    for name, func in inspect.getmembers(calibration_storage, inspect.isfunction):
        monkeypatch.setattr(calibration_storage, name, decoy.mock(func=func))
    for name, func in inspect.getmembers(calibration_storage.ot2, inspect.isfunction):
        monkeypatch.setattr(calibration_storage.ot2, name, decoy.mock(func=func))
    for name, func in inspect.getmembers(calibration_storage.ot3, inspect.isfunction):
        monkeypatch.setattr(calibration_storage.ot3, name, decoy.mock(func=func))

    for name, func in inspect.getmembers(
        calibration_storage_helpers, inspect.isfunction
    ):
        monkeypatch.setattr(calibration_storage_helpers, name, decoy.mock(func=func))


@pytest.fixture
def tip_rack_dict() -> LabwareDefDict:
    """Get a tip rack dictionary definition value object."""
    return cast(
        LabwareDefDict,
        {"namespace": "test", "version": 1, "parameters": {"loadName": "cool-labware"}},
    )


@pytest.fixture
def tip_rack_model() -> LabwareDefinition:
    """Get a tip rack Pydantic model definition value object."""
    return LabwareDefinition.model_construct(  # type: ignore[call-arg]
        namespace="test",
        version=1,
        parameters=Parameters.model_construct(  # type: ignore[call-arg]
            loadName="cool-labware",
            tipOverlap=None,  # add a None value to validate serialization to dictionary
        ),
    )


@pytest.mark.parametrize(
    "tip_rack_definition",
    [
        lazy_fixture("tip_rack_dict"),
        lazy_fixture("tip_rack_model"),
    ],
)
def test_load_tip_length(
    decoy: Decoy,
    tip_rack_dict: LabwareDefDict,
    tip_rack_definition: Union[LabwareDefDict, LabwareDefinition],
) -> None:
    """Test that a tip length can be laoded for a pipette / tiprack combination."""
    tip_length_data = v1_models.TipLengthModel(
        tipLength=1.23,
        lastModified=datetime(year=2023, month=1, day=1),
        definitionHash="asdfghjk",
        source=subject.SourceType.factory,
        status=v1_models.CalibrationStatus(
            markedBad=True,
            source=subject.SourceType.user,
            markedAt=datetime(year=2023, month=2, day=2),
        ),
    )

    decoy.when(
        calibration_storage.ot2.load_tip_length_calibration(
            pip_id="abc123", definition=tip_rack_dict
        )
    ).then_return(tip_length_data)

    decoy.when(calibration_storage.helpers.hash_labware_def(tip_rack_dict)).then_return(
        "asdfghjk"
    )
    decoy.when(
        calibration_storage.helpers.uri_from_definition(tip_rack_dict)
    ).then_return(LabwareUri("def456"))

    result = subject.load_tip_length_for_pipette(
        pipette_id="abc123", tiprack=tip_rack_definition
    )

    assert result == subject.TipLengthCalibration(
        tip_length=1.23,
        source=subject.SourceType.factory,
        pipette="abc123",
        tiprack="asdfghjk",
        last_modified=datetime(year=2023, month=1, day=1),
        uri=LabwareUri("def456"),
        status=subject.CalibrationStatus(
            markedBad=True,
            source=subject.SourceType.user,
            markedAt=datetime(year=2023, month=2, day=2),
        ),
    )


@pytest.mark.parametrize(
    "left,right,ok",
    [
        # If either point is all 0 (uncalibrated) then the check should pass
        (top_types.Point(0, 0, 0), top_types.Point(0, 0, 2), True),
        (top_types.Point(0, 0, 2), top_types.Point(0, 0, 0), True),
        (top_types.Point(0, 0, 0), top_types.Point(0, 0, 0), True),
        # If both points are non-zero but all values are within the range the
        # check should pass
        (top_types.Point(0, 1.0, 1.5), top_types.Point(-1, 0, 0.2), True),
        # If both points are non-zero but at least one element is more than
        # the range different the test should fail
        (top_types.Point(0.1, -1, 4.3), top_types.Point(1.7, 0, 0.2), False),
        (top_types.Point(0.1, -3.2, 1.5), top_types.Point(0.6, 0.9, 1.3), False),
        (top_types.Point(0.1, -1, 1.5), top_types.Point(-0.2, -0.1, 6), False),
    ],
)
def test_instrument_consistency_check_ot3(
    left: top_types.Point, right: top_types.Point, ok: bool
) -> None:
    result = subject_ot3.check_instrument_offset_reasonability(left, right)
    if ok:
        assert result == []
    else:
        assert result[0].kind == "inconsistent-pipette-offset"
        assert result[0].offsets == {
            top_types.Mount.LEFT: left,
            top_types.Mount.RIGHT: right,
        }
        assert result[0].limit == 4.0
