"""ABR Scale Reader."""
import os
import datetime
from hardware_testing.drivers import find_port, list_ports_and_select  # type: ignore[import]
from hardware_testing.drivers.radwag import RadwagScale  # type: ignore[import]
import argparse
from abr_testing.data_collection import read_robot_logs, abr_google_drive, get_run_logs
from abr_testing.automation import google_sheets_tool
import requests
from typing import Any, Tuple
import sys
import json
from abr_testing.tools import plate_reader


def get_protocol_step_as_int(
    storage_directory: str, robot: str
) -> Tuple[int, float, str]:
    """Get user input as integer."""
    expected_liquid_moved = 0.0
    ip = ""
    while True:
        try:
            protocol_step = int(input("Measurement Step (1, 2, 3): "))
            if protocol_step in [1, 2, 3]:
                break
            else:
                print("Protocol step should be one of the values: 1, 2, or 3.")
        except ValueError:
            print("Protocol step should be an integer value 1, 2, or 3.")

    if int(protocol_step) == 3:
        # setup IP sheet
        ip_json_file = os.path.join(storage_directory, "IP_N_VOLUMES.json")
        # create an dict copying the contents of IP_N_Volumes
        try:
            ip_file = json.load(open(ip_json_file))
            try:
                # grab IP and volume from the dict
                tot_info = ip_file["information"]
                robot_info = tot_info[robot]
                IP_add = robot_info["IP"]
                exp_volume = robot_info["volume"]
                # sets return variables equal to those grabbed from the sheet
                ip = IP_add
                expected_liquid_moved = float(exp_volume)
            except KeyError:
                ip = input("Robot IP: ")
                while True:
                    try:
                        expected_liquid_moved = float(input("Expected volume moved: "))
                        if expected_liquid_moved >= 0 or expected_liquid_moved <= 0:
                            break
                    except ValueError:
                        print("Expected liquid moved volume should be an float.")
        except FileNotFoundError:
            print(
                f"Please add json file with robot IPs and expected volumes to: {storage_directory}."
            )
            sys.exit()

    return protocol_step, expected_liquid_moved, ip


def get_all_plate_readings(
    robot: str, plate: str, mass_3: float, expected_moved: float, google_sheet: Any
) -> float:
    """Calculate accuracy of liquid moved on final measurement step."""
    accuracy = 0.0
    header_list = google_sheet.get_row(1)
    all_data = google_sheet.get_all_data(header_list)

    # Get mass of first reading
    mass_1_readings = []
    for row in all_data:
        if (
            row["Robot"] == robot
            and row["Labware"] == plate
            and (int(row["Measurement Step"]) == 1)
        ):
            mass_1_readings.append(row["Mass (g)"])
    if len(mass_1_readings) > 0:
        mass_1 = mass_1_readings[-1]
    else:
        print(
            f"Initial mass for plate {plate} on robot {robot} not found. Check sheet."
        )
        sys.exit()
    # Get mass of second reading
    mass_2_readings = []
    for row in all_data:
        if (
            row["Robot"] == robot
            and row["Labware"] == plate
            and (int(row["Measurement Step"]) == 2)
        ):
            mass_2_readings.append(row["Mass (g)"])
    if len(mass_2_readings) > 0:
        mass_2 = mass_2_readings[-1]
        starting_liquid = 1000 * (mass_2 - mass_1)
    else:
        starting_liquid = 0
    actual_moved = ((mass_3 - mass_1) * 1000) - starting_liquid
    accuracy = ((expected_moved - actual_moved) / actual_moved) * 100
    return accuracy


