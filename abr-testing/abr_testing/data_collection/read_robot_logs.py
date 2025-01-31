"""ABR Read Robot Logs.

This library has functions to download logs from robots, extracting wanted information,
and uploading to a google sheet using credentials and google_sheets_tools module
saved in a local directory.
"""
import csv
import subprocess
from datetime import datetime
import os
from abr_testing.data_collection.error_levels import ERROR_LEVELS_PATH
from typing import List, Dict, Any, Tuple, Set, Optional
import time as t
import json
import requests
from abr_testing.tools import plate_reader


def lpc_data(
    file_results: Dict[str, Any],
    protocol_info: Dict[str, Any],
    runs_and_lpc: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Get labware offsets from one run log."""
    offsets = file_results.get("labwareOffsets", "")
    # TODO: per UNIQUE slot AND LABWARE TYPE only keep the most recent LPC recording
    unique_offsets: Dict[Any, Any] = {}
    headers_lpc = []
    if len(offsets) > 0:
        for offset in offsets:
            labware_type = offset.get("definitionUri", "")
            slot = offset["location"].get("slotName", "")
            module_location = offset["location"].get("moduleModel", "")
            adapter = offset["location"].get("definitionUri", "")
            x_offset = offset["vector"].get("x", 0.0)
            y_offset = offset["vector"].get("y", 0.0)
            z_offset = offset["vector"].get("z", 0.0)
            created_at = offset.get("createdAt", "")
            if (
                slot,
                labware_type,
            ) not in unique_offsets or created_at > unique_offsets[
                (slot, labware_type)
            ][
                "createdAt"
            ]:
                unique_offsets[(slot, labware_type)] = {
                    **protocol_info,
                    "createdAt": created_at,
                    "Labware Type": labware_type,
                    "Slot": slot,
                    "Module": module_location,
                    "Adapter": adapter,
                    "X": x_offset,
                    "Y": y_offset,
                    "Z": z_offset,
                }
        for item in unique_offsets:
            runs_and_lpc.append(unique_offsets[item].values())
        headers_lpc = list(unique_offsets[(slot, labware_type)].keys())
    return runs_and_lpc, headers_lpc


def command_time(command: Dict[str, str]) -> float:
    """Calculate total create and complete time per command."""
    try:
        start_time = datetime.strptime(
            command.get("startedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
        )
        complete_time = datetime.strptime(
            command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
        )
        start_to_complete = (complete_time - start_time).total_seconds()
    except ValueError:
        start_to_complete = 0
    return start_to_complete


def count_command_in_run_data(
    commands: List[Dict[str, Any]], command_of_interest: str, find_avg_time: bool
) -> Tuple[int, float]:
    """Count number of times command occurs in a run."""
    total_command = 0
    total_time = 0.0
    for command in commands:
        command_type = command["commandType"]
        if command_type == command_of_interest:
            total_command += 1
            if find_avg_time:
                started_at = command.get("startedAt", "")
                completed_at = command.get("completedAt", "")

                if started_at and completed_at:
                    try:
                        start_time = datetime.strptime(
                            started_at, "%Y-%m-%dT%H:%M:%S.%f%z"
                        )
                        end_time = datetime.strptime(
                            completed_at, "%Y-%m-%dT%H:%M:%S.%f%z"
                        )
                        total_time += (end_time - start_time).total_seconds()
                    except ValueError:
                        # Handle case where date parsing fails
                        pass
    avg_time = total_time / total_command if total_command > 0 else 0.0
    return total_command, avg_time


def identify_labware_ids(
    file_results: Dict[str, Any], labware_name: Optional[str]
) -> List[str]:
    """Determine what type of labware is being picked up."""
    list_of_labware_ids: List[str] = []
    if labware_name:
        labwares = file_results.get("labware", "")
        list_of_labware_ids = []
        if len(labwares) > 1:
            for labware in labwares:
                load_name = labware["loadName"]
                if load_name == labware_name:
                    labware_id = labware["id"]
                    list_of_labware_ids.append(labware_id)
    return list_of_labware_ids


def match_pipette_to_action(
    command_dict: Dict[str, Any],
    commandTypes: List[str],
    right_pipette: Optional[str],
    left_pipette: Optional[str],
) -> Tuple[int, int]:
    """Match pipette id to id in command."""
    right_pipette_add = 0
    left_pipette_add = 0
    for command in commandTypes:
        command_type = command_dict["commandType"]
        command_params = command_dict.get("params", "")
        command_pipette = command_params.get("pipetteId", "")
        if command_type == command and command_pipette == right_pipette:
            right_pipette_add = 1
        elif command_type == command and command_pipette == left_pipette:
            left_pipette_add = 1
    return left_pipette_add, right_pipette_add


def instrument_commands(
    file_results: Dict[str, Any], labware_name: Optional[str]
) -> Dict[str, float]:
    """Count number of pipette and gripper commands per run."""
    pipettes = file_results.get("pipettes", "")
    commandData = file_results.get("commands", "")
    left_tip_pick_up = 0.0
    left_aspirate = 0.0
    right_tip_pick_up = 0.0
    right_aspirate = 0.0
    left_dispense = 0.0
    right_dispense = 0.0
    right_pipette_id = ""
    left_pipette_id = ""
    gripper_pickups = 0.0
    gripper_labware_of_interest = 0.0
    avg_liquid_probe_time_sec = 0.0
    list_of_labware_ids = identify_labware_ids(file_results, labware_name)
    # Match pipette mount to id
    for pipette in pipettes:
        if pipette["mount"] == "right":
            right_pipette_id = pipette["id"]
        elif pipette["mount"] == "left":
            left_pipette_id = pipette["id"]
    for command in commandData:
        # Count pick ups
        single_left_pickup, single_right_pickup = match_pipette_to_action(
            command, ["pickUpTip"], right_pipette_id, left_pipette_id
        )
        right_tip_pick_up += single_right_pickup
        left_tip_pick_up += single_left_pickup
        # Count aspirates
        single_left_aspirate, single_right_aspirate = match_pipette_to_action(
            command, ["aspirate"], right_pipette_id, left_pipette_id
        )
        right_aspirate += single_right_aspirate
        left_aspirate += single_left_aspirate
        # count dispenses/blowouts
        single_left_dispense, single_right_dispense = match_pipette_to_action(
            command, ["blowOut", "dispense"], right_pipette_id, left_pipette_id
        )
        right_dispense += single_right_dispense
        left_dispense += single_left_dispense
        # count gripper actions
        commandType = command["commandType"]
        if (
            commandType == "moveLabware"
            and command["params"]["strategy"] == "usingGripper"
        ):
            gripper_pickups += 1
            labware_moving = command["params"]["labwareId"]
            if labware_moving in list_of_labware_ids:
                gripper_labware_of_interest += 1
    liquid_probes, avg_liquid_probe_time_sec = count_command_in_run_data(
        commandData, "liquidProbe", True
    )
    pipette_dict = {
        "Left Pipette Total Tip Pick Up(s)": left_tip_pick_up,
        "Left Pipette Total Aspirates": left_aspirate,
        "Left Pipette Total Dispenses": left_dispense,
        "Right Pipette Total Tip Pick Up(s)": right_tip_pick_up,
        "Right Pipette Total Aspirates": right_aspirate,
        "Right Pipette Total Dispenses": right_dispense,
        "Gripper Pick Ups": gripper_pickups,
        f"Gripper Pick Ups of {labware_name}": gripper_labware_of_interest,
        "Total Liquid Probes": liquid_probes,
        "Average Liquid Probe Time (sec)": avg_liquid_probe_time_sec,
    }
    return pipette_dict


def get_comment_result_by_string(file_results: Dict[str, Any], key_phrase: str) -> str:
    """Get comment string based off ky phrase."""
    commandData = file_results.get("commands", "")
    result_str = command_str = ""
    for command in commandData:
        commandType = command["commandType"]
        if commandType == "comment":
            command_str = command["params"].get("message", "")
        try:
            result_str = command_str.split(key_phrase)[1]
        except IndexError:
            continue
    return result_str


def get_protocol_version_number(file_results: Dict[str, Any]) -> str:
    """Get protocol version number."""
    return get_comment_result_by_string(file_results, "Protocol Version: ")


def get_liquid_waste_height(file_results: Dict[str, Any]) -> float:
    """Find liquid waste height."""
    result_str = get_comment_result_by_string(
        file_results, "Liquid Waste Total Height: "
    )
    try:
        height = float(result_str)
    except ValueError:
        height = 0.0
    return height


def liquid_height_commands(
    file_results: Dict[str, Any], all_heights_list: List[List[Any]]
) -> List[List[Any]]:
    """Record found liquid heights during a protocol."""
    commandData = file_results.get("commands", "")
    robot = file_results.get("robot_name", "")
    run_id = file_results.get("run_id", "")
    list_of_heights = []
    print(robot)
    liquid_waste_height = 0.0
    for command in commandData:
        commandType = command["commandType"]
        if commandType == "comment":
            result = command["params"].get("message", "")
            try:
                result_str = "'" + result.split("result: {")[1] + "'"
                entries = result_str.split(", (")
                comment_time = command["completedAt"]
                for entry in entries:
                    height = float(entry.split(": ")[1].split("'")[0].split("}")[0])
                    labware_type = str(
                        entry.split(",")[0].replace("'", "").replace("(", "")
                    )
                    well_location = str(entry.split(", ")[1].split(" ")[0])
                    slot_location = str(entry.split("slot ")[1].split(")")[0])
                    labware_name = str(entry.split("of ")[1].split(" on")[0])
                    if labware_name == "Liquid Waste":
                        liquid_waste_height += height
                    one_entry = {
                        "Timestamp": comment_time,
                        "Labware Name": labware_name,
                        "Labware Type": labware_type,
                        "Slot Location": slot_location,
                        "Well Location": well_location,
                        "All Heights (mm)": height,
                    }
                    list_of_heights.append(one_entry)
            except (IndexError, ValueError):
                continue
    if len(list_of_heights) > 0:
        all_heights_list[0].append(robot)
        all_heights_list[1].append(run_id)
        all_heights_list[2].append(list_of_heights)
        all_heights_list[3].append(liquid_waste_height)
    return all_heights_list


def plate_reader_commands(
    file_results: Dict[str, Any],
    hellma_plate_standards: List[Dict[str, Any]],
    orientation: bool,
) -> Dict[str, object]:
    """Plate Reader Command Counts."""
    commandData = file_results.get("commands", "")
    move_lid_count: int = 0
    initialize_count: int = 0
    read = "no"
    final_result = {}
    read_num = 0
    # Count Number of Reads per measure mode
    read_count, avg_read_time = count_command_in_run_data(
        commandData, "absorbanceReader/read", True
    )
    # Count Number of Initializations per measure mode
    initialize_count, avg_initialize_time = count_command_in_run_data(
        commandData, "absorbanceReader/initialize", True
    )
    # Count Number of Lid Movements
    for command in commandData:
        commandType = command["commandType"]
        if (
            commandType == "absorbanceReader/openLid"
            or commandType == "absorbanceReader/closeLid"
        ):
            move_lid_count += 1
        elif commandType == "absorbanceReader/read":
            read = "yes"
        elif read == "yes" and commandType == "comment":
            result = command["params"].get("message", "")
            if "result:" in result or "Result:" in result:
                try:
                    plate_name = result.split("result:")[0]
                    formatted_result = result.split("result: ")[1]
                except IndexError:
                    plate_name = result.split("Result:")[0]
                    formatted_result = result.split("Result: ")[1]
                result_dict = eval(formatted_result)
                result_dict_keys = list(result_dict.keys())
                if len(result_dict_keys) > 1:
                    read_type = "multi"
                else:
                    read_type = "single"
                if "hellma_plate" in plate_name:
                    for wavelength in result_dict_keys:
                        one_wavelength_dict = result_dict.get(wavelength)
                        result_ndarray = plate_reader.convert_read_dictionary_to_array(
                            one_wavelength_dict
                        )
                        for item in hellma_plate_standards:
                            wavelength_of_interest = item["wavelength"]
                            if str(wavelength) == str(wavelength_of_interest):
                                error_cells = plate_reader.check_byonoy_data_accuracy(
                                    result_ndarray, item, orientation
                                )
                                if len(error_cells[0]) > 0:
                                    percent = (96 - len(error_cells)) / 96 * 100
                                    for cell in error_cells:
                                        print(
                                            "FAIL: Cell "
                                            + str(cell)
                                            + " out of accuracy spec."
                                        )
                                else:
                                    percent = 100
                                    print(
                                        f"PASS: {wavelength_of_interest} meet accuracy spec."
                                    )
                                final_result[read_type, wavelength, read_num] = percent
                                read_num += 1
                else:
                    final_result = result_dict
                read = "no"
    plate_dict = {
        "Plate Reader # of Reads": read_count,
        "Plate Reader Avg Read Time (sec)": avg_read_time,
        "Plate Reader # of Initializations": initialize_count,
        "Plate Reader Avg Initialize Time (sec)": avg_initialize_time,
        "Plate Reader # of Lid Movements": move_lid_count,
        "Plate Reader Result": final_result,
    }
    return plate_dict


def hs_commands(file_results: Dict[str, Any]) -> Dict[str, float]:
    """Gets total latch engagements, homes, rotations and total on time (sec) for heater shaker."""
    # TODO: modify for cases that have more than 1 heater shaker.
    commandData = file_results.get("commands", "")
    hs_latch_count: float = 0.0
    hs_temp: float = 0.0
    hs_home_count: float = 0.0
    hs_speed: float = 0.0
    hs_rotations: Dict[str, float] = dict()
    hs_temps: Dict[float, float] = dict()
    temp_time = None
    shake_time = None
    deactivate_time = None

    for command in commandData:
        commandType = command["commandType"]
        # Heatershaker
        # Latch count
        if (
            commandType == "heaterShaker/closeLabwareLatch"
            or commandType == "heaterShaker/openLabwareLatch"
        ):
            hs_latch_count += 1
        # Home count
        elif commandType == "heaterShaker/deactivateShaker":
            hs_home_count += 1
            shake_deactivate_time = datetime.strptime(
                command.get("startedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
            if shake_time is not None and shake_deactivate_time > shake_time:
                shake_duration = (shake_deactivate_time - shake_time).total_seconds()
                hs_rotations[hs_speed] = hs_rotations.get(hs_speed, 0.0) + (
                    (hs_speed * shake_duration) / 60
                )
        elif commandType == "heaterShaker/deactivateHeater":
            deactivate_time = datetime.strptime(
                command.get("startedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
            if temp_time is not None and deactivate_time > temp_time:
                temp_duration = (deactivate_time - temp_time).total_seconds()
                hs_temps[hs_temp] = hs_temps.get(hs_temp, 0.0) + temp_duration
        # of Rotations
        elif commandType == "heaterShaker/setAndWaitForShakeSpeed":
            hs_speed = command["params"]["rpm"]
            shake_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
        # On Time
        elif commandType == "heaterShaker/setTargetTemperature":
            # if heater shaker temp is not deactivated.
            hs_temp = command["params"]["celsius"]
            temp_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
    if temp_time is not None and deactivate_time is None:
        # If heater shaker module is not deactivated, protocol completedAt time stamp used.
        default = commandData[len(commandData) - 1].get("completedAt")
        protocol_end = datetime.strptime(
            file_results.get("completedAt", default), "%Y-%m-%dT%H:%M:%S.%f%z"
        )
        temp_duration = (protocol_end - temp_time).total_seconds()
        hs_temps[hs_temp] = hs_temps.get(hs_temp, 0.0) + temp_duration
    hs_latch_sets = hs_latch_count / 2  # one set of open/close
    hs_total_rotations = sum(hs_rotations.values())
    hs_total_temp_time = sum(hs_temps.values())
    hs_dict = {
        "Heatershaker # of Latch Open/Close": hs_latch_sets,
        "Heatershaker # of Homes": hs_home_count,
        "Heatershaker # of Rotations": hs_total_rotations,
        "Heatershaker Temp On Time (sec)": hs_total_temp_time,
    }
    return hs_dict


def temperature_module_commands(file_results: Dict[str, Any]) -> Dict[str, Any]:
    """Get # of temp changes and total temp on time for temperature module from run log."""
    # TODO: modify for cases that have more than 1 temperature module.
    tm_temp_change = 0
    time_to_4c = 0.0
    tm_temps: Dict[str, float] = dict()
    temp_time = None
    deactivate_time = None
    commandData = file_results.get("commands", "")
    for command in commandData:
        commandType = command["commandType"]
        if commandType == "temperatureModule/setTargetTemperature":
            temp_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
            tm_temp = command["params"]["celsius"]
            tm_temp_change += 1
        if commandType == "temperatureModule/waitForTemperature" and int(tm_temp) == 4:
            time_to_4c = command_time(command)
            temp_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
        if commandType == "temperatureModule/deactivate":
            deactivate_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
            if temp_time is not None and deactivate_time > temp_time:
                temp_duration = (deactivate_time - temp_time).total_seconds()
                tm_temps[tm_temp] = tm_temps.get(tm_temp, 0.0) + temp_duration
    if temp_time is not None and deactivate_time is None:
        # If temperature module is not deactivated, protocol completedAt time stamp used.
        default = commandData[len(commandData) - 1].get("completedAt")
        protocol_end = datetime.strptime(
            file_results.get("completedAt", default), "%Y-%m-%dT%H:%M:%S.%f%z"
        )
        temp_duration = (protocol_end - temp_time).total_seconds()
        tm_temps[tm_temp] = tm_temps.get(tm_temp, 0.0) + temp_duration
    tm_total_temp_time = sum(tm_temps.values())
    tm_dict = {
        "Temp Module # of Temp Changes": tm_temp_change,
        "Temp Module Temp On Time (sec)": tm_total_temp_time,
        "Temp Mod Time to 4C (sec)": time_to_4c,
    }
    return tm_dict


def thermocycler_commands(file_results: Dict[str, Any]) -> Dict[str, float]:
    """Counts # of lid engagements, temp changes, and temp sustaining mins."""
    # TODO: modify for cases that have more than 1 thermocycler.
    commandData = file_results.get("commands", "")
    lid_engagements: float = 0.0
    block_temp_changes: float = 0.0
    lid_temp_changes: float = 0.0
    block_to_4c = 0.0
    lid_to_105c = 0.0
    lid_temps: Dict[str, float] = dict()
    block_temps: Dict[str, float] = dict()
    lid_on_time = None
    lid_off_time = None
    block_on_time = None
    block_off_time = None
    for command in commandData:
        commandType = command["commandType"]
        if (
            commandType == "thermocycler/openLid"
            or commandType == "thermocycler/closeLid"
        ):
            lid_engagements += 1
        if (
            commandType == "thermocycler/setTargetBlockTemperature"
            and command["status"] != "queued"
        ):
            block_temp = command["params"]["celsius"]
            block_temp_changes += 1
            block_on_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
        if (
            commandType == "thermocycler/waitForBlockTemperature"
            and int(block_temp) == 4
        ):
            block_to_4c = command_time(command)
        if commandType == "thermocycler/setTargetLidTemperature":
            lid_temp_changes += 1
            lid_temp = command["params"]["celsius"]
            lid_on_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
        if commandType == "thermocycler/waitForLidTemperature" and int(lid_temp) == 105:
            lid_to_105c = command_time(command)
        if commandType == "thermocycler/deactivateLid":
            lid_off_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
            if lid_on_time is not None and lid_off_time > lid_on_time:
                lid_duration = (lid_off_time - lid_on_time).total_seconds()
                lid_temps[lid_temp] = lid_temps.get(lid_temp, 0.0) + lid_duration
        if commandType == "thermocycler/deactivateBlock":
            block_off_time = datetime.strptime(
                command.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
            )
            if block_on_time is not None and block_off_time > block_on_time:
                block_duration = (block_off_time - block_on_time).total_seconds()
                block_temps[block_temp] = (
                    block_temps.get(block_temp, 0.0) + block_duration
                )
        if commandType == "thermocycler/runProfile":
            profile = command["params"]["profile"]
            total_changes = len(profile)
            block_temp_changes += total_changes
            for cycle in profile:
                block_temp = cycle["celsius"]
                block_time = cycle["holdSeconds"]
                block_temps[block_temp] = block_temps.get(block_temp, 0.0) + block_time
    if block_on_time is not None and block_off_time is None:
        # If thermocycler block not deactivated protocol completedAt time stamp used
        default = commandData[len(commandData) - 1].get("completedAt")
        protocol_end = datetime.strptime(
            file_results.get("completedAt", default), "%Y-%m-%dT%H:%M:%S.%f%z"
        )
        temp_duration = (protocol_end - block_on_time).total_seconds()

    if lid_on_time is not None and lid_off_time is None:
        # If thermocycler lid not deactivated protocol completedAt time stamp used
        default = commandData[len(commandData) - 1].get("completedAt")
        protocol_end = datetime.strptime(
            file_results.get("completedAt", default), "%Y-%m-%dT%H:%M:%S.%f%z"
        )
        temp_duration = (protocol_end - lid_on_time).total_seconds()
        lid_temps[lid_temp] = block_temps.get(lid_temp, 0.0) + temp_duration

    block_total_time = sum(block_temps.values())
    lid_total_time = sum(lid_temps.values())
    lid_sets = lid_engagements / 2
    tc_dict = {
        "Thermocycler # of Lid Open/Close": lid_sets,
        "Thermocycler Block # of Temp Changes": block_temp_changes,
        "Thermocycler Block Temp On Time (sec)": block_total_time,
        "Thermocycler Block Time to 4C (sec)": block_to_4c,
        "Thermocycler Lid # of Temp Changes": lid_temp_changes,
        "Thermocycler Lid Temp On Time (sec)": lid_total_time,
        "Thermocycler Lid Time to 105C (sec)": lid_to_105c,
    }

    return tc_dict


def create_abr_data_sheet(
    storage_directory: str, file_name: str, headers: List[str]
) -> str:
    """Creates csv file to log ABR data."""
    file_name_csv = file_name + ".csv"
    sheet_location = os.path.join(storage_directory, file_name_csv)
    if os.path.exists(sheet_location):
        return sheet_location
    else:
        with open(sheet_location, "w") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            print(f"Created file. Located: {sheet_location}.")
    return sheet_location


def get_error_info(file_results: Dict[str, Any]) -> Dict[str, Any]:
    """Determines if errors exist in run log and documents them."""
    # Read error levels file
    with open(ERROR_LEVELS_PATH, "r") as error_file:
        error_levels = {row[1]: row[4] for row in csv.reader(error_file)}
    # Initialize Variables
    recoverable_errors: Dict[str, int] = dict()
    total_recoverable_errors = 0
    end_run_errors = len(file_results["errors"])
    commands_of_run: List[Dict[str, Any]] = file_results.get("commands", [])
    error_recovery = file_results.get("hasEverEnteredErrorRecovery", False)
    # Count recoverable errors
    if error_recovery:
        for command in commands_of_run:
            error_info = command.get("error", {})
            if error_info.get("isDefined"):
                total_recoverable_errors += 1
                error_type = error_info.get("errorType", "")
                recoverable_errors[error_type] = (
                    recoverable_errors.get(error_type, 0) + 1
                )
    # Get run-ending error info
    try:
        run_command_error = commands_of_run[-1]["error"]
        error_type = run_command_error.get("errorType", "")
        if error_type == "PythonException":
            error_type = commands_of_run[-1].get("detail", "").split(":")[0]
        error_code = run_command_error.get("errorCode", "")
        error_instrument = run_command_error.get("errorInfo", {}).get(
            "node", run_command_error.get("errorInfo", {}).get("port", "")
        )
    except (IndexError, KeyError):
        try:
            error_details = file_results.get("errors", [{}])[0]
        except IndexError:
            error_details = {}
        error_type = error_details.get("errorType", "")
        error_code = error_details.get("errorCode", "")
        error_instrument = error_details.get("detail", "")
    # Determine error level
    if end_run_errors > 0:
        error_level = error_levels.get(error_code, "4")
    else:
        error_level = ""
    # Create dictionary with all error descriptions
    error_dict = {
        "Total Recoverable Error(s)": total_recoverable_errors,
        "Recoverable Error(s) Description": recoverable_errors,
        "Run Ending Error": end_run_errors,
        "Error_Code": error_code,
        "Error_Type": error_type,
        "Error_Instrument": error_instrument,
        "Error_Level": error_level,
    }
    return error_dict


def write_to_local_and_google_sheet(
    runs_and_robots: Dict[Any, Dict[str, Any]],
    storage_directory: str,
    file_name: str,
    google_sheet: Any,
    header: List[str],
) -> None:
    """Write data dictionary to google sheet and local csv."""
    sheet_location = os.path.join(storage_directory, file_name)
    file_exists = os.path.exists(sheet_location) and os.path.getsize(sheet_location) > 0
    with open(sheet_location, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(header)
        for run in runs_and_robots:
            row = runs_and_robots[run].values()
            row_list = list(row)
            writer.writerow(row_list)
            google_sheet.write_header(header)
            google_sheet.token_check()
            google_sheet.update_row_index()
            google_sheet.write_to_row(row_list)
            t.sleep(3)


def read_abr_data_sheet(
    storage_directory: str, file_name_csv: str, google_sheet: Any
) -> Set[str]:
    """Reads current run sheet to determine what new run data should be added."""
    print(file_name_csv)
    sheet_location = os.path.join(storage_directory, file_name_csv)
    runs_in_sheet = set()
    # Read the CSV file
    with open(sheet_location, "r") as csv_start:
        data = csv.DictReader(csv_start)
        headers = data.fieldnames
        if headers is not None:
            for row in data:
                run_id = row[headers[1]]
                runs_in_sheet.add(run_id)
        print(f"There are {str(len(runs_in_sheet))} runs documented in the ABR sheet.")
    # Read Google Sheet
    google_sheet.token_check()
    google_sheet.write_header(headers)
    google_sheet.update_row_index()
    return runs_in_sheet


def get_run_ids_from_storage(storage_directory: str) -> Set[str]:
    """Read all files in storage directory, extracts run id, adds to set."""
    os.makedirs(storage_directory, exist_ok=True)
    list_of_files = os.listdir(storage_directory)
    run_ids = set()
    for this_file in list_of_files:
        read_file = os.path.join(storage_directory, this_file)
        if read_file.endswith(".json"):
            file_results = json.load(open(read_file))
        run_id = file_results.get("run_id", "")
        if len(run_id) > 0:
            run_ids.add(run_id)
    return run_ids


def get_unseen_run_ids(runs: Set[str], runs_from_storage: Set[str]) -> Set[str]:
    """Subtracts runs from storage from current runs being read."""
    runs_to_save = runs - runs_from_storage
    return runs_to_save


def save_run_log_to_json(
    ip: str, results: Dict[str, Any], storage_directory: str
) -> str:
    """Save run log to local json file."""
    data_file_name = ip + "_" + results["run_id"] + ".json"
    saved_file_path = os.path.join(storage_directory, data_file_name)
    json.dump(results, open(saved_file_path, mode="w"))
    return saved_file_path


def get_run_ids_from_google_drive(google_drive: Any) -> Set[str]:
    """Get run ids in google drive folder."""
    # Run ids in google_drive_folder
    file_names = google_drive.list_folder()
    run_ids_on_gd = set()
    for file in file_names:
        if file.endswith(".json") and "_" in file:
            file_id = file.split(".json")[0].split("_")[1]
            run_ids_on_gd.add(file_id)
    return run_ids_on_gd


def write_to_sheets(
    sheet_location: str, google_sheet: Any, row_list: List[Any], headers: List[str]
) -> None:
    """Write list to google sheet and csv."""
    with open(sheet_location, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(row_list)
        # Read Google Sheet
        google_sheet.token_check()
        google_sheet.write_header(headers)
        google_sheet.update_row_index()
        google_sheet.write_to_row(row_list)
        t.sleep(5)


def get_calibration_offsets(
    ip: str, storage_directory: str
) -> Tuple[str, Dict[str, Any]]:
    """Connect to robot via ip and get calibration data."""
    calibration = dict()
    # Robot Information [Name, Software Version]
    try:
        response = requests.get(
            f"http://{ip}:31950/health", headers={"opentrons-version": "3"}
        )
        print(f"Connected to {ip}")
    except Exception:
        print(f"ERROR: Failed to read IP address: {ip}")
        pass
    health_data = response.json()
    robot_name = health_data.get("name", "")
    api_version = health_data.get("api_version", "")
    pull_date_timestamp = datetime.now()
    date = pull_date_timestamp.date().isoformat()
    file_date = str(pull_date_timestamp).replace(":", "").split(".")[0]
    calibration["Robot"] = robot_name
    calibration["Software Version"] = api_version
    calibration["Pull Date"] = date
    calibration["Pull Timestamp"] = pull_date_timestamp.isoformat()
    calibration["run_id"] = "calibration" + "_" + file_date
    # Calibration [Instruments, modules, deck]
    response = requests.get(
        f"http://{ip}:31950/instruments",
        headers={"opentrons-version": "3"},
        params={"cursor": 0, "pageLength": 0},
    )
    instruments: Dict[str, Any] = response.json()
    calibration["Instruments"] = instruments.get("data", "")
    response = requests.get(
        f"http://{ip}:31950/modules",
        headers={"opentrons-version": "3"},
        params={"cursor": 0, "pageLength": 0},
    )
    modules: Dict[str, Any] = response.json()
    calibration["Modules"] = modules.get("data", "")
    response = requests.get(
        f"http://{ip}:31950/calibration/status",
        headers={"opentrons-version": "3"},
        params={"cursor": 0, "pageLength": 0},
    )
    deck: Dict[str, Any] = response.json()
    calibration["Deck"] = deck.get("deckCalibration", "")
    save_name = ip + "_calibration.json"
    saved_file_path = os.path.join(storage_directory, save_name)
    json.dump(calibration, open(saved_file_path, mode="w"))
    return saved_file_path, calibration


def get_logs(storage_directory: str, ip: str) -> List[str]:
    """Get Robot logs."""
    log_types: List[Dict[str, Any]] = [
        {"log type": "api.log", "records": 10000},
        {"log type": "server.log", "records": 10000},
        {"log type": "serial.log", "records": 10000},
        {"log type": "touchscreen.log", "records": 10000},
    ]
    all_paths = []
    for log_type in log_types:
        try:
            log_type_name = log_type["log type"]
            print(log_type_name)
            log_records = int(log_type["records"])
            print(log_records)
            response = requests.get(
                f"http://{ip}:31950/logs/{log_type_name}",
                headers={"log_identifier": log_type_name},
                params={"records": log_records},
            )
            response.raise_for_status()
            log_data = response.text
            log_name = ip + "_" + log_type_name.split(".")[0] + ".log"
            file_path = os.path.join(storage_directory, log_name)
            with open(file_path, mode="w", encoding="utf-8") as file:
                file.write(log_data)
        except RuntimeError:
            print(f"Request exception. Did not save {log_type_name}")
            continue
        all_paths.append(file_path)
    # Get weston.log using scp
    # Split the path into parts
    parts = storage_directory.split(os.sep)
    # Find the index of 'Users'
    index = parts.index("Users")
    user_name = parts[index + 1]
    # Define the SCP command
    scp_command = [
        "scp",
        "-r",
        "-i",
        f"C:\\Users\\{user_name}\\.ssh\\robot_key",
        f"root@{ip}:/var/log/weston.log",
        storage_directory,
    ]
    # Execute the SCP command
    try:
        subprocess.run(scp_command, check=True, capture_output=True, text=True)
        file_path = os.path.join(storage_directory, "weston.log")
        all_paths.append(file_path)
    except subprocess.CalledProcessError as e:
        print("Error during SCP command execution")
        print("Return code:", e.returncode)
        print("Output:", e.output)
        print("Error output:", e.stderr)
        subprocess.run(["scp", "weston.log", "root@10.14.19.40:/var/log/weston.log"])
    return all_paths
