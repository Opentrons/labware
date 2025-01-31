import argparse
import csv
import json
from ast import literal_eval
from typing import Optional, Dict, Union, Any, List
from pathlib import Path
from pydantic import BaseModel
import math

from ... import get_shared_data_root
from ..pipette_definition import (
    PipetteGeometryDefinition,
    PipetteLiquidPropertiesDefinition,
    PipettePhysicalPropertiesDefinition,
    PlungerPositions,
    SupportedTipsDefinition,
    MotorConfigurations,
    PartialTipDefinition,
    AvailableSensorDefinition,
    PickUpTipConfigurations,
    PressFitPickUpTipConfiguration,
    DropTipConfigurations,
    PlungerEjectDropTipConfiguration,
)

from ..types import PipetteModelSpec


PIPETTE_DEFINITION_ROOT = Path("pipette") / "definitions" / "2"
GEOMETRY_ROOT = get_shared_data_root() / PIPETTE_DEFINITION_ROOT / "geometry"
GENERAL_ROOT = get_shared_data_root() / PIPETTE_DEFINITION_ROOT / "general"
LIQUID_ROOT = get_shared_data_root() / PIPETTE_DEFINITION_ROOT / "liquid"

GENERAL_SCHEMA = "#/pipette/schemas/2/pipettePropertiesSchema.json"
LIQUID_SCHEMA = "#/pipette/schemas/2/pipetteLiquidPropertiesSchema.json"
GEOMETRY_SCHEMA = "#/pipette/schemas/2/pipetteGeometryPropertiesSchema.json"


def _build_pickup_tip_data(
    model_configurations: Optional[PipetteModelSpec] = None,
) -> PickUpTipConfigurations:
    presses = 0
    increment = 0
    distance = 0.0
    if model_configurations:
        current = model_configurations["pickUpCurrent"]["value"]
        speed = model_configurations["pickUpSpeed"]["value"]
        presses = model_configurations["pickUpPresses"]["value"]
        increment = int(model_configurations["pickUpIncrement"]["value"])
        distance = model_configurations["pickUpDistance"]["value"]
    else:
        print("Handling pick up tip configurations\n")
        speed = float(input("please provide the speed\n"))
        presses = int(input("please provide the number of presses for force pick up\n"))
        increment = int(
            input(
                "please provide the increment to move the pipette down for force pickup\n"
            )
        )
        distance = float(
            input("please provide the starting distance for pick up tip\n")
        )
    print(
        f"TODO: Current {current}, speed {speed} and distance {distance} is not used yet"
    )
    return PickUpTipConfigurations(
        pressFit=PressFitPickUpTipConfiguration(
            presses=presses, increment=increment, configurationsByNozzleMap={}
        )
    )


def _build_drop_tip_data(
    model_configurations: Optional[PipetteModelSpec] = None,
) -> DropTipConfigurations:
    if model_configurations:
        current = model_configurations["dropTipCurrent"]["value"]
        speed = model_configurations["dropTipSpeed"]["value"]
    else:
        print("Handling drop tip configurations\n")
        speed = float(input("please provide the speed\n"))
    return DropTipConfigurations(
        plungerEject=PlungerEjectDropTipConfiguration(
            current=current,
            speed=speed,
        ),
        camAction=None,
    )


def _build_plunger_positions(
    model_configurations: Optional[PipetteModelSpec] = None,
) -> PlungerPositions:
    if model_configurations:
        top = model_configurations["top"]["value"]
        bottom = model_configurations["bottom"]["value"]
        blow_out = model_configurations["blowout"]["value"]
        drop_tip = model_configurations["dropTip"]["value"]
    else:
        print("Handling plunger motor positions\n")
        top = float(input("Please provide the top plunger position\n"))
        bottom = float(input("Please provide the bottom plunger position\n"))
        blow_out = float(input("Please provide the blow out plunger position\n"))
        drop_tip = float(input("Please provide the drop tip plunger position\n"))
    return PlungerPositions(top=top, bottom=bottom, blowout=blow_out, drop=drop_tip)


def _build_motor_configurations(
    model_configurations: Optional[PipetteModelSpec] = None,
) -> MotorConfigurations:
    if model_configurations:
        run = model_configurations["plungerCurrent"]["value"]
        idle = model_configurations.get("idleCurrent", run)
    else:
        print("Handling default plunger motor currents\n")
        idle = float(
            input("Please provide the default idle current of the plunger motor\n")
        )
        run = float(
            input("Please provide the default run current of the plunger motor\n")
        )
    return MotorConfigurations(idle=idle, run=run)


