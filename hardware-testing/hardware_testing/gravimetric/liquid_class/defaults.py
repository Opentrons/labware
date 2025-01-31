"""Defaults."""
from typing import Dict

from .definition import (
    LiquidClassSettings,
    AspirateSettings,
    DispenseSettings,
    interpolate,
)

_default_submerge_aspirate_mm = 1.5
_p50_multi_submerge_aspirate_mm = 1.5
_default_submerge_dispense_mm = 1.5
_default_retract_mm = 5.0
_default_retract_discontinuity = 20

_default_aspirate_delay_seconds = 1.0
_default_dispense_delay_seconds = 0.5

_default_accel_p50_ul_sec_sec = 1200
_default_accel_p1000_ul_sec_sec = 24000
_default_accel_96ch_ul_sec_sec = 16000

# dispense settings are constant across volumes
_dispense_defaults: Dict[int, Dict[int, Dict[int, Dict[int, DispenseSettings]]]] = {
    1: {
        50: {  # P50
            50: {  # T50
                1: DispenseSettings(  # 1uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=57,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=7,
                ),
                10: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=57,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=2,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=57,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=2,
                ),
            },
        },
        1000: {  # P1000
            50: {  # T50
                5: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=318,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                10: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=478,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                50: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=478,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
            },
            200: {  # T200
                5: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                200: DispenseSettings(  # 200uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
            },
            1000: {  # T1000
                10: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=160,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
                100: DispenseSettings(  # 100uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
                1000: DispenseSettings(  # 1000uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
            },
        },
    },
    8: {
        50: {  # P50
            50: {  # T50
                1: DispenseSettings(  # 1uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=57,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=6,
                ),
                10: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=57,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=2,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=57,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=2,
                ),
            },
        },
        1000: {  # P1000
            50: {  # T50
                5: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=318,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                10: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=478,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=478,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
            },
            200: {  # T200
                5: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                200: DispenseSettings(  # 200uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
            },
            1000: {  # T1000
                10: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=160,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
                100: DispenseSettings(  # 100uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
                1000: DispenseSettings(  # 1000uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
            },
        },
    },
    96: {
        1000: {  # P1000
            50: {  # T50
                5: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                10: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
            },
            200: {  # T200
                5: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                200: DispenseSettings(  # 200uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
            },
            1000: {  # T1000
                10: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
                100: DispenseSettings(  # 100uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
                1000: DispenseSettings(  # 1000uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=20,
                ),
            },
        },
        200: {  # P200
            50: {  # T50
                5: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                10: DispenseSettings(  # 10uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
            },
            200: {  # T200
                5: DispenseSettings(  # 5uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                50: DispenseSettings(  # 50uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
                200: DispenseSettings(  # 200uL
                    z_submerge_depth=_default_submerge_dispense_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_dispense_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    blow_out_submerged=5,
                ),
            },
        },
    },
}

_aspirate_defaults: Dict[int, Dict[int, Dict[int, Dict[int, AspirateSettings]]]] = {
    1: {
        50: {  # P50
            50: {  # T50
                1: AspirateSettings(  # 1uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=35,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=23.5,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=35,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
            },
        },
        1000: {  # P1000
            50: {  # T50
                5: AspirateSettings(  # 5uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=318,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=478,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=478,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
            },
            200: {  # T200
                5: AspirateSettings(  # 5uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=5,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=3.5,
                ),
                200: AspirateSettings(  # 200uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=2,
                ),
            },
            1000: {  # T1000
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=160,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
                100: AspirateSettings(  # 100uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
                1000: AspirateSettings(  # 1000uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
            },
        },
    },
    8: {
        50: {  # P50
            50: {  # T50
                1: AspirateSettings(  # 1uL
                    z_submerge_depth=_p50_multi_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=35,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_p50_multi_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=23.5,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_p50_multi_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p50_ul_sec_sec,
                    plunger_flow_rate=35,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
            },
        },
        1000: {  # P1000
            50: {  # T50
                5: AspirateSettings(  # 5uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=318,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=478,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=478,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
            },
            200: {  # T200
                5: AspirateSettings(  # 5uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=5,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=3.5,
                ),
                200: AspirateSettings(  # 200uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=2,
                ),
            },
            1000: {  # T1000
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=160,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
                100: AspirateSettings(  # 100uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
                1000: AspirateSettings(  # 1000uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_p1000_ul_sec_sec,
                    plunger_flow_rate=716,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
            },
        },
    },
    96: {
        1000: {  # P1000
            50: {  # T50
                5: AspirateSettings(  # 5uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=6.5,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=6.5,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=6.5,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
            },
            200: {  # T200
                5: AspirateSettings(  # 5uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=2,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=3.5,
                ),
                200: AspirateSettings(  # 200uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=2,
                ),
            },
            1000: {  # T1000
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=160,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
                100: AspirateSettings(  # 100uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=160,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
                1000: AspirateSettings(  # 1000uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=160,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=10,
                ),
            },
        },
        200: {  # P200
            50: {  # T50
                5: AspirateSettings(  # 5uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=6.5,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                10: AspirateSettings(  # 10uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=6.5,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=6.5,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=0.1,
                ),
            },
            200: {  # T200
                5: AspirateSettings(  # 5uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=2,
                ),
                50: AspirateSettings(  # 50uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=3.5,
                ),
                200: AspirateSettings(  # 200uL
                    z_submerge_depth=_default_submerge_aspirate_mm,
                    plunger_acceleration=_default_accel_96ch_ul_sec_sec,
                    plunger_flow_rate=80,  # ul/sec
                    delay=_default_aspirate_delay_seconds,
                    z_retract_discontinuity=_default_retract_discontinuity,
                    z_retract_height=_default_retract_mm,
                    leading_air_gap=0,
                    trailing_air_gap=2,
                ),
            },
        },
    },
}


def get_liquid_class(
    pipette: int, channels: int, tip: int, volume: int
) -> LiquidClassSettings:
    """Get liquid class."""
    aspirate_cls_per_volume = _aspirate_defaults[channels][pipette][tip]
    dispense_cls_per_volume = _dispense_defaults[channels][pipette][tip]
    defined_volumes = list(aspirate_cls_per_volume.keys())
    defined_volumes.sort()
    assert len(defined_volumes) == 3

    def _build_liquid_class(vol: int) -> LiquidClassSettings:
        return LiquidClassSettings(
            aspirate=aspirate_cls_per_volume[vol],
            dispense=dispense_cls_per_volume[vol],
        )

    def _get_interp_liq_class(lower_ul: int, upper_ul: int) -> LiquidClassSettings:
        factor = (volume - lower_ul) / (upper_ul - lower_ul)
        lower_cls = _build_liquid_class(lower_ul)
        upper_cls = _build_liquid_class(upper_ul)
        return interpolate(lower_cls, upper_cls, factor)

    if volume <= defined_volumes[0]:
        return _build_liquid_class(defined_volumes[0])
    elif volume < defined_volumes[1]:
        return _get_interp_liq_class(defined_volumes[0], defined_volumes[1])
    elif volume == defined_volumes[1]:
        return _build_liquid_class(defined_volumes[1])
    elif volume < defined_volumes[2]:
        return _get_interp_liq_class(defined_volumes[1], defined_volumes[2])
    else:
        return _build_liquid_class(defined_volumes[2])
