import pytest

from typing import Union
from opentrons_shared_data.pipette.types import (
    PipetteChannelType,
    PipetteModelType,
    PipetteVersionType,
    PipetteGenerationType,
    PipetteOEMType,
)
from opentrons_shared_data.pipette.types import PipetteModel, PipetteName
from opentrons_shared_data.pipette import (
    pipette_definition as pc,
    pipette_load_name_conversions as ps,
)


@pytest.mark.parametrize(
    argnames=["model", "output"],
    argvalues=[
        [
            "p50_single_v2.0",
            pc.PipetteModelVersionType(
                PipetteModelType.p50,
                PipetteChannelType.SINGLE_CHANNEL,
                PipetteVersionType(2, 0),
                PipetteOEMType.OT,
            ),
        ],
        [
            "p1000_multi_v1.0",
            pc.PipetteModelVersionType(
                PipetteModelType.p1000,
                PipetteChannelType.EIGHT_CHANNEL,
                PipetteVersionType(1, 0),
                PipetteOEMType.OT,
            ),
        ],
        [
            "p1000_96_v1.0",
            pc.PipetteModelVersionType(
                PipetteModelType.p1000,
                PipetteChannelType.NINETY_SIX_CHANNEL,
                PipetteVersionType(1, 0),
                PipetteOEMType.OT,
            ),
        ],
    ],
)
def test_convert_pipette_model(
    model: PipetteModel, output: pc.PipetteModelVersionType
) -> None:
    assert output == ps.convert_pipette_model(model)


@pytest.mark.parametrize(
    argnames=["model", "version", "output"],
    argvalues=[
        [
            "p50_single",
            "2.0",
            pc.PipetteModelVersionType(
                PipetteModelType.p50,
                PipetteChannelType.SINGLE_CHANNEL,
                PipetteVersionType(2, 0),
                PipetteOEMType.OT,
            ),
        ],
        [
            "p1000_multi",
            "3.3",
            pc.PipetteModelVersionType(
                PipetteModelType.p1000,
                PipetteChannelType.EIGHT_CHANNEL,
                PipetteVersionType(3, 3),
                PipetteOEMType.OT,
            ),
        ],
        [
            "p1000_96",
            "1.1",
            pc.PipetteModelVersionType(
                PipetteModelType.p1000,
                PipetteChannelType.NINETY_SIX_CHANNEL,
                PipetteVersionType(1, 1),
                PipetteOEMType.OT,
            ),
        ],
    ],
)
def test_convert_pipette_model_provided_version(
    model: PipetteModel, version: str, output: pc.PipetteModelVersionType
) -> None:
    assert output == ps.convert_pipette_model(model, version)


@pytest.mark.parametrize(
    argnames=["name", "output"],
    argvalues=[
        [
            "p50_single_gen2",
            pc.PipetteModelVersionType(
                PipetteModelType.p50,
                PipetteChannelType.SINGLE_CHANNEL,
                PipetteVersionType(2, 0),
                PipetteOEMType.OT,
            ),
        ],
        [
            "p1000_multi_flex",
            pc.PipetteModelVersionType(
                PipetteModelType.p1000,
                PipetteChannelType.EIGHT_CHANNEL,
                PipetteVersionType(3, 5),
                PipetteOEMType.OT,
            ),
        ],
        [
            "p1000_96",
            pc.PipetteModelVersionType(
                PipetteModelType.p1000,
                PipetteChannelType.NINETY_SIX_CHANNEL,
                PipetteVersionType(3, 6),
                PipetteOEMType.OT,
            ),
        ],
    ],
)
def test_convert_pipette_name(
    name: PipetteName, output: pc.PipetteModelVersionType
) -> None:
    assert output == ps.convert_pipette_name(name)


@pytest.mark.parametrize(
    argnames=["model_type", "channels", "generation", "output", "oem"],
    argvalues=[
        [
            PipetteModelType.p50,
            PipetteChannelType.SINGLE_CHANNEL,
            PipetteGenerationType.GEN2,
            "p50_single_gen2",
            PipetteOEMType.OT,
        ],
        [
            PipetteModelType.p1000,
            PipetteChannelType.EIGHT_CHANNEL,
            PipetteGenerationType.GEN2,
            "p1000_multi_gen2",
            PipetteOEMType.OT,
        ],
        [
            # 96 channel has a unique "name" right now
            PipetteModelType.p1000,
            PipetteChannelType.NINETY_SIX_CHANNEL,
            PipetteGenerationType.FLEX,
            "p1000_96",
            PipetteOEMType.OT,
        ],
    ],
)
def test_model_version_type_string_version(
    model_type: PipetteModelType,
    channels: PipetteChannelType,
    generation: PipetteGenerationType,
    output: PipetteName,
    oem: PipetteOEMType,
) -> None:
    data = pc.PipetteNameType(
        pipette_type=model_type,
        pipette_channels=channels,
        pipette_generation=generation,
        oem_type=oem,
    )
    assert output == str(data)


@pytest.mark.parametrize(
    argnames=["model_type", "channels", "version", "output", "oem"],
    argvalues=[
        [
            PipetteModelType.p50,
            PipetteChannelType.SINGLE_CHANNEL,
            PipetteVersionType(1, 0),
            "p50_single_v1",
            PipetteOEMType.OT,
        ],
        [
            PipetteModelType.p1000,
            PipetteChannelType.EIGHT_CHANNEL,
            PipetteVersionType(2, 1),
            "p1000_multi_v2.1",
            PipetteOEMType.OT,
        ],
        [
            PipetteModelType.p1000,
            PipetteChannelType.NINETY_SIX_CHANNEL,
            PipetteVersionType(3, 3),
            "p1000_96_v3.3",
            PipetteOEMType.OT,
        ],
    ],
)
def test_name_type_string_generation(
    model_type: PipetteModelType,
    channels: PipetteChannelType,
    version: PipetteVersionType,
    output: PipetteModel,
    oem: PipetteOEMType,
) -> None:
    data = pc.PipetteModelVersionType(
        pipette_type=model_type,
        pipette_channels=channels,
        pipette_version=version,
        oem_type=oem,
    )
    assert output == str(data)


@pytest.mark.parametrize(
    argnames=["model_or_name", "valid"],
    argvalues=[
        [
            "p50_single",
            True,
        ],
        [
            "p50_sing",
            False,
        ],
        [
            "p100_multi",
            False,
        ],
        [
            "p1000_multi_v3.3",
            True,
        ],
    ],
)
def test_supported_pipette(
    model_or_name: Union[PipetteName, PipetteModel, None], valid: bool
) -> None:
    assert ps.supported_pipette(model_or_name) == valid