def _build_partial_tip_configurations(channels: int) -> PartialTipDefinition:
    if channels == 8:
        return PartialTipDefinition(
            partialTipSupported=True, availableConfigurations=[1, 2, 3, 4, 5, 6, 7, 8]
        )
    elif channels == 96:
        return PartialTipDefinition(
            partialTipSupported=True, availableConfigurations=[1, 8, 12, 96]
        )
    else:
        return PartialTipDefinition(partialTipSupported=False)


def build_geometry_model_v2(
    input_dictionary: Dict[str, Any]
) -> PipetteGeometryDefinition:
    return PipetteGeometryDefinition.model_validate(input_dictionary)


def build_liquid_model_v2(
    input_dictionary: Dict[str, Any],
    supported_tip_configurations: Dict[str, SupportedTipsDefinition],
) -> PipetteLiquidPropertiesDefinition:
    if input_dictionary:
        if input_dictionary.get("partialTipConfigurations"):
            return PipetteLiquidPropertiesDefinition.model_validate(
                {**input_dictionary, "supportedTips": supported_tip_configurations}
            )
        else:
            return PipetteLiquidPropertiesDefinition.model_validate(
                {
                    **input_dictionary,
                    "supportedTips": supported_tip_configurations,
                }
            )
    max_volume = int(input("please provide the max volume of the pipette\n"))
    min_volume = float(input("please provide the min volume of the pipette\n"))
    default_tipracks = input(
        "please input the load names of default tipracks separated by commas\n"
    )
    list_default_tipracks = default_tipracks.split(",")
    return PipetteLiquidPropertiesDefinition.model_validate(
        {
            "supportedTips": supported_tip_configurations,
            "maxVolume": max_volume,
            "minVolume": min_volume,
            "defaultTipracks": list_default_tipracks,
        }
    )


def build_physical_model_v2(
    input_dictionary: Optional[Dict[str, Any]], pipette_type: Optional[str] = None
) -> PipettePhysicalPropertiesDefinition:
    if input_dictionary:
        available_sensors = AvailableSensorDefinition(
            sensors=input_dictionary.pop("availableSensors", [])
        )
        back_compat_names = input_dictionary.pop("backCompatNames", [])
        return PipettePhysicalPropertiesDefinition.model_validate(
            {
                **input_dictionary,
                "availableSensors": available_sensors,
                "backCompatNames": back_compat_names,
            }
        )
    print(f"Handling general pipette information for {pipette_type}\n")
    display_name = input("please provide the product name of the pipette\n")

    display_category = input("please provide the model generation of the pipette\n")
    input_available_sensors = input(
        "Please provide a list of available sensors, separated by comma\n"
    )
    channels = input(f"Please provide the number of channels your {pipette_type} has\n")
    shaft_diam = float(input(f"Please provide the shaft diameter of {pipette_type}\n"))
    shaft_ul_per_mm = float(
        input(f"Please provide the uL to mm conversion for {pipette_type}\n")
    )
    pick_up_tip_configurations = _build_pickup_tip_data()
    drop_tip_configurations = _build_drop_tip_data()
    plunger_positions = _build_plunger_positions()
    plunger_motor_configurations = _build_motor_configurations()
    partial_tip_configurations = _build_partial_tip_configurations(int(channels))

    back_compat_names_str = input(
        "Please list compatible pipette names separated by commas or hit enter if none"
    )
    if back_compat_names_str:
        back_compat_names = [i.strip() for i in back_compat_names_str.split(",")]
    else:
        back_compat_names = []
    return PipettePhysicalPropertiesDefinition.model_validate(
        {
            "displayName": display_name,
            "model": pipette_type,
            "displayCategory": display_category,
            "pickUpTipConfigurations": pick_up_tip_configurations,
            "dropTipConfigurations": drop_tip_configurations,
            "plungerMotorConfigurations": plunger_motor_configurations,
            "plungerPositionsConfigurations": plunger_positions,
            "availableSensors": AvailableSensorDefinition(
                sensors=input_available_sensors.split(",")
            ),
            "partialTipConfigurations": partial_tip_configurations,
            "channels": channels,
            "shaftDiameter": shaft_diam,
            "shaftULperMM": shaft_ul_per_mm,
            "backCompatNames": back_compat_names,
        }
    )


