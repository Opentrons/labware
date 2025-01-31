"""Module data resource provider."""
from typing import Dict
from opentrons.hardware_control.modules.module_calibration import (
    load_all_module_calibrations,
)
from opentrons_shared_data.module import load_definition

from opentrons.types import DeckSlotName
from ..types import (
    ModuleModel,
    ModuleDefinition,
    ModuleOffsetVector,
    ModuleOffsetData,
    DeckSlotLocation,
)


class ModuleDataProvider:
    """Module data provider."""

    @staticmethod
    def get_definition(model: ModuleModel) -> ModuleDefinition:
        """Get the module definition."""
        data = load_definition(model_or_loadname=model.value, version="3")
        return ModuleDefinition.model_validate(data)

    @staticmethod
    def load_module_calibrations() -> Dict[str, ModuleOffsetData]:
        """Load the module calibration offsets."""
        module_calibrations: Dict[str, ModuleOffsetData] = dict()
        calibration_data = load_all_module_calibrations()
        for calibration in calibration_data:
            # NOTE module_id is really the module serial number, change this
            module_calibrations[calibration.module_id] = ModuleOffsetData(
                moduleOffsetVector=ModuleOffsetVector(
                    x=calibration.offset.x,
                    y=calibration.offset.y,
                    z=calibration.offset.z,
                ),
                location=DeckSlotLocation(
                    slotName=DeckSlotName.from_primitive(calibration.slot),
                ),
            )
        return module_calibrations
