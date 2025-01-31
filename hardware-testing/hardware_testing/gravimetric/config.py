"""Config."""
from dataclasses import dataclass
from typing import List, Dict, Tuple
from typing_extensions import Final
from enum import Enum
from opentrons.config.types import LiquidProbeSettings
from opentrons.protocol_api.labware import Well


class ConfigType(Enum):
    """Substitute for Literal which isn't available until 3.8.0."""

    gravimetric = 1
    photometric = 2


@dataclass
class VolumetricConfig:
    """Execute shared volumetric Setup Config."""

    name: str
    pipette_volume: int
    pipette_channels: int
    pipette_mount: str
    tip_volume: int
    trials: int
    slots_tiprack: List[int]
    increment: bool
    return_tip: bool
    mix: bool
    user_volumes: bool
    kind: ConfigType
    extra: bool
    jog: bool
    same_tip: bool
    ignore_fail: bool
    mode: str


@dataclass
class GravimetricConfig(VolumetricConfig):
    """Execute Gravimetric Setup Config."""

    labware_on_scale: str
    slot_scale: int
    blank: bool
    gantry_speed: int
    scale_delay: int
    isolate_channels: List[int]
    isolate_volumes: List[float]
    liquid: str


@dataclass
class PhotometricConfig(VolumetricConfig):
    """Execute photometric Setup Config."""

    photoplate: str
    photoplate_slot: int
    reservoir: str
    reservoir_slot: int
    touch_tip: bool
    refill: bool
    photoplate_column_offset: List[int]
    dye_well_column_offset: List[int]


GRAV_CONFIG_EXCLUDE_FROM_REPORT = ["labware_offsets", "slots_tiprack"]
PHOTO_CONFIG_EXCLUDE_FROM_REPORT = ["labware_offsets", "slots_tiprack"]

NUM_BLANK_TRIALS: Final = 10
NUM_MIXES_BEFORE_ASPIRATE = 5
SCALE_SECONDS_TO_TRUE_STABILIZE = 60 * 3

LOW_VOLUME_UPPER_LIMIT_UL: Final = 2.0

TOUCH_TIP_SPEED = 30

GANTRY_MAX_SPEED = 40
TIP_SPEED_WHILE_SUBMERGING_ASPIRATE = 50
TIP_SPEED_WHILE_SUBMERGING_DISPENSE = 50
TIP_SPEED_WHILE_RETRACTING_ASPIRATE = 50
TIP_SPEED_WHILE_RETRACTING_DISPENSE = 50

VIAL_SAFE_Z_OFFSET: Final = 25
LABWARE_BOTTOM_CLEARANCE = 1.5

LIQUID_PROBE_SETTINGS: Dict[int, Dict[int, Dict[int, Dict[str, int]]]] = {
    50: {
        1: {
            50: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
        },
        8: {
            50: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
        },
    },
    200: {
        96: {
            50: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
            200: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
        }
    },
    1000: {
        1: {
            50: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
            200: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
            1000: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
        },
        8: {
            50: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
            200: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
            1000: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
        },
        96: {
            50: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
            200: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
            1000: {
                "mount_speed": 5,
                "plunger_speed": 20,
                "sensor_threshold_pascals": 15,
            },
        },
    },
}


def _get_liquid_probe_settings(
    cfg: VolumetricConfig, well: Well
) -> LiquidProbeSettings:
    lqid_cfg: Dict[str, int] = LIQUID_PROBE_SETTINGS[cfg.pipette_volume][
        cfg.pipette_channels
    ][cfg.tip_volume]
    return LiquidProbeSettings(
        mount_speed=lqid_cfg["mount_speed"],
        plunger_speed=lqid_cfg["plunger_speed"],
        plunger_impulse_time=0.2,
        sensor_threshold_pascals=lqid_cfg["sensor_threshold_pascals"],
        aspirate_while_sensing=False,
        z_overlap_between_passes_mm=0.1,
        plunger_reset_offset=2.0,
        samples_for_baselining=20,
        sample_time_sec=0.004,
    )


QC_VOLUMES_G: Dict[int, Dict[int, List[Tuple[int, List[float]]]]] = {
    1: {
        50: [  # P50
            (50, [1.0, 50.0]),  # T50
        ],
        1000: [  # P1000
            (50, [5.0]),  # T50
            (200, []),  # T200
            (1000, [1000.0]),  # T1000
        ],
    },
    8: {
        50: [  # P50
            (50, [1.0, 50.0]),  # T50
        ],
        1000: [  # P1000
            (50, [5.0]),  # T50
            (200, []),  # T200
            (1000, [1000.0]),  # T1000
        ],
    },
    96: {
        200: [
            (50, [1.0, 50.0]),  # T50
            (200, [200.0]),  # T200
        ],
        1000: [  # P1000
            (50, [5.0]),  # T50
            (200, [200.0]),  # T200
            (1000, [1000.0]),  # T1000
        ],
    },
}


