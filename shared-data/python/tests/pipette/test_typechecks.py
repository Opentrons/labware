import pytest
import typeguard

from typing import Generator, Tuple

from opentrons_shared_data.pipette import (
    model_config,
    name_config,
    fuse_specs,
    dummy_model_for_name,
)
from opentrons_shared_data.pipette.types import (
    PipetteModelSpecs,
    PipetteNameSpecs,
    PipetteFusedSpec,
    PipetteName,
    PipetteModel,
)


def test_model_config_check() -> None:
    defdict = model_config()
    typeguard.check_type(defdict, PipetteModelSpecs)


def test_name_config_check() -> None:
    defdict = name_config()
    typeguard.check_type(defdict, PipetteNameSpecs)


def build_model_name_pairs() -> Generator[Tuple[PipetteModel, PipetteName], None, None]:
    for model, conf in model_config()["config"].items():
        yield model, conf["name"]
        for bcn in conf.get("backCompatNames", []):
            yield model, bcn


@pytest.mark.parametrize("model,name", list(build_model_name_pairs()))
def test_fuse(model: PipetteModel, name: PipetteName) -> None:
    defdict = fuse_specs(model, name)
    typeguard.check_type(defdict, PipetteFusedSpec)


@pytest.mark.parametrize("name", list(name_config().keys()))
def test_model_for_name(name: PipetteName) -> None:
    model = dummy_model_for_name(name)
    assert model in model_config()["config"]
