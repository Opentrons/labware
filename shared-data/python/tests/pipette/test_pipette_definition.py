import pytest
from typing import cast, List
from opentrons_shared_data.pipette.types import (
    PipetteChannelType,
    PipetteModelType,
    PipetteVersionType,
    PipetteModelMajorVersionType,
    PipetteModelMinorVersionType,
    LiquidClasses,
)
from opentrons_shared_data.pipette.pipette_definition import (
    liquid_class_for_volume_between_default_and_defaultlowvolume,
    PipetteLiquidPropertiesDefinition,
    SupportedTipsDefinition,
)


def get_liquid_definition_for(
    liquid_class: LiquidClasses,
) -> PipetteLiquidPropertiesDefinition:
    if liquid_class == LiquidClasses.lowVolumeDefault:
        return PipetteLiquidPropertiesDefinition.model_validate(
            {
                "supportedTips": {
                    "t50": SupportedTipsDefinition.model_validate(
                        {
                            "defaultAspirateFlowRate": {
                                "default": 5,
                                "valuesByApiLevel": {"2.0": 5},
                            },
                            "defaultDispenseFlowRate": {
                                "default": 5,
                                "valuesByApiLevel": {"2.0": 5},
                            },
                            "defaultBlowOutFlowRate": {
                                "default": 10,
                                "valuesByApiLevel": {"2.0": 10},
                            },
                            "defaultFlowAcceleration": 100,
                            "defaultTipLength": 100,
                            "defaultReturnTipHeight": 0.5,
                            "defaultPushOutVolume": 5,
                            "aspirate": {"default": {"1": [[1, 2, 3]]}},
                            "dispense": {"default": {"1": [[1, 2, 3]]}},
                        }
                    )
                },
                "versionedTipOverlapDictionary": {"v0": {}},
                "maxVolume": 30,
                "minVolume": 1,
                "defaultTipracks": [],
            }
        )
    else:
        return PipetteLiquidPropertiesDefinition.model_validate(
            {
                "supportedTips": {
                    "t50": SupportedTipsDefinition.model_validate(
                        {
                            "defaultAspirateFlowRate": {
                                "default": 5,
                                "valuesByApiLevel": {"2.0": 5},
                            },
                            "defaultDispenseFlowRate": {
                                "default": 5,
                                "valuesByApiLevel": {"2.0": 5},
                            },
                            "defaultBlowOutFlowRate": {
                                "default": 10,
                                "valuesByApiLevel": {"2.0": 10},
                            },
                            "defaultFlowAcceleration": 100,
                            "defaultTipLength": 100,
                            "defaultReturnTipHeight": 0.5,
                            "defaultPushOutVolume": 5,
                            "aspirate": {"default": {"1": [[1, 2, 3]]}},
                            "dispense": {"default": {"1": [[1, 2, 3]]}},
                        }
                    )
                },
                "versionedTipOverlapDictionary": {"v0": {}},
                "maxVolume": 100,
                "minVolume": 5,
                "defaultTipracks": [],
            }
        )


@pytest.mark.parametrize(
    argnames=["model", "expected_enum"],
    argvalues=[["p50", PipetteModelType.p50], ["p1000", PipetteModelType.p1000]],
)
def test_model_enum(model: str, expected_enum: PipetteModelType) -> None:
    assert expected_enum == PipetteModelType(model)


@pytest.mark.parametrize(argnames="channels", argvalues=[1, 8, 96])
def test_channel_enum(channels: int) -> None:
    channel_type = PipetteChannelType(channels)
    assert channels == channel_type


def test_incorrect_values() -> None:
    with pytest.raises(ValueError):
        PipetteModelType("p100")

    with pytest.raises(ValueError):
        PipetteChannelType(99)


@pytest.mark.parametrize(
    argnames=["major", "minor"],
    argvalues=[[1, 0], [1, 3], [3, 9]],
)
def test_version_enum(major: int, minor: int) -> None:
    version_type = PipetteVersionType(
        cast(PipetteModelMajorVersionType, major),
        cast(PipetteModelMinorVersionType, minor),
    )
    assert version_type.as_tuple == (major, minor)


@pytest.mark.parametrize(
    argnames=[
        "all_liquid_classes",
        "volume",
        "current_liquid_class",
        "expected_liquid_class",
    ],
    argvalues=[
        [
            [LiquidClasses.default],
            1,
            LiquidClasses.lowVolumeDefault,
            LiquidClasses.default,
        ],
        [
            [LiquidClasses.lowVolumeDefault, LiquidClasses.default],
            1,
            LiquidClasses.lowVolumeDefault,
            LiquidClasses.lowVolumeDefault,
        ],
        [
            [LiquidClasses.lowVolumeDefault, LiquidClasses.default],
            1,
            LiquidClasses.default,
            LiquidClasses.lowVolumeDefault,
        ],
        [
            [LiquidClasses.lowVolumeDefault, LiquidClasses.default],
            5,
            LiquidClasses.default,
            LiquidClasses.default,
        ],
        [
            [LiquidClasses.lowVolumeDefault, LiquidClasses.default],
            5,
            LiquidClasses.lowVolumeDefault,
            LiquidClasses.default,
        ],
        [
            [LiquidClasses.lowVolumeDefault, LiquidClasses.default],
            100,
            LiquidClasses.lowVolumeDefault,
            LiquidClasses.default,
        ],
    ],
)
def test_liquid_class_for_volume_between_default_and_defaultlowvolume(
    all_liquid_classes: List[LiquidClasses],
    volume: float,
    current_liquid_class: LiquidClasses,
    expected_liquid_class: LiquidClasses,
) -> None:
    available_liquid_classes = {
        lc: get_liquid_definition_for(lc) for lc in all_liquid_classes
    }
    assert (
        liquid_class_for_volume_between_default_and_defaultlowvolume(
            volume, current_liquid_class, available_liquid_classes
        )
        == expected_liquid_class
    )
