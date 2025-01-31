from __future__ import annotations

"""
opentrons_shared_data.pipette: functions and types for pipette config
"""
import copy
from typing import TYPE_CHECKING, Dict, Optional
import json
from functools import lru_cache

from .. import load_shared_data

if TYPE_CHECKING:
    from .types import (
        PipetteNameSpecs,
        PipetteModelSpecs,
        PipetteName,
        PipetteModel,
        PipetteFusedSpec,
        ChannelCount,
    )


# TODO (spp, 2023-06-22: should probably move this to definition)
"""
The span of pipettes in X-direction based on number of channels.
This is needed in order to determine safe tip drop location within a labware.
"""
PIPETTE_X_SPAN: Dict[ChannelCount, float] = {
    1: 75,  # includes a margin
    8: 75,  # includes a margin
    96: 161,
}


def model_config() -> PipetteModelSpecs:
    """Load the per-pipette-model config file from within the wheel"""
    return copy.deepcopy(_model_config())


@lru_cache(maxsize=None)
def _model_config() -> PipetteModelSpecs:
    return json.loads(
        load_shared_data("pipette/definitions/1/pipetteModelSpecs.json") or "{}"
    )


def name_config() -> PipetteNameSpecs:
    """Load the per-pipette-name config file from within the wheel"""
    return _name_config()


@lru_cache(maxsize=None)
def _name_config() -> PipetteNameSpecs:
    return json.loads(
        load_shared_data("pipette/definitions/1/pipetteNameSpecs.json") or "{}"
    )


def name_for_model(pipette_model: PipetteModel) -> PipetteName:
    """Quickly look up the name for this model"""
    return model_config()["config"][pipette_model]["name"]


def fuse_specs(
    pipette_model: PipetteModel, pipette_name: Optional[PipetteName] = None
) -> PipetteFusedSpec:
    """Combine the model and name spec for a given model.

    if pipette_name is not given, the name field of the pipette config
    is used. If it is, the given name must be in the backCompatNames field.
    """
    return copy.deepcopy(_fuse_specs_cached(pipette_model, pipette_name))


@lru_cache(maxsize=None)
def _fuse_specs_cached(
    pipette_model: PipetteModel, pipette_name: Optional[PipetteName] = None
) -> PipetteFusedSpec:
    """
    Do the work of fusing the specs inside an lru cache. This can't be the
    function that's directly called because we want to return a new object
    all the time, hence the wrapper.
    """
    model_data = _model_config()["config"][pipette_model]
    pipette_name = pipette_name or model_data["name"]

    valid_names = [model_data["name"]] + model_data.get("backCompatNames", [])

    if pipette_name not in valid_names:
        raise KeyError(
            f"pipette name {pipette_name} is not valid for model " f"{pipette_model}"
        )
    name_data = _name_config()[pipette_name]
    # unfortunately, mypy can't verify this way to build typed dicts - we'll
    # make sure it's correct in the tests, and leave the function annotated
    # properly
    return {**model_data, **name_data}


def dummy_model_for_name(pipette_name: PipetteName) -> PipetteModel:
    if "gen2" in pipette_name:
        return "_".join(pipette_name.split("_")[:-1]) + "_v2.0"  # type: ignore
    elif "flex" in pipette_name:
        return "_".join(pipette_name.split("_")[:-1]) + "_v3.0"  # type: ignore
    else:
        return pipette_name + "_v1"  # type: ignore