QC_VOLUMES_EXTRA_G: Dict[int, Dict[int, List[Tuple[int, List[float]]]]] = {
    1: {
        50: [  # P50
            (50, [10.0]),  # T50
        ],
        1000: [  # P1000
            (50, [50]),  # T50
            (200, [200.0]),  # T200
            (1000, []),  # T1000
        ],
    },
    8: {
        50: [  # P50
            (50, [10.0]),  # T50
        ],
        1000: [  # P1000
            (50, [50.0]),  # T50
            (200, [200.0]),  # T200
            (1000, []),  # T1000
        ],
    },
    96: {
        1000: [  # P1000
            (50, []),  # T50
            (200, []),  # T200
            (1000, []),  # T1000
        ],
    },
}

QC_VOLUMES_P: Dict[int, Dict[int, List[Tuple[int, List[float]]]]] = {
    1: {
        50: [  # P50
            (50, [1.0]),
        ],
        1000: [  # P1000
            (50, [5.0]),  # T50
            (200, [200.0]),  # T200
            (1000, []),  # T1000
        ],
    },
    8: {
        50: [  # P50
            (50, [1.0]),
        ],
        1000: [  # P1000
            (50, [5.0]),  # T50
            (200, [200.0]),  # T200
            (1000, []),  # T1000
        ],
    },
    96: {
        200: [
            (50, [1.0, 5.0]),  # T50
            (200, [200.0]),  # T200
        ],
        1000: [  # P1000
            (50, [5.0]),  # T50
            (200, [200.0]),  # T200
            (1000, []),  # T1000
        ],
    },
}

QC_DEFAULT_TRIALS: Dict[ConfigType, Dict[int, int]] = {
    ConfigType.gravimetric: {
        1: 10,
        8: 10,
        96: 9,
    },
    ConfigType.photometric: {
        1: 8,
        8: 12,
        96: 5,
    },
}

QC_TEST_SAFETY_FACTOR = 0.0

QC_TEST_MIN_REQUIREMENTS: Dict[
    int, Dict[int, Dict[int, Dict[float, Tuple[float, float]]]]
] = {
    # channels: [Pipette: [tip: [Volume: (%d, Cv)]]]
    1: {
        50: {  # P50
            50: {
                1.0: (5.0, 4.0),
                10.0: (1.0, 0.5),
                50.0: (1, 0.4),
            },
        },  # T50
        1000: {  # P1000
            50: {  # T50
                5.0: (5.0, 5.0),
                10.0: (2.0, 2.0),
                50.0: (1.0, 1.0),
            },
            200: {  # T200
                5.0: (7.0, 4.00),
                50.0: (2.0, 1.0),
                200.0: (0.5, 0.2),
            },
            1000: {  # T1000
                10.0: (7.5, 3.5),
                100.0: (2.0, 0.75),
                1000.0: (0.7, 0.15),
            },
        },
    },
    8: {
        50: {  # P50
            50: {  # T50
                1.0: (20.0, 5.0),
                10.0: (3.0, 2.0),
                50.0: (1.25, 0.4),
            },
        },
        1000: {  # P1000
            50: {  # T50
                5.0: (5.0, 5.0),
                10.0: (1.5, 1.5),
                50.0: (1.0, 1.0),
            },
            200: {  # T200
                5.0: (5.0, 5.0),
                50.0: (1.5, 1.5),
                200.0: (1.0, 0.4),
            },
            1000: {  # T1000
                10.0: (10.0, 5.0),
                100.0: (2.5, 1.0),
                1000.0: (0.7, 0.15),
            },
        },
    },
    96: {
        200: {
            50: {  # T50
                1.0: (2.5, 2.0),
                2.0: (2.5, 2.0),
                3.0: (2.5, 2.0),
                5.0: (2.5, 2.0),
                10.0: (3.1, 1.7),
                50.0: (1.5, 0.75),
            },
            200: {  # T200
                5.0: (2.5, 4.0),
                50.0: (1.5, 2.0),
                200.0: (1.4, 0.9),
            },
        },
        1000: {  # P1000
            50: {  # T50
                1.0: (2.5, 2.0),
                2.0: (2.5, 2.0),
                3.0: (2.5, 2.0),
                5.0: (2.5, 2.0),
                10.0: (3.1, 1.7),
                50.0: (1.5, 0.75),
            },
            200: {  # T200
                5.0: (2.5, 4.0),
                50.0: (1.5, 2.0),
                200.0: (1.4, 0.9),
            },
            1000: {  # T1000
                10.0: (5.0, 5.0),
                100.0: (2.5, 1.5),
                1000.0: (1.0, 0.75),
            },
        },
    },
}


def get_tip_volumes_for_qc(
    pipette_volume: int, pipette_channels: int, extra: bool, photometric: bool
) -> List[int]:
    """Build the default testing volumes for qc."""
    config: Dict[int, Dict[int, List[Tuple[int, List[float]]]]] = {}
    tip_volumes: List[int] = []
    if photometric:
        config = QC_VOLUMES_P
    else:
        config = QC_VOLUMES_G
    for t, vls in config[pipette_channels][pipette_volume]:
        if len(vls) > 0 and t not in tip_volumes:
            tip_volumes.append(t)
    if extra:
        for t, vls in QC_VOLUMES_EXTRA_G[pipette_channels][pipette_volume]:
            if len(vls) > 0 and t not in tip_volumes:
                tip_volumes.append(t)

    assert len(tip_volumes) > 0
    return tip_volumes
