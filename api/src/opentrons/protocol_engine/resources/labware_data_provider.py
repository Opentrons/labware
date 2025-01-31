"""Labware data resource provider.

This module is a wrapper around existing, but older, internal APIs to
abstract away rough edges until we can improve those underlying interfaces.
"""
import logging
from anyio import to_thread

from opentrons.protocols.models import LabwareDefinition
from opentrons.protocols.labware import get_labware_definition

# TODO (lc 09-26-2022) We should conditionally import ot2 or ot3 calibration
from opentrons.hardware_control.instruments.ot2 import (
    instrument_calibration as instr_cal,
)
from opentrons.calibration_storage.types import TipLengthCalNotFound


log = logging.getLogger(__name__)


class LabwareDataProvider:
    """Labware data provider."""

    @staticmethod
    async def get_labware_definition(
        load_name: str,
        namespace: str,
        version: int,
    ) -> LabwareDefinition:
        """Get a labware definition given the labware's identification.

        Note: this method hits the filesystem, which will have performance
        implications if it is called often.
        """
        return await to_thread.run_sync(
            LabwareDataProvider._get_labware_definition_sync,
            load_name,
            namespace,
            version,
        )

    @staticmethod
    def _get_labware_definition_sync(
        load_name: str, namespace: str, version: int
    ) -> LabwareDefinition:
        return LabwareDefinition.model_validate(
            get_labware_definition(load_name, namespace, version)
        )

    @staticmethod
    async def get_calibrated_tip_length(
        pipette_serial: str,
        labware_definition: LabwareDefinition,
        nominal_fallback: float,
    ) -> float:
        """Get the calibrated tip length of a tip rack / pipette pair.

        Note: this method hits the filesystem, which will have performance
        implications if it is called often.
        """
        return await to_thread.run_sync(
            LabwareDataProvider._get_calibrated_tip_length_sync,
            pipette_serial,
            labware_definition,
            nominal_fallback,
        )

    @staticmethod
    def _get_calibrated_tip_length_sync(
        pipette_serial: str,
        labware_definition: LabwareDefinition,
        nominal_fallback: float,
    ) -> float:
        try:
            return instr_cal.load_tip_length_for_pipette(
                pipette_serial, labware_definition
            ).tip_length

        except TipLengthCalNotFound as e:
            message = (
                f"No calibrated tip length found for {pipette_serial},"
                f" using nominal fallback value of {nominal_fallback}"
            )
            log.debug(message, exc_info=e)
            return nominal_fallback
