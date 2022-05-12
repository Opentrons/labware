from __future__ import annotations

""" Classes and functions for gripper state tracking
"""
from dataclasses import asdict, replace
import logging
from typing import Any, Dict, Optional, Union, cast

from opentrons.hardware_control.pipette import Pipette
from opentrons.types import Point
from opentrons.config.defaults_ot3 import DEFAULT_PIPETTE_OFFSET
from opentrons.config import gripper_config, pipette_config
from opentrons.config.pipette_config import config_models, config_names, configs, load
from opentrons_shared_data.pipette.dev_types import PipetteModel
from opentrons.calibration_storage.types import PipetteOffsetByPipetteMount, SourceType, CalibrationStatus
from .instrument_abc import AbstractInstrument

RECONFIG_KEYS = {"quirks"}


mod_log = logging.getLogger(__name__)


FAKE_PIP_OFFSET = PipetteOffsetByPipetteMount(
    offset=DEFAULT_PIPETTE_OFFSET,
    source=SourceType.default,
    status=CalibrationStatus(),
)


class Gripper(AbstractInstrument):
    """A class to gather and track gripper state and configs.

    This class should not touch hardware or call back out to the hardware
    control API. Its only purpose is to gather state.
    """

    DictType = Dict[str, Union[str, float, bool]]
    #: The type of this data class as a dict

    def __init__(
        self,
        config: gripper_config.GripperConfig,
        gripper_id: Optional[str] = None,
    ) -> None:
        p_config = pipette_config.load(cast("PipetteModel", "p20_single_v3.0"))
        self._config = config
        self._name = self._config.name
        self._model = self._config.model
        self._gripper_id = gripper_id
        self._log = mod_log.getChild(
            self._gripper_id if self._gripper_id else "<unknown>"
        )
        # cache a dict representation of config for improved performance of
        # as_dict.
        self._config_as_dict = asdict(config)

    @property
    def config(self) -> gripper_config.GripperConfig:
        return self._config

    def update_config_item(self, elem_name: str, elem_val: Any) -> None:
        self._log.info("updated config: {}={}".format(elem_name, elem_val))
        self._config = replace(self._config, **{elem_name: elem_val})
        # Update the cached dict representation
        self._config_as_dict = asdict(self._config)

    @property
    def name(self) -> gripper_config.GripperName:
        return self._name

    @property
    def model(self) -> gripper_config.GripperModel:
        return self._model

    @property
    def gripper_id(self) -> Optional[str]:
        return self._gripper_id

    def critical_point(self) -> Point:
        """
        The vector from the gripper's origin to its critical point. The
        critical point for a pipette is the end of the nozzle if no tip is
        attached, or the end of the tip if a tip is attached.
        """
        # TODO: add critical point implementation
        return Point(0, 0, 0)

    def __str__(self) -> str:
        return "{}".format(self._config.display_name)

    def __repr__(self) -> str:
        return "<{}: {} {}>".format(
            self.__class__.__name__, self._config.display_name, id(self)
        )

    def as_dict(self) -> "Gripper.DictType":
        self._config_as_dict.update(
            {
                "name": self.name,
                "model": self.model,
                "gripper_id": self.gripper_id,
            }
        )
        return self._config_as_dict
