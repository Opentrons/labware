from typing import Optional, List
from pydantic import ConfigDict, BaseModel, Field

from ..helper_classes import AttachedPipette, RequiredLabware, NextSteps


class TipCalibrationSessionStatus(BaseModel):
    """The current status of a tip length calibration session."""

    instrument: AttachedPipette
    currentStep: str = Field(
        ..., description="Current step of tip calibration user flow"
    )
    nextSteps: Optional[NextSteps] = Field(
        None, description="Next Available Steps in Session"
    )
    labware: List[RequiredLabware]
    supportedCommands: List[str] = Field(
        ..., description="A list of supported commands for this user flow"
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
                        {
                            "slot": "3",
                            "loadName": "cal_block_loadname",
                            "namespace": "opentrons",
                            "version": "1",
                            "isTiprack": "false",
                            "definition": {"ordering": "the ordering section..."},
                        },
                    ],
                }
            ]
        }
    )