def build_supported_tips(input_dictionary: Dict[str, Any]) -> SupportedTipsDefinition:
    return SupportedTipsDefinition.model_validate(input_dictionary)


def save_to_file(
    directorypath: Path,
    file_name: str,
    data: Union[BaseModel, Dict[str, Any]],
    schema_path: str,
) -> None:
    """
    Function used to save data to a file
    """

    directorypath.mkdir(parents=True, exist_ok=True)
    filepath = directorypath / f"{file_name}.json"
    if isinstance(data, BaseModel):
        # We have to rely on the json serialization of the
        # pydantic model to properly convert special objects
        # such as (pipetteModelType) to a string. However,
        # we also want to add in a new key on top of the
        # data in the pydantic model so we need to convert it
        # back to a dictionary before saving to file.
        json_basemodel = data.json(by_alias=True)
        dict_basemodel = json.loads(json_basemodel)
        dict_basemodel["$otSharedSchema"] = schema_path
        filepath.write_text(
            json.dumps(dict_basemodel, ensure_ascii=False), encoding="utf-8"
        )
    else:
        data["$otSharedSchema"] = schema_path
        filepath.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def migrate_new_blow_out_configs_v2() -> None:
    pipette_volumes = {
        1: ["p10", "p50", "p300", "p1000"],
        2: ["p20", "p300", "p1000"],
        3: ["p50", "p1000"],
    }

    for pipette_gen in range(1, 4):  # gen 1, gen 2, gen 3
        print(f"\nTaking data for gen{pipette_gen} pipettes:")
        # overwrite and pass in dict with user input for each gen
        shaft_diameters = {
            vol: float(input(f"Enter shaft diameter for gen{pipette_gen} {vol}: "))
            for vol in pipette_volumes[pipette_gen]
        }
        fill_blowout_configs(pipette_gen, shaft_diameters, pipette_volumes[pipette_gen])


def fill_blowout_configs(
    pipette_gen: int, shaft_diameters: Dict[str, float], volumes: List[str]
) -> None:

    general_config_files = Path(GENERAL_ROOT).glob("*")
    for pipette_type in general_config_files:  # single, eight, 96-channel
        for volume in volumes:  # pipette max volume- p10, p20, p50, etc.
            shaft_diameter = shaft_diameters[volume]
            # calculate uL per mm, default blowout vol
            ul_per_mm = math.pi * (shaft_diameter / 2) ** 2
            # get path for every file version for the pipette gen at hand
            volume_path = Path(pipette_type / volume)
            for general_file_version in volume_path.glob(f"{str(pipette_gen)}_*.json"):
                with open(general_file_version, "r") as file:
                    general_config_dict = json.load(file)
                general_config_dict["shaftDiameter"] = round(shaft_diameter, 3)
                general_config_dict["shaftULperMM"] = round(ul_per_mm, 3)

                # get file path to pass into save_to_file
                gen_path = GENERAL_ROOT / pipette_type / volume
                version_str = str(general_file_version).split("/")[-1][:-5]
                save_to_file(gen_path, version_str, general_config_dict, GENERAL_SCHEMA)


