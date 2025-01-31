"""Creates google sheet to display metrics of protocol."""
import sys
import os
from pathlib import Path
from click import Context
from opentrons.cli import analyze
import json
import argparse
import traceback
from datetime import datetime
from abr_testing.automation import google_sheets_tool
from abr_testing.data_collection import read_robot_logs
from typing import Any, Tuple, List, Dict, Union, NoReturn
from abr_testing.tools import plate_reader


def build_parser() -> Any:
    """Builds argument parser."""
    parser = argparse.ArgumentParser(description="Read run logs on google drive.")
    parser.add_argument(
        "storage_directory",
        metavar="STORAGE_DIRECTORY",
        type=str,
        nargs=1,
        help="Path to long term storage directory for run logs.",
    )
    parser.add_argument(
        "sheet_name",
        metavar="SHEET_NAME",
        type=str,
        nargs=1,
        help="Name of sheet to upload results to",
    )
    parser.add_argument(
        "protocol_file_path",
        metavar="PROTOCOL_FILE_PATH",
        type=str,
        nargs="*",
        help="Path to protocol file(s)",
    )
    return parser


def set_api_level(protocol_file_path: str) -> None:
    """Set API level for analysis."""
    with open(protocol_file_path, "r") as file:
        file_contents = file.readlines()
    # Look for current'apiLevel:'
    for i, line in enumerate(file_contents):
        if "apiLevel" in line:
            print(f"The current API level of this protocol is: {line}")
            change = (
                input("Would you like to simulate with a different API level? (Y/N) ")
                .strip()
                .upper()
            )
            if change == "Y":
                api_level = input("Protocol API Level to Simulate with: ")
                # Update new API level
                file_contents[i] = f"apiLevel: {api_level}\n"
            break
    with open(protocol_file_path, "w") as file:
        file.writelines(file_contents)
    print("File updated successfully.")


def look_for_air_gaps(protocol_file_path: str) -> int:
    """Search Protocol for Air Gaps."""
    instances = 0
    try:
        with open(protocol_file_path, "r") as open_file:
            protocol_lines = open_file.readlines()
            for line in protocol_lines:
                if "air_gap" in line:
                    print(line)
                    instances += 1
            print(f"Found {instances} instance(s) of the air gap function")
        open_file.close()
    except Exception as error:
        print("Error reading protocol:", error)
        raise error.with_traceback(error.__traceback__)
    return instances


# Mock sys.exit to avoid program termination
original_exit = sys.exit  # Save the original sys.exit function


def mock_exit(code: Union[str, int, None] = None) -> NoReturn:
    """Prevents program from exiting after analysis."""
    print(f"sys.exit() called with code: {code}")
    raise SystemExit(code)  # Raise the exception but catch it to prevent termination


def get_labware_name(id: str, object_dict: dict, json_data: dict) -> str:
    """Recursively find the labware_name."""
    slot = ""
    for obj in object_dict:
        if obj["id"] == id:
            try:
                # Try to get the slotName from the location
                slot = obj["location"]["slotName"]
                return " SLOT: " + slot
            except KeyError:
                # Handle KeyError when location or slotName is missing
                location = obj.get("location", {})

                # Check if location contains 'moduleId'
                if "moduleId" in location:
                    return get_labware_name(
                        location["moduleId"], json_data["modules"], json_data
                    )

                # Check if location contains 'labwareId'
                elif "labwareId" in location:
                    return get_labware_name(
                        location["labwareId"], json_data["labware"], json_data
                    )

    return " Labware not found"