def get_most_recent_run_and_record(
    ip: str, storage_directory: str, labware: str, accuracy: float
) -> None:
    """Write accuracy level to google sheet."""
    # Get most recent run
    try:
        response = requests.get(
            f"http://{ip}:31950/runs", headers={"opentrons-version": "3"}
        )
    except Exception:
        print(
            f"ERROR: Failed to read IP address {ip}. Accuracy was not recorded on sheet."
        )
        sys.exit()
    run_data = response.json()
    run_list = run_data["data"]
    most_recent_run_id = run_list[-1]["id"]
    results = get_run_logs.get_run_data(most_recent_run_id, ip)
    # Save run information to local directory as .json file
    saved_file_path = read_robot_logs.save_run_log_to_json(
        ip, results, storage_directory
    )
    # Check that last run is completed.
    with open(saved_file_path) as file:
        file_results = json.load(file)
        try:
            file_results["completedAt"]
        except ValueError:
            # no completedAt field, get run before the last run.
            most_recent_run_id = run_list[-2]["id"]
            results = get_run_logs.get_run_data(most_recent_run_id, ip)
            # Save run information to local directory as .json file
            saved_file_path = read_robot_logs.save_run_log_to_json(
                ip, results, storage_directory
            )
    # Record run to google sheets.
    print(most_recent_run_id)
    # Read Hellma Files
    hellma_file_values = plate_reader.read_hellma_plate_files(storage_directory, 101934)
    (
        runs_and_robots,
        headers,
        runs_and_lpc,
        headers_lpc,
    ) = abr_google_drive.create_data_dictionary(
        most_recent_run_id,
        storage_directory,
        "",
        hellma_file_values,
    )
    google_sheet_abr_data = google_sheets_tool.google_sheet(
        credentials_path, "ABR-run-data", tab_number=0
    )
    start_row = google_sheet_abr_data.get_index_row() + 1
    google_sheet_abr_data.batch_update_cells(runs_and_robots, "A", start_row, "0")
    print("Wrote run to ABR-run-data")
    # Add LPC to google sheet
    google_sheet_lpc = google_sheets_tool.google_sheet(
        credentials_path, "ABR-LPC", tab_number=0
    )
    start_row_lpc = google_sheet_lpc.get_index_row() + 1
    google_sheet_lpc.batch_update_cells(runs_and_lpc, "A", start_row_lpc, "0")


if __name__ == "__main__":
    # Adds Arguments
    parser = argparse.ArgumentParser(description="Record stable mass for labware.")
    parser.add_argument(
        "storage_directory",
        metavar="STORAGE_DIRECTORY",
        type=str,
        nargs=1,
        help="Path to long term storage directory for scale .csvs.",
    )
    parser.add_argument(
        "file_name",
        metavar="FILE_NAME",
        type=str,
        nargs=1,
        help="Name of google sheet and local csv to save data to.",
    )
    args = parser.parse_args()
    storage_directory = args.storage_directory[0]
    file_name = args.file_name[0]
    file_name_csv = file_name + ".csv"
    # find port using known VID:PID, then connect
    vid, pid = RadwagScale.vid_pid()
    try:
        scale = RadwagScale.create(port=find_port(vid=vid, pid=pid))
    except RuntimeError:
        device = list_ports_and_select()
        scale = RadwagScale.create(device)
    scale.connect()
    grams = 0.0
    is_stable = False
    # Set up csv sheet
    headers = ["Robot", "Date", "Timestamp", "Labware", "Mass (g)", "Measurement Step"]
    sheet_location = read_robot_logs.create_abr_data_sheet(
        storage_directory, file_name, headers
    )
    # Set up google sheet
    try:
        credentials_path = os.path.join(storage_directory, "credentials.json")
    except FileNotFoundError:
        print("No google sheets credentials. Add credentials to storage notebook.")
    google_sheet = google_sheets_tool.google_sheet(
        credentials_path, file_name, tab_number=0
    )
    robot = input("Robot: ")
    labware = input("Labware: ")
    protocol_step, expected_liquid_moved, ip = get_protocol_step_as_int(
        storage_directory, robot
    )
    print(ip)
    print(expected_liquid_moved)
    # Scale Loop
    grams, is_stable = scale.read_mass()
    grams, is_stable = scale.read_mass()
    is_stable = False
    break_all = False
    while is_stable is False:
        grams, is_stable = scale.read_mass()
        grams, is_stable = scale.read_mass()
        print(f"Scale reading: grams={grams}, is_stable={is_stable}")
        time_now = datetime.datetime.now()
        date = str(time_now.date())
        row = [robot, date, str(time_now), labware, grams, protocol_step]
        row_list = list(row)
        while is_stable is True:
            print("is stable")
            read_robot_logs.write_to_sheets(
                sheet_location, google_sheet, row_list, headers
            )
            if int(protocol_step) == 3:
                # Calculate accuracy of plate
                accuracy = get_all_plate_readings(
                    robot, labware, grams, expected_liquid_moved, google_sheet
                )
                # Connect to robot - get most recent run - write run data to google sheet.
                get_most_recent_run_and_record(ip, storage_directory, labware, accuracy)

            is_stable = False
            while True:
                y_or_no = input("Do you want to weigh another sample? (Y/N): ")
                if y_or_no == "Y" or y_or_no == "y":
                    # Uses same storage directory and file.
                    grams, is_stable = scale.read_mass()
                    is_stable = False
                    robot = input("Robot: ")
                    labware = input("Labware: ")
                    protocol_step, expected_liquid_moved, ip = get_protocol_step_as_int(
                        storage_directory, robot
                    )
                    grams, is_stable = scale.read_mass()
                    break
                elif y_or_no == "N" or y_or_no == "n":
                    break_all = True
                    break
                else:
                    print("Please Choose a Valid Option")
        if break_all:
            break
