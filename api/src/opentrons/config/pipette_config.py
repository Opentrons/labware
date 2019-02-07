import copy
import logging
import json
import re
from collections import namedtuple
from typing import Any, Dict, List
import pkgutil

from opentrons.config import feature_flags as ff, CONFIG


log = logging.getLogger(__name__)

pipette_config = namedtuple(
    'pipette_config',
    [
        'plunger_positions',
        'pick_up_current',
        'pick_up_distance',
        'aspirate_flow_rate',
        'dispense_flow_rate',
        'channels',
        'model_offset',
        'plunger_current',
        'drop_tip_current',
        'drop_tip_speed',
        'min_volume',
        'max_volume',
        'ul_per_mm',
        'quirks',
        'tip_length',  # TODO (andy): remove from pipette, move to tip-rack
        'display_name'
    ]
)

# Notes:
# - multi-channel pipettes share the same dimensional offsets
# - single-channel pipettes have different lengths
# - Default number of seconds to aspirate/dispense a pipette's full volume,
#     and these times were chosen to mimic normal human-pipetting motions.
#     However, accurate speeds are dependent on environment (ex: liquid
#     viscosity), therefore a pipette's flow-rates (ul/sec) should be set by
#     protocol writer

# Multi-channel y offset caluclations:
DISTANCE_BETWEEN_NOZZLES = 9
NUM_MULTI_CHANNEL_NOZZLES = 8
MULTI_LENGTH = (NUM_MULTI_CHANNEL_NOZZLES - 1) * DISTANCE_BETWEEN_NOZZLES
Y_OFFSET_MULTI = MULTI_LENGTH / 2
Z_OFFSET_MULTI = -25.8

Z_OFFSET_P10 = -13  # longest single-channel pipette
Z_OFFSET_P50 = 0
Z_OFFSET_P300 = 0
Z_OFFSET_P1000 = 20  # shortest single-channel pipette

HAS_MODEL_RE = re.compile('^p.+_v.+$')
#: If a prospective model string matches this, it has a full model number


def model_config() -> Dict[str, Any]:
    """ Load the per-pipette-model config file from within the wheel """
    return json.loads(
        pkgutil.get_data(
            'opentrons', 'shared_data/robot-data/pipetteModelSpecs.json')
        or '{}')


def name_config() -> Dict[str, Any]:
    """ Load the per-pipette-name config file from within the wheel """
    return json.loads(
        pkgutil.get_data(
            'opentrons', 'shared_data/robot-data/pipetteNameSpecs.json')
        or '{}')


configs = list(model_config().keys())
#: A list of pipette model names for which we have config entries


def load(pipette_model: str, pipette_id: str = None) -> pipette_config:
    """
    Load pipette config data


    This function loads from a combination of

    - the pipetteModelSpecs.json file in the wheel (should never be edited)
    - the pipetteNameSpecs.json file in the wheel(should never be edited)
    - any config overrides found in
      ``opentrons.config.CONFIG['pipette_config_overrides_dir']``

    This function reads from disk each time, so changes to the overrides
    will be picked up in subsequent calls.

    :param str pipette_model: The pipette model name (i.e. "p10_single_v1.3")
                              for which to load configuration
    :param pipette_id: An (optional) unique ID for the pipette to locate
                       config overrides. If the ID is not specified, the system
                       assumes this is a simulated pipette and does not
                       save settings. If the ID is specified but no overrides
                       corresponding to the ID are found, the system creates a
                       new overrides file for it.
    :type pipette_id: str or None
    :raises KeyError: if ``pipette_model`` is not in the top-level keys of
                      pipetteModeLSpecs.json (and therefore not in
                      :py:attr:`configs`)

    :returns pipette_config: The configuration, loaded and checked
    """
<<<<<<< HEAD
=======
    with open(config_model_file) as model_cfg_file:
        model = json.load(model_cfg_file)
        mutable_configs = model['mutableConfigs']
        cfg = model['config'][pipette_model]
