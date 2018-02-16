# In this file we often align code for readability triggering PEP8 warnings
# So...
# pylama:skip=1

from collections import namedtuple
from opentrons.util import environment
from opentrons.config import merge, children, build
from opentrons.config import feature_flags as fflags

import json
import os
import logging

log = logging.getLogger(__name__)


PLUNGER_CURRENT_LOW = 0.1
PLUNGER_CURRENT_HIGH = 0.5

MOUNT_CURRENT_LOW = 0.1
MOUNT_CURRENT_HIGH = 1.0

X_CURRENT_LOW = 0.3
X_CURRENT_HIGH = 1.5

Y_CURRENT_LOW = 0.3
Y_CURRENT_HIGH = 1.75

X_MAX_SPEED = 600
Y_MAX_SPEED = 400
Z_MAX_SPEED = 100
A_MAX_SPEED = 100
B_MAX_SPEED = 70
C_MAX_SPEED = 70

DEFAULT_CURRENT = {
    'X': X_CURRENT_HIGH,
    'Y': Y_CURRENT_HIGH,
    'Z': MOUNT_CURRENT_HIGH,
    'A': MOUNT_CURRENT_HIGH,
    'B': PLUNGER_CURRENT_LOW,
    'C': PLUNGER_CURRENT_LOW
}

DEFAULT_MAX_SPEEDS = {
    'X': X_MAX_SPEED,
    'Y': Y_MAX_SPEED,
    'Z': Z_MAX_SPEED,
    'A': A_MAX_SPEED,
    'B': B_MAX_SPEED,
    'C': C_MAX_SPEED
}

DEFAULT_CURRENT_STRING = ' '.join(
    ['{}{}'.format(key, value) for key, value in DEFAULT_CURRENT.items()])

DEFAULT_PROBE_HEIGHT = 77.0


robot_config = namedtuple(
    'robot_config',
    [
        'name',
        'version',
        'steps_per_mm',
        'acceleration',
        'current',
        'gantry_calibration',
        'instrument_offset',
        'probe_center',
        'probe_dimensions',
        'serial_speed',
        'plunger_current_low',
        'plunger_current_high',
        'tip_length',
        'default_current',
        'default_max_speed'
    ]
)


def _get_default():
    if fflags.short_fixed_trash():
        probe_height = 55.0
    else:
        probe_height = DEFAULT_PROBE_HEIGHT

    return robot_config(
        name='Ada Lovelace',
        steps_per_mm='M92 X80.00 Y80.00 Z400 A400 B768 C768',
        acceleration='M204 S10000 X3000 Y2000 Z1500 A1500 B2000 C2000',
        current='M907 ' + DEFAULT_CURRENT_STRING,
        probe_center=(295.0, 300.0, probe_height),
        probe_dimensions=(35.0, 40.0, probe_height + 5.0),
        gantry_calibration=[  # "safe" offset, overwrote in factory calibration
            [ 1.00, 0.00, 0.00,  0.00],
            [ 0.00, 1.00, 0.00,  0.00],
            [ 0.00, 0.00, 1.00,  0.00],
            [ 0.00, 0.00, 0.00,  1.00]
        ],
        # left relative to right
        instrument_offset={
            'right': {
                'single': (0.0, 0.0, 0.0),        # numbers are from CAD
                'multi': (0.0, 0.0, 0.0)  # numbers are from CAD
            },
            'left': {
                'single': (0.0, 0.0, 0.0),        # numbers are from CAD
                'multi': (0.0, 0.0, 0.0) # numbers are from CAD
            },
            'Pipette': 51.7  # TODO (andy): move to tip-rack
        },
        serial_speed=115200,
        default_current=DEFAULT_CURRENT,
        default_max_speed=DEFAULT_MAX_SPEEDS,
        plunger_current_low=PLUNGER_CURRENT_LOW,
        plunger_current_high=PLUNGER_CURRENT_HIGH
    )

default = robot_config(
    name='Ada Lovelace',
    version=1,
    steps_per_mm='M92 X80.00 Y80.00 Z400 A400 B768 C768',
    acceleration='M204 S10000 X3000 Y2000 Z1500 A1500 B2000 C2000',
    current='M907 ' + DEFAULT_CURRENT_STRING,
    probe_center=(295.0, 300.0, 55.0),
    probe_dimensions=(35.0, 40.0, 60.0),
    gantry_calibration=[  # "safe" offset, overwrote in factory calibration
        [ 1.00, 0.00, 0.00,  0.00],
        [ 0.00, 1.00, 0.00,  0.00],
        [ 0.00, 0.00, 1.00,  0.00],
        [ 0.00, 0.00, 0.00,  1.00]
    ],
    # left relative to right
    instrument_offset={
        'right': {
            'single': (0.0, 0.0, 0.0),
            'multi': (0.0, 0.0, 0.0)
        },
        'left': {
            'single': (0.0, 0.0, 0.0),
            'multi': (0.0, 0.0, 0.0)
        }
    },
    tip_length={
        'left': {
            'single': 51.7,
            'multi': 51.7
        },
        'right': {
            'single': 51.7,
            'multi': 51.7
        }
    },
    serial_speed=115200,
    default_current=DEFAULT_CURRENT,
    default_max_speed=DEFAULT_MAX_SPEEDS,
    plunger_current_low=PLUNGER_CURRENT_LOW,
    plunger_current_high=PLUNGER_CURRENT_HIGH
)


def load(filename=None):
    filename = filename or environment.get_path('OT_CONFIG_FILE')
    result = _get_default()

    try:
        with open(filename, 'r') as file:
            local = json.load(file)
            local = _check_version_and_update(local)
            result = robot_config(**merge([default._asdict(), local]))

    except FileNotFoundError:
        log.warning('Config {0} not found. Loading defaults'.format(filename))

    return result


def save(config, filename=None, tag=None):
    filename = filename or environment.get_path('OT_CONFIG_FILE')
    if tag:
        root, ext = os.path.splitext(filename)
        filename = "{}-{}{}".format(root, tag, ext)
    _default = children(_get_default()._asdict())

    diff = build([
        item for item in children(config._asdict())
        if item not in _default
    ])

    with open(filename, 'w') as file:
        json.dump(diff, file, sort_keys=True, indent=4)
        return diff


def clear(filename=None):
    filename = filename or environment.get_path('OT_CONFIG_FILE')
    log.info('Deleting config file: {}'.format(filename))
    if os.path.exists(filename):
        os.remove(filename)


def _check_version_and_update(config_json):
    version = config_json.get('version', 0)
    if version == 0:
        # add a version number to the config
        config_json['version'] = 1
        # overwrite instrument_offset to the default
        config_json['instrument_offset'] = default.instrument_offset.copy()
        return _check_version_and_update(config_json)

