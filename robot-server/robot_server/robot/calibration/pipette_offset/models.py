from typing import Optional, List
from pydantic import ConfigDict, BaseModel, Field

from ..helper_classes import AttachedPipette, RequiredLabware, NextSteps


class PipetteOffsetCalibrationSessionStatus(BaseModel):
    """The current status of a pipette offset calibration session."""

    instrument: AttachedPipette
    currentStep: str = Field(
        ..., description="Current step of pipette offset user flow"
    )
    labware: List[RequiredLabware]
    shouldPerformTipLength: bool = Field(
        ...,
        description="Does tip length calibration data exist for "
        "this pipette and tip rack combination",
    )
    supportedCommands: List[str] = Field(
        ..., description="A list of supported commands for this user flow"
    )
    nextSteps: Optional[NextSteps] = Field(
        None, description="Next Available Steps in Session"
    )
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "instrument": {
                        "model": "p300_single_v1.5",
                        "name": "p300_single",
                        "tip_length": 51.7,
                        "mount": "left",
                        "serial": "P3HS12123041",
                    },
                    "currentStep": "sessionStarted",
                    "nextSteps": {"links": {"loadLabware": {"url": "", "params": {}}}},
                    "labware": [
                        {
                            "slot": "8",
                            "loadName": "tiprack_loadname",
                            "namespace": "opentrons",
                            "version": "1",
                            "isTiprack": "true",
                            "definition": {"ordering": "the ordering section..."},
                        },
                    ],
                    "shouldPerformTipLength": True,
                }
            ]
        }
    )