>>>>>>> refactor config shapes

    # Load the model config and update with the name config
    cfg = copy.copy(model_config()[pipette_model])
    cfg.update(copy.copy(name_config()[cfg['name']]))

    # Load overrides if we have a pipette id
    if pipette_id:
        cfg.update(load_overrides(pipette_id))

    plunger_pos = is_mutable(cfg, 'plungerPositions',  mutable_configs)

    # the ulPerMm functions are structured in pipetteModelSpecs.json as
    # a list sorted from oldest to newest. That means the latest functions
    # are always the last element and, as of right now, the older ones are
    # the first element (for models that only have one function, the first
    # and last elements are the same, which is fine). If we add more in the
    # future, we’ll have to change this code to select items more
    # intelligently
    if ff.use_old_aspiration_functions():
        log.info("Using old aspiration functions")
        ul_per_mm = cfg['ulPerMm'][0]
    else:
        log.info("Using new aspiration functions")
        ul_per_mm = cfg['ulPerMm'][-1]

    res = pipette_config(
        plunger_positions={
            'top': plunger_pos.get('top'),
            'bottom': plunger_pos.get('bottom'),
            'blow_out': plunger_pos.get('blowOut'),
            'drop_tip': plunger_pos.get('dropTip'),
        },
        pick_up_current=is_mutable(cfg, 'pickUpCurrent', mutable_configs),
        pick_up_distance=is_mutable(cfg, 'pickUpDistance', mutable_configs),
        aspirate_flow_rate=is_mutable(cfg, 'defaultAspirateFlowRate', mutable_configs),
        dispense_flow_rate=is_mutable(cfg, 'defaultDispenseFlowRate', mutable_configs),
        channels=is_mutable(cfg, 'channels', mutable_configs),
        model_offset=is_mutable(cfg, 'modelOffset', mutable_configs),
        plunger_current=is_mutable(cfg, 'plungerCurrent', mutable_configs),
        drop_tip_current=is_mutable(cfg, 'dropTipCurrent', mutable_configs),
        drop_tip_speed=is_mutable(cfg, 'dropTipSpeed', mutable_configs),
        min_volume=is_mutable(cfg, 'minVolume', mutable_configs),
        max_volume=is_mutable(cfg, 'maxVolume', mutable_configs),
        ul_per_mm=ul_per_mm,
        quirks=is_mutable(cfg, 'quirks', mutable_configs),
        tip_length=is_mutable(cfg, 'tipLength', mutable_configs),
        display_name=is_mutable(cfg, 'displayName', mutable_configs)
    )

    # Verify that stored values agree with calculations
    if 'multi' in pipette_model:
        assert res.model_offset[1] == Y_OFFSET_MULTI
        assert res.model_offset[2] == Z_OFFSET_MULTI
    elif 'p1000' in pipette_model:
        assert res.model_offset[1] == 0.0
        assert res.model_offset[2] == Z_OFFSET_P1000
    elif 'p10' in pipette_model:
        assert res.model_offset[1] == 0.0
        assert res.model_offset[2] == Z_OFFSET_P10
    elif 'p300' in pipette_model:
        assert res.model_offset[1] == 0.0
        assert res.model_offset[2] == Z_OFFSET_P300
    else:
        assert res.model_offset[1] == 0.0
        assert res.model_offset[2] == Z_OFFSET_P50

    return res


def piecewise_volume_conversion(
        ul: float, sequence: List[List[float]]) -> float:
    """
    Takes a volume in microliters and a sequence representing a piecewise
    function for the slope and y-intercept of a ul/mm function, where each
    sub-list in the sequence contains:

      - the max volume for the piece of the function (minimum implied from the
        max of the previous item or 0
      - the slope of the segment
      - the y-intercept of the segment

    :return: the ul/mm value for the specified volume
    """
    # pick the first item from the seq for which the target is less than
    # the bracketing element
    i = list(filter(lambda x: ul <= x[0], sequence))[0]
    # use that element to calculate the movement distance in mm
    return i[1]*ul + i[2]


<<<<<<< HEAD
def save_overrides(pipette_id: str, overrides: Dict[str, Any]):
    override_dir = CONFIG['pipette_config_overrides_dir']
    existing = load_overrides(pipette_id)
    existing.update(overrides)
    json.dump(existing, (override_dir/f'{pipette_id}.json').open('w'))


def load_overrides(pipette_id: str) -> Dict[str, Any]:
    overrides = CONFIG['pipette_config_overrides_dir']
    try:
        fi = (overrides/f'{pipette_id}.json').open()
    except FileNotFoundError:
        return {}
    try:
        return json.load(fi)
    except json.JSONDecodeError as e:
        log.warning(f'pipette override for {pipette_id} is corrupt: {e}')
        return {}
=======
def is_mutable(config: dict, name: str, mutable_config_list: List[str]):
    if len(config.get(name)) > 1:
        value = {}
        for key in config.get(name).keys():
            if key in mutable_config_list:
                value[key] = config.get(key)['value']
    else:
        value = config.get(name)
        if name in mutable_config_list:
            value = value['value']
    return value
>>>>>>> refactor config shapes