def determine_liquid_movement_volumes(
    commands: List[Dict[str, Any]], json_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Determine where liquid is moved during protocol."""
    labware_well_dict: Dict[str, Any] = {}
    for x, command in enumerate(commands):
        if x != 0:
            if command["commandType"] == "aspirate":
                labware_id = command["params"]["labwareId"]
                labware_name = ""
                for labware in json_data.get("labware", {}):
                    if labware["id"] == labware_id:
                        labware_name = (labware["loadName"]) + get_labware_name(
                            labware["id"], json_data["labware"], json_data
                        )
                well_name = command["params"]["wellName"]

                if labware_id not in labware_well_dict:
                    labware_well_dict[labware_id] = {}

                if well_name not in labware_well_dict[labware_id]:
                    labware_well_dict[labware_id][well_name] = (labware_name, 0, 0, "")

                vol = int(command["params"]["volume"])

                (
                    labware_name,
                    added_volumes,
                    subtracted_volumes,
                    log,
                ) = labware_well_dict[labware_id][well_name]

                subtracted_volumes += vol
                log += f"aspirated {vol} "
                labware_well_dict[labware_id][well_name] = (
                    labware_name,
                    added_volumes,
                    subtracted_volumes,
                    log,
                )

            elif command["commandType"] == "dispense":
                labware_id = command["params"]["labwareId"]
                labware_name = ""
                for labware in json_data.get("labware", {}):
                    if labware["id"] == labware_id:
                        labware_name = (labware["loadName"]) + get_labware_name(
                            labware["id"], json_data["labware"], json_data
                        )
                well_name = command["params"]["wellName"]

                if labware_id not in labware_well_dict:
                    labware_well_dict[labware_id] = {}

                if well_name not in labware_well_dict[labware_id]:
                    labware_well_dict[labware_id][well_name] = (labware_name, 0, 0, "")

                vol = int(command["params"]["volume"])

                (
                    labware_name,
                    added_volumes,
                    subtracted_volumes,
                    log,
                ) = labware_well_dict[labware_id][well_name]

                added_volumes += vol
                log += f"dispensed {vol} "
                labware_well_dict[labware_id][well_name] = (
                    labware_name,
                    added_volumes,
                    subtracted_volumes,
                    log,
                )
    return labware_well_dict


def parse_results_volume(
    json_data_file: str,
    protocol_name: str,
    file_date: datetime,
    file_date_formatted: str,
    hellma_plate_standards: List[Any],
) -> Tuple[
    List[str],
    List[str],
    List[str],
    List[str],
    List[str],
    List[str],
    List[str],
    List[str],
    List[str],
    List[str],
    List[str],
]:
    """Parse run log and extract necessary information."""
    json_data = {}
    with open(json_data_file, "r") as json_file:
        json_data = json.load(json_file)
    if isinstance(json_data, dict):
        commands = json_data.get("commands", {})
    else:
        print(f"Expected JSON object (dict) but got {type(json_data).__name__}.")
        commands = {}
    hellma_plate_orientation = False
    parameters = json_data.get("runTimeParameters", "")
    for parameter in parameters:
        if parameter["displayName"] == "Hellma Plate Orientation":
            hellma_plate_orientation = bool(parameter["value"])
    start_time = datetime.fromisoformat(commands[0]["createdAt"])
    end_time = datetime.fromisoformat(commands[len(commands) - 1]["completedAt"])
    header = ["", "Protocol Name", "Date", "Time"]
    header_fill_row = ["", protocol_name, str(file_date.date()), str(file_date.time())]
    labware_names_row = ["Labware Name"]
    volume_dispensed_row = ["Total Volume Dispensed uL"]
    volume_aspirated_row = ["Total Volume Aspirated uL"]
    change_in_volume_row = ["Total Change in Volume uL"]
    start_time_row = ["Start Time"]
    end_time_row = ["End Time"]
    total_time_row = ["Total Time of Execution"]
    metrics_row = [
        "Metric",
        "Heatershaker # of Latch Open/Close",
        "Heatershaker # of Homes",
        "Heatershaker # of Rotations",
        "Heatershaker Temp On Time (sec)",
        "Temp Module # of Temp Changes",
        "Temp Module Temp On Time (sec)",
        "Temp Mod Time to 4C (sec)",
        "Thermocycler # of Lid Open/Close",
        "Thermocycler Block # of Temp Changes",
        "Thermocycler Block Temp On Time (sec)",
        "Thermocycler Block Time to 4C (sec)",
        "Thermocycler Lid # of Temp Changes",
        "Thermocycler Lid Temp On Time (sec)",
        "Thermocycler Lid Time to 105C (sec)",
        "Plate Reader # of Reads",
        "Plate Reader Avg Read Time (sec)",
        "Plate Reader # of Initializations",
        "Plate Reader Avg Initialize Time (sec)",
        "Plate Reader # of Lid Movements",
        "Plate Reader Result",
        "Left Pipette Total Tip Pick Up(s)",
        "Left Pipette Total Aspirates",
        "Left Pipette Total Dispenses",
        "Right Pipette Total Tip Pick Up(s)",
        "Right Pipette Total Aspirates",
        "Right Pipette Total Dispenses",
        "Gripper Pick Ups",
        "Gripper Pick Ups of opentrons_tough_pcr_auto_sealing_lid",
        "Total Liquid Probes",
        "Average Liquid Probe Time (sec)",
    ]
    values_row = ["Value"]
    (
        hs_dict,
        temp_module_dict,
        thermo_cycler_dict,
        plate_reader_dict,
        instrument_dict,
    ) = ({}, {}, {}, {}, {})
    try:
        hs_dict = read_robot_logs.hs_commands(json_data)
        temp_module_dict = read_robot_logs.temperature_module_commands(json_data)
        thermo_cycler_dict = read_robot_logs.thermocycler_commands(json_data)
        plate_reader_dict = read_robot_logs.plate_reader_commands(
            json_data, hellma_plate_standards, hellma_plate_orientation
        )
        instrument_dict = read_robot_logs.instrument_commands(
            json_data, labware_name=None
        )
    except KeyError:
        pass

    metrics = [
        hs_dict,
        temp_module_dict,
        thermo_cycler_dict,
        plate_reader_dict,
        instrument_dict,
    ]
    # Determine liquid moved to and from labware
    labware_well_dict = determine_liquid_movement_volumes(commands, json_data)
    file_name_to_open = f"{protocol_name}_well_volumes_{file_date_formatted}.json"
    with open(
        f"{os.path.dirname(json_data_file)}\\{file_name_to_open}",
        "w",
    ) as output_file:
        json.dump(labware_well_dict, output_file)
        output_file.close()

    # populate row lists
    for labware_id in labware_well_dict.keys():
        volume_added = 0
        volume_subtracted = 0
        labware_name = ""
        for well in labware_well_dict[labware_id].keys():
            labware_name, added_volumes, subtracted_volumes, log = labware_well_dict[
                labware_id
            ][well]
            volume_added += added_volumes
            volume_subtracted += subtracted_volumes
        labware_names_row.append(labware_name)
        volume_dispensed_row.append(str(volume_added))
        volume_aspirated_row.append(str(volume_subtracted))
        change_in_volume_row.append(str(volume_added - volume_subtracted))
    start_time_row.append(str(start_time.time()))
    end_time_row.append(str(end_time.time()))
    total_time_row.append(str(end_time - start_time))

    for metric in metrics:
        print(f"Dictionary: {metric}\n\n")
        for cmd in metric.keys():
            values_row.append(str(metric[cmd]))
    return (
        header,
        header_fill_row,
        labware_names_row,
        volume_dispensed_row,
        volume_aspirated_row,
        change_in_volume_row,
        start_time_row,
        end_time_row,
        total_time_row,
        metrics_row,
        values_row,
    )


def main(
    protocol_file_path: Path,
    save: bool,
    storage_directory: str = os.curdir,
    google_sheet_name: str = "",
    parameters: str = "",
    extra_files: List[Path] = [],
) -> None:
    """Main module control."""
    sys.exit = mock_exit  # Replace sys.exit with the mock function
    # Simulation run date
    file_date = datetime.now()
    file_date_formatted = file_date.strftime("%Y-%m-%d_%H-%M-%S")
    error_output = f"{storage_directory}\\test_debug"
    protocol_name = protocol_file_path.stem
    protocol_files = [protocol_file_path]
    if extra_files != []:
        protocol_files += extra_files
    print("Simulating....")
    try:
        with Context(analyze) as ctx:
            if save:
                # Prepare output file
                json_file_path = (
                    f"{storage_directory}\\{protocol_name}_{file_date_formatted}.json"
                )
                json_file_output = open(json_file_path, "wb+")
                # log_output_file = f"{protocol_name}_log"
                if parameters:
                    csv_params = {}
                    csv_params["parameters_csv"] = parameters
                    rtp_json = json.dumps(csv_params)
                    ctx.invoke(
                        analyze,
                        files=protocol_files,
                        rtp_files=rtp_json,
                        json_output=json_file_output,
                        human_json_output=None,
                        log_output=error_output,
                        log_level="ERROR",
                        check=False,
                    )

                else:
                    ctx.invoke(
                        analyze,
                        files=protocol_files,
                        json_output=json_file_output,
                        human_json_output=None,
                        log_output=error_output,
                        log_level="ERROR",
                        check=False,
                    )
                json_file_output.close()
            else:
                if parameters:
                    csv_params = {}
                    csv_params["parameters_csv"] = parameters
                    rtp_json = json.dumps(csv_params)
                    ctx.invoke(
                        analyze,
                        files=protocol_files,
                        rtp_files=rtp_json,
                        json_output=None,
                        human_json_output=None,
                        log_output=error_output,
                        log_level="ERROR",
                        check=True,
                    )
                else:
                    ctx.invoke(
                        analyze,
                        files=protocol_files,
                        json_output=None,
                        human_json_output=None,
                        log_output=error_output,
                        log_level="ERROR",
                        check=True,
                    )
        print("done!")
    except SystemExit as e:
        print(f"SystemExit caught with code: {e}")
        if e != 0:
            traceback.print_exc
    finally:
        # Reset sys.exit to the original behavior
        sys.exit = original_exit
        with open(error_output, "r") as open_file:
            try:
                errors = open_file.readlines()
                if not errors:
                    pass
                else:
                    print(f"Error:\n{errors}")
                    raise
            except FileNotFoundError:
                print("error simulating ...")
                raise
        open_file.close
    if save:
        try:
            credentials_path = os.path.join(storage_directory, "credentials.json")
            print(credentials_path)
        except FileNotFoundError:
            print(f"Add credentials.json file to: {storage_directory}.")
            sys.exit()
        hellma_plate_standards = plate_reader.read_hellma_plate_files(
            storage_directory, 101934
        )
        google_sheet = google_sheets_tool.google_sheet(
            credentials_path, google_sheet_name, 0
        )
        google_sheet.write_to_row([])

        for row in parse_results_volume(
            json_file_path,
            protocol_name,
            file_date,
            file_date_formatted,
            hellma_plate_standards,
        ):
            print("Writing results to", google_sheet_name)
            print(str(row))
            google_sheet.write_to_row(row)


def check_params(protocol_path: str) -> str:
    """Check if protocol requires supporting files."""
    print("checking for parameters")
    with open(protocol_path, "r") as f:
        lines = f.readlines()
        file_as_str = "".join(lines)
        if (
            "parameters.add_csv_file" in file_as_str
            or "helpers.create_csv_parameter" in file_as_str
        ):
            params = ""
            while not params:
                name = Path(protocol_file_path).stem
                params = input(
                    f"Protocol {name} needs a CSV parameter file. Please enter the path: "
                )
                if os.path.exists(params):
                    return params
                else:
                    params = ""
                    print("Invalid file path")
        return ""


def get_extra_files(protocol_file_path: str) -> tuple[str, List[Path]]:
    """Get supporting files for protocol simulation if needed."""
    params = check_params(protocol_file_path)
    needs_files = input("Does your protocol utilize custom labware? (Y/N): ")
    labware_files = []
    if needs_files == "Y":
        num_labware = input("How many custom labware?: ")
        for labware_num in range(int(num_labware)):
            path = input("Enter custom labware definition path: ")
            labware_files.append(Path(path))
    return (params, labware_files)


if __name__ == "__main__":
    CLEAN_PROTOCOL = True
    args = build_parser().parse_args()
    storage_directory = args.storage_directory[0]
    sheet_name = args.sheet_name[0]
    protocol_file_path: str = args.protocol_file_path[0]
    parameters: List[str] = args.protocol_file_path[1:]
    print(parameters)
    SETUP = True
    while SETUP:
        print(
            "Current version cannot handle air gap calls. Simulation results may be inaccurate."
        )
        air_gaps = look_for_air_gaps(protocol_file_path)
        if air_gaps > 0:
            choice = ""
            while not choice:
                choice = input(
                    "Remove air_gap commands to ensure accurate results: (continue)? (Y/N): "
                )
                if choice.upper() == "Y":
                    SETUP = False
                    CLEAN_PROTOCOL = True
                elif choice.upper() == "N":
                    CLEAN_PROTOCOL = False
                    SETUP = False
                    print("Please remove air gaps then re-run")
                else:
                    choice = ""
                    print("Please enter a valid response.")
        SETUP = False

    # Change api level
    if CLEAN_PROTOCOL:
        set_api_level(protocol_file_path)
        params, extra_files = get_extra_files(protocol_file_path)
        try:
            main(
                protocol_file_path=Path(protocol_file_path),
                save=True,
                storage_directory=storage_directory,
                google_sheet_name=sheet_name,
                parameters=params,
                extra_files=extra_files,
            )
        except Exception as e:
            traceback.print_exc()
            sys.exit(str(e))
    else:
        sys.exit(0)