def build_new_pipette_model_v2(
    pipette_functions_dict: Dict[str, Any], pipette_model_csv: str
) -> None:
    """
    Build a brand new pipette model from user inputted data.
    """
    top_level_pipette_model = {}
    with open(pipette_model_csv, "r") as f:
        reader = csv.reader(f)
        current_key = None
        for row in reader:
            if row[0]:
                current_key = row[0]
                top_level_pipette_model[current_key] = {row[1]: literal_eval(row[2])}
            elif current_key:
                top_level_pipette_model[current_key][row[1]] = literal_eval(row[2])
            else:
                continue
    geometry_model = build_geometry_model_v2(top_level_pipette_model["geometry"])
    liquid_model = build_liquid_model_v2(
        top_level_pipette_model["liquid"],
        pipette_functions_dict,
    )
    liquid_model_dict = liquid_model.model_dump(by_alias=True)
    liquid_model_dict["supportedTips"] = {
        k.name: v for k, v in liquid_model_dict["supportedTips"].items()
    }
    pipette_type = f"p{liquid_model.max_volume}"
    physical_model = build_physical_model_v2(
        {
            **top_level_pipette_model["general"],
            "plungerMotorConfigurations": top_level_pipette_model[
                "plungerMotorConfigurations"
            ],
            "plungerPositionsConfigurations": top_level_pipette_model[
                "plungerPositionsConfigurations"
            ],
            "pickUpTipConfigurations": top_level_pipette_model[
                "pickUpTipConfigurations"
            ],
            "dropTipConfigurations": top_level_pipette_model["dropTipConfigurations"],
            "partialTipConfigurations": _build_partial_tip_configurations(
                top_level_pipette_model["general"]["channels"]
            ),
        },
        pipette_type,
    )

    major_version = input("please provide the major version of this pipette model\n")
    minor_version = input("please provide the minor version of this pipette model\n")

    file_name = f"{major_version}_{minor_version}"
    current_pipette_path = Path(physical_model.channels.name.lower()) / pipette_type

    save_to_file(
        GEOMETRY_ROOT / current_pipette_path, file_name, geometry_model, GEOMETRY_SCHEMA
    )
    save_to_file(
        GENERAL_ROOT / current_pipette_path, file_name, physical_model, GENERAL_SCHEMA
    )
    save_to_file(
        LIQUID_ROOT / current_pipette_path, file_name, liquid_model_dict, LIQUID_SCHEMA
    )


def main() -> None:
    """Entry point."""
    parser = argparse.ArgumentParser(
        description="96 channel tip handling testing script."
    )
    parser.add_argument(
        "--path_to_pipette_model",
        type=str,
        help="the csv filled with data to build a pipette model",
        default=None,
    )
    parser.add_argument(
        "--migrate_blowout_configs",
        type=bool,
        help="If true, migrate new blowout configs to existing json files",
        default=False,
    )

    args = parser.parse_args()
    if args.migrate_blowout_configs:
        migrate_new_blow_out_configs_v2()
    else:
        using_csv = "" if args.path_to_pipette_model else "out"
        print(f"Building new pipette function with{using_csv} using csv")

        next_tip = True
        pipette_functions_dict: Dict[str, Any] = {}
        while next_tip:
            print("Preparing pipetting function table from csv\n")
            tip_volume = input("Please provide the next tip volume\n")
            tiprack = input(
                "Please provide the tiprack/tip type associated with this data\n"
            )
            path_to_data = input("Please provide the data path to the csv\n")
            csv_dict = pipette_functions_dict.get(f"t{tip_volume}", {})
            with open(path_to_data, "r") as f:
                reader = csv.reader(f)
                pipetting_key = None
                for row in reader:
                    current_key_exists = csv_dict.get(row[0])
                    if row[0] == "aspirate" or row[0] == "dispense":
                        pipetting_key = row[0]
                        if current_key_exists:
                            csv_dict[pipetting_key][f"{tiprack}"].append(
                                [float(row[1]), float(row[2]), float(row[3])]
                            )
                        else:
                            csv_dict[pipetting_key] = {
                                f"{tiprack}": [
                                    [float(row[1]), float(row[2]), float(row[3])]
                                ]
                            }
                    elif pipetting_key and not row[0]:
                        csv_dict[pipetting_key][f"{tiprack}"].append(
                            [float(row[1]), float(row[2]), float(row[3])]
                        )
                    else:
                        pipetting_key = None
                        if current_key_exists:
                            continue
                        csv_dict[row[0]] = row[1]
            pipette_functions_dict[f"t{tip_volume}"] = csv_dict
            cont = input("Additional tips? Please enter y/n")

            next_tip = cont == "y" or cont == "yes"
        converted_pipette_functions_dict = {
            k: build_supported_tips(d) for k, d in pipette_functions_dict.items()
        }

        print(
            "Please review the aspirate and dispense functions once the pipette model is built.\n"
        )
        build_new_pipette_model_v2(
            converted_pipette_functions_dict, args.path_to_pipette_model
        )


if __name__ == "__main__":
    """
    A script to automate building a pipette configuration definition.

    This script can either perform migrations from a v1 -> v2 schema format
    or build a brand new script from scratch.

    When building a new pipette configuration model, you will either need
    to provide CSVs or use command line inputs.

    If you choose CSVs you will need one CSV for the general pipette configuration
    data (such as pipette model or number of channels) and one for every tip
    type that this pipette model can support.
    """
    main()
