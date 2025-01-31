"""Create ticket for robot with error."""
from typing import List, Tuple, Any, Dict, Optional
from abr_testing.data_collection import read_robot_logs, abr_google_drive, get_run_logs
import requests
import argparse
from abr_testing.automation import jira_tool, google_sheets_tool, google_drive_tool
import shutil
import os
import subprocess
from datetime import datetime, timedelta
import sys
import json
import re
from pathlib import Path
import pandas as pd
from statistics import mean, StatisticsError
from abr_testing.tools import plate_reader


def retrieve_protocol_file(
    protocol_id: str,
    robot_ip: str,
    storage: str,
) -> Path | str:
    """Find and copy protocol file on robot with error."""
    protocol_dir = f"/var/lib/opentrons-robot-server/7.1/protocols/{protocol_id}"

    print(f"FILE TO FIND: {protocol_dir}/{protocol_id}")
    # Copy protocol file found in robot oto host computer
    save_dir = Path(f"{storage}/protocol_errors")
    command = ["scp", "-r", f"root@{robot_ip}:{protocol_dir}", save_dir]
    try:
        # If file found and copied return path to file
        subprocess.run(command, check=True)  # type: ignore
        print("File transfer successful!")
        return save_dir
    except subprocess.CalledProcessError as e:
        print(f"Error during file transfer: {e}")
        # Return empty string if file can't be copied
    return ""


def compare_current_trh_to_average(
    robot: str,
    start_time: Any,
    end_time: Optional[Any],
    protocol_name: str,
    storage_directory: str,
) -> str:
    """Get average temp/rh for errored run and compare to average."""
    # Connect to ABR ambient conditions sheet
    credentials_path = os.path.join(storage_directory, "credentials.json")
    temprh_data_sheet = google_sheets_tool.google_sheet(
        credentials_path, "ABR Ambient Conditions", 0
    )
    headers = temprh_data_sheet.get_row(1)
    all_trh_data = temprh_data_sheet.get_all_data(expected_headers=headers)
    # Connect to ABR-run-data sheet
    abr_data = google_sheets_tool.google_sheet(credentials_path, "ABR-run-data", 0)
    headers = abr_data.get_row(1)
    all_run_data = abr_data.get_all_data(expected_headers=headers)
    # Find average conditions of errored time period
    df_all_trh = pd.DataFrame(all_trh_data)
    # Convert timestamps to datetime objects
    print(f'TIMESTAMP: {df_all_trh["Timestamp"]}')
    try:
        df_all_trh["Timestamp"] = pd.to_datetime(
            df_all_trh["Timestamp"], format="mixed", utc=True
        ).dt.tz_localize(None)
    except Exception:
        print(f'The following timestamp is invalid: {df_all_trh["Timestamp"]}')
    # Ensure start_time is timezone-naive
    start_time = start_time.replace(tzinfo=None)
    relevant_temp_rhs = df_all_trh[
        (df_all_trh["Robot"] == robot) & (df_all_trh["Timestamp"] >= start_time)
    ]
    try:
        avg_temp = round(mean(relevant_temp_rhs["Temp (oC)"]), 2)
        avg_rh = round(mean(relevant_temp_rhs["Relative Humidity (%)"]), 2)
    except StatisticsError:
        # If there is one value assign it as the average.
        if len(relevant_temp_rhs["Temp (oC)"]) == 1:
            avg_temp = relevant_temp_rhs["Temp (oC)"][0]
            avg_rh = relevant_temp_rhs["Relative Humidity (%)"][0]
        else:
            avg_temp = None
            avg_rh = None
    # Get AVG t/rh of runs w/ same robot & protocol newer than 3 wks old with no errors
    weeks_ago_3 = start_time - timedelta(weeks=3)
    df_all_run_data = pd.DataFrame(all_run_data)
    df_all_run_data["Start_Time"] = pd.to_datetime(
        df_all_run_data["Start_Time"], format="mixed", utc=True
    ).dt.tz_localize(None)
    df_all_run_data["Run Ending Error"] = pd.to_numeric(
        df_all_run_data["Run Ending Error"]
    )
    df_all_run_data["Average Temp (oC)"] = pd.to_numeric(
        df_all_run_data["Average Temp (oC)"]
    )
    common_filters = (
        (df_all_run_data["Robot"] == robot)
        & (df_all_run_data["Start_Time"] >= weeks_ago_3)
        & (df_all_run_data["Start_Time"] <= start_time)
        & (df_all_run_data["Run Ending Error"] < 1)
        & (df_all_run_data["Average Temp (oC)"] > 1)
    )

    if protocol_name == "":
        relevant_run_data = df_all_run_data[common_filters]
    else:
        relevant_run_data = df_all_run_data[
            common_filters & (df_all_run_data["Protocol_Name"] == protocol_name)
        ]
    # Calculate means of historical data
    try:
        historical_avg_temp = round(
            mean(relevant_run_data["Average Temp (oC)"].astype(float)), 2
        )
        historical_avg_rh = round(
            mean(relevant_run_data["Average RH(%)"].astype(float)), 2
        )
    except StatisticsError:
        historical_avg_temp = None
        historical_avg_rh = None
    # Formats TEMP/RH message for ticket.
    temp_rh_message = (
        f"{len(relevant_run_data)} runs with temp/rh data for {robot} running {protocol_name}."
        f" AVG TEMP (deg C): {historical_avg_temp}. AVG RH (%): {historical_avg_rh}."
        f" AVG TEMP of ERROR: {avg_temp}. AVG RH of ERROR: {avg_rh}."
    )
    # Print out comparison string.
    print(temp_rh_message)
    return temp_rh_message


def compare_lpc_to_historical_data(
    labware_dict: Dict[str, Any], robot: str, storage_directory: str
) -> str:
    """Compare LPC data of slot error occurred in to historical relevant data."""
    # Connect to LPC Google Sheet and get data.
    credentials_path = os.path.join(storage_directory, "credentials.json")
    google_sheet_lpc = google_sheets_tool.google_sheet(credentials_path, "ABR-LPC", 0)
    headers = google_sheet_lpc.get_row(1)
    all_lpc_data = google_sheet_lpc.get_all_data(expected_headers=headers)
    df_lpc_data = pd.DataFrame(all_lpc_data)
    labware = labware_dict["Labware Type"]
    slot = labware_dict["Slot"]
    # Filter data to match to appropriate labware and slot.
    # Discludes any run with an error.
    relevant_lpc = df_lpc_data[
        (df_lpc_data["Slot"] == slot)
        & (df_lpc_data["Labware Type"] == labware)
        & (df_lpc_data["Robot"] == robot)
        & (df_lpc_data["Module"] == labware_dict["Module"])
        & (df_lpc_data["Adapter"] == labware_dict["Adapter"])
        & (df_lpc_data["Run Ending Error"])
        < 1
    ]
    # Converts coordinates to floats and finds averages.
    try:
        x_float = [float(value) for value in relevant_lpc["X"]]
        y_float = [float(value) for value in relevant_lpc["Y"]]
        z_float = [float(value) for value in relevant_lpc["Z"]]
        current_x = round(labware_dict["X"], 2)
        current_y = round(labware_dict["Y"], 2)
        current_z = round(labware_dict["Z"], 2)
    except (ValueError):
        x_float, y_float, z_float = [0.0], [0.0], [0.0]
        current_x, current_y, current_z = 0.0, 0.0, 0.0
    try:
        avg_x = round(mean(x_float), 2)
        avg_y = round(mean(y_float), 2)
        avg_z = round(mean(z_float), 2)
    except StatisticsError:
        # If there is one value assign it as the average.
        if len(x_float) == 1:
            avg_x = x_float[0]
            avg_y = y_float[0]
            avg_z = z_float[0]
        else:
            avg_x = None
            avg_y = None
            avg_z = None

    # Formats LPC message for ticket.
    lpc_message = (
        f"There were {len(x_float)} LPC coords found for {labware} at {slot}. "
        f"AVERAGE POSITION: ({avg_x}, {avg_y}, {avg_z}). "
        f"CURRENT POSITION: ({current_x}, {current_y}, {current_z})"
    )
    return lpc_message


def read_each_log(folder_path: str, issue_url: str) -> None:
    """Read log and comment error portion on JIRA ticket."""
    for file_name in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file_name)
        not_found_words = []
        print(file_path)
        if file_path.endswith(".log"):
            with open(file_path) as file:
                lines = file.readlines()
            words = [
                "error",
                "traceback",
                "error frame encountered",
                "did not receive",
                "collision_detected",
                "fail",
                "warning",
                "failure",
                "homingfail",
                "timed out",
                "exception",
            ]
            error_lines = ""
            for word in words:
                content_list = []
                for line_index, line in enumerate(lines):
                    if word in line.lower():
                        lines_before = max(0, line_index - 10)
                        lines_after = min(len(lines), line_index + 10)
                        error_lines = "".join(lines[lines_before:lines_after])
                        code_lines = {
                            "type": "codeBlock",
                            "content": [{"type": "text", "text": error_lines}],
                        }
                        content_list.append(code_lines)
                num_times = len(content_list)
                if num_times == 0:
                    not_found_words.append(word)
                else:
                    message = f"Key word '{word.upper()}' found in {file_name} {num_times} TIMES."
                    line_1 = {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": message}],
                    }
                    content_list.insert(0, line_1)
                    ticket.comment(content_list, issue_key)
            no_word_found_message = (
                f"Key words '{not_found_words} were not found in {file_name}."
            )
            no_word_found_dict = {
                "type": "paragraph",
                "content": [{"type": "text", "text": no_word_found_message}],
            }
            content_list.append(no_word_found_dict)
            ticket.comment(content_list, issue_key)


def match_error_to_component(
    project_id: str, error_message: str, components: List[str]
) -> List[str]:
    """Match error to component based on error message."""
    project_components = ticket.get_project_components(project_id)
    component_names = [proj_comp["name"] for proj_comp in project_components]
    for component in component_names:
        pattern = re.compile(component, re.IGNORECASE)
        matches = pattern.findall(error_message)
        if matches:
            components.append(component)
    return components


def get_user_id(user_file_path: str, assignee_name: str) -> str:
    """Get assignee account id."""
    users = json.load(open(user_file_path))
    assignee_id = "-1"  # Code to leave issue unassigned.
    for item in users:
        user = users[item]
        if user["displayName"] == assignee_name:
            assignee_id = user["accountId"]
    return assignee_id


def get_error_runs_from_robot(ip: str) -> Tuple[List[str], List[str]]:
    """Get runs that have errors from robot."""
    error_run_ids = []
    protocol_ids = []
    response = requests.get(
        f"http://{ip}:31950/runs", headers={"opentrons-version": "3"}
    )
    run_data = response.json()
    run_list = run_data.get("data", [])
    for run in run_list:
        run_id = run["id"]
        protocol_id = run["protocolId"]
        num_of_errors = len(run["errors"])
        if not run["current"] and num_of_errors > 0:
            error_run_ids.append(run_id)
            # Protocol ID will identify the correct folder on the robot of the protocol file
            protocol_ids.append(protocol_id)
    return (error_run_ids, protocol_ids)


def get_robot_state(
    ip: str, reported_string: str
) -> Tuple[Any, Any, Any, List[str], List[str], str]:
    """Get robot status in case of non run error."""
    description = dict()
    # Get instruments attached to robot
    try:
        response = requests.get(
            f"http://{ip}:31950/health", headers={"opentrons-version": "3"}
        )
        print(f"Connected to {ip}")
    except Exception:
        print(f"ERROR: Failed to read IP address: {ip}")
        sys.exit()
    response = requests.get(
        f"http://{ip}:31950/health", headers={"opentrons-version": "3"}
    )
    health_data = response.json()
    print(f"health data {health_data}")
    robot = health_data.get("name", "")
    # Create summary name
    description["robot_name"] = robot
    summary = robot + "_" + reported_string
    affects_version = health_data.get("api_version", "")
    description["affects_version"] = affects_version
    # Instruments Attached
    response = requests.get(
        f"http://{ip}:31950/instruments", headers={"opentrons-version": "3"}
    )

    instrument_data = response.json()
    for instrument in instrument_data["data"]:
        description[instrument["mount"]] = instrument
    # Get modules attached to robot
    response = requests.get(
        f"http://{ip}:31950/modules", headers={"opentrons-version": "3"}
    )
    module_data = response.json()
    for module in module_data["data"]:
        description[module["moduleType"]] = module
    components = ["Flex-RABR"]
    components = match_error_to_component("RABR", reported_string, components)
    if "alpha" in affects_version:
        components.append("flex internal releases")
    labels = [robot]
    if "8.2" in affects_version:
        labels.append("8_2_0")
    parent = affects_version + " Bugs"
    print(components)
    end_time = datetime.now()
    print(end_time)
    start_time = end_time - timedelta(hours=2)
    print(start_time)
    # Get current temp/rh compared to historical data
    temp_rh_string = compare_current_trh_to_average(
        parent, start_time, end_time, "", storage_directory
    )
    description["Robot Temp and RH Comparison"] = temp_rh_string
    whole_description_str = (
        "{"
        + "\n".join("{!r}: {!r},".format(k, v) for k, v in description.items())
        + "}"
    )
    return (
        summary,
        parent,
        affects_version,
        components,
        labels,
        whole_description_str,
    )


def get_run_error_info_from_robot(
    ip: str, one_run: str, storage_directory: str, protocol_found: bool
) -> Tuple[str, str, str, List[str], List[str], str, str]:
    """Get error information from robot to fill out ticket."""
    description = dict()
    # get run information
    results = get_run_logs.get_run_data(one_run, ip)
    # save run information to local directory as .json file
    saved_file_path = read_robot_logs.save_run_log_to_json(
        ip, results, storage_directory
    )
    # Error Printout
    error_dict = read_robot_logs.get_error_info(results)
    error_level = error_dict["Error_Level"]
    error_type = error_dict["Error_Type"]
    error_code = error_dict["Error_Code"]
    error_instrument = error_dict["Error_Instrument"]
    # JIRA Ticket Fields
    robot = results.get("robot_name", "")
    failure_level = "Level " + str(error_level) + " Failure"

    components = [failure_level, "Flex-RABR"]
    components = match_error_to_component("RABR", str(error_type), components)
    affects_version = results["API_Version"]
    if "alpha" in affects_version:
        components.append("flex internal releases")
    labels = [robot]
    if "8.2" in affects_version:
        labels.append("8_2_0")
    parent = affects_version + " Bugs"
    summary = robot + "_" + str(one_run) + "_" + str(error_code) + "_" + error_type
    # Description of error
    description["protocol_name"] = results["protocol"]["metadata"].get(
        "protocolName", ""
    )

    # If Protocol was successfully retrieved from the robot
    description["protocol_found_on_robot"] = protocol_found
    # Get start and end time of run
    start_time = datetime.strptime(
        results.get("startedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
    )
    adjusted_start_time = start_time - timedelta(hours=4)
    complete_time = datetime.strptime(
        results.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
    )
    adjusted_complete_time = complete_time - timedelta(hours=4)
    # Get average temp and rh of robot and protocol the error occurred on.
    temp_rh_comparison = compare_current_trh_to_average(
        parent,
        adjusted_start_time,
        adjusted_complete_time,
        description["protocol_name"],
        storage_directory,
    )
    # Get LPC coordinates of labware of failure
    lpc_dict = results["labwareOffsets"]
    labware_dict = results["labware"]
    description["error"] = " ".join([error_code, error_type, error_instrument])
    protocol_step = list(results["commands"])[-1]
    errored_labware_id = protocol_step["params"].get("labwareId", "")
    errored_labware_dict = {}
    lpc_message = ""
    # If there is labware included in the error message, its LPC coords will be extracted.
    if len(errored_labware_id) > 0:
        for labware in labware_dict:
            if labware["id"] == errored_labware_id:
                errored_labware_dict["Slot"] = labware["location"].get("slotName", "")
                errored_labware_dict["Labware Type"] = labware.get("definitionUri", "")
                offset_id = labware.get("offsetId", "")
                labware_slot = errored_labware_dict["Slot"]
                if str(labware_slot) == "":
                    lpc_message = "No labware slot was associated with this error. \
Please manually check LPC data."
                elif offset_id == "":
                    lpc_message = f"The current LPC coords found at {labware_slot} are (0, 0, 0). \
Please confirm with the ABR-LPC sheet and re-LPC."
                else:
                    for lpc in lpc_dict:
                        if lpc.get("id", "") == offset_id:
                            errored_labware_dict["X"] = lpc["vector"].get("x", "")
                            errored_labware_dict["Y"] = lpc["vector"].get("y", "")
                            errored_labware_dict["Z"] = lpc["vector"].get("z", "")
                            errored_labware_dict["Module"] = lpc["location"].get(
                                "moduleModel", ""
                            )
                            errored_labware_dict["Adapter"] = lpc["location"].get(
                                "definitionUri", ""
                            )

                            lpc_message = compare_lpc_to_historical_data(
                                errored_labware_dict, parent, storage_directory
                            )

    description["protocol_step"] = protocol_step
    description["right_mount"] = results.get("right", "No attachment")
    description["left_mount"] = results.get("left", "No attachment")
    description["gripper"] = results.get("extension", "No attachment")
    if len(lpc_message) < 1:
        lpc_message = "No LPC coordinates found in relation to error."
    description["LPC Comparison"] = lpc_message
    description["Robot Temp and RH Comparison"] = temp_rh_comparison
    all_modules = abr_google_drive.get_modules(results)
    whole_description = {**description, **all_modules}
    whole_description_str = (
        "{"
        + "\n".join("{!r}: {!r},".format(k, v) for k, v in whole_description.items())
        + "}"
    )

    return (
        summary,
        parent,
        affects_version,
        components,
        labels,
        whole_description_str,
        saved_file_path,
    )


if __name__ == "__main__":
    """Create ticket for specified robot."""
    parser = argparse.ArgumentParser(description="Pulls run logs from ABR robots.")
    parser.add_argument(
        "storage_directory",
        metavar="STORAGE_DIRECTORY",
        type=str,
        nargs=1,
        help="Path to long term storage directory for run logs.",
    )
    parser.add_argument(
        "jira_api_token",
        metavar="JIRA_API_TOKEN",
        type=str,
        nargs=1,
        help="JIRA API Token. Get from https://id.atlassian.com/manage-profile/security.",
    )
    parser.add_argument(
        "email",
        metavar="EMAIL",
        type=str,
        nargs=1,
        help="Email connected to JIRA account.",
    )
    # TODO: write function to get reporter_id from email.
    parser.add_argument(
        "reporter_id",
        metavar="REPORTER_ID",
        type=str,
        nargs=1,
        help="JIRA Reporter ID.",
    )
    # TODO: improve help comment on jira board id.
    parser.add_argument(
        "board_id",
        metavar="BOARD_ID",
        type=str,
        nargs=1,
        help="JIRA Board ID. RABR is 217",
    )
    args = parser.parse_args()
    storage_directory = args.storage_directory[0]
    ip = str(input("Enter Robot IP: "))
    assignee = str(input("Enter Assignee Full Name:"))
    run_or_other = str(
        input(
            "Press ENTER to report run error. If not a run error, type short summary of error: "
        )
    )
    url = "https://opentrons.atlassian.net"
    api_token = args.jira_api_token[0]
    email = args.email[0]
    board_id = args.board_id[0]
    reporter_id = args.reporter_id[0]
    file_paths = read_robot_logs.get_logs(storage_directory, ip)
    ticket = jira_tool.JiraTicket(url, api_token, email)
    users_file_path = ticket.get_jira_users(storage_directory)
    assignee_id = get_user_id(users_file_path, assignee)
    run_log_file_path = ""
    protocol_found = False
    try:
        error_runs, protocol_ids = get_error_runs_from_robot(ip)
    except requests.exceptions.InvalidURL:
        print("Invalid IP address.")
        sys.exit()
    if len(run_or_other) < 1:
        # Retrieve the most recently run protocol file
        protocol_files_path = retrieve_protocol_file(
            protocol_ids[-1], ip, storage_directory
        )
        # Set protocol_found to true if python protocol was successfully copied over
        if protocol_files_path:
            protocol_found = True

        one_run = error_runs[-1]  # Most recent run with error.
        (
            summary,
            parent,
            affects_version,
            components,
            labels,
            whole_description_str,
            run_log_file_path,
        ) = get_run_error_info_from_robot(
            ip, one_run, storage_directory, protocol_found
        )
    else:
        (
            summary,
            parent,
            affects_version,
            components,
            labels,
            whole_description_str,
        ) = get_robot_state(ip, run_or_other)
    # Get Calibration Data
    saved_file_path_calibration, calibration = read_robot_logs.get_calibration_offsets(
        ip, storage_directory
    )

    print(f"Making ticket for {summary}.")
    # TODO: make argument or see if I can get rid of with using board_id.
    project_key = "RABR"
    # TODO: read board to see if ticket for run id already exists.
    all_issues = ticket.issues_on_board(project_key)
    # CREATE TICKET
    issue_key, raw_issue_url = ticket.create_ticket(
        summary,
        whole_description_str,
        project_key,
        reporter_id,
        assignee_id,
        "Bug",
        "Medium",
        components,
        affects_version,
        labels,
        parent,
    )
    # Link Tickets
    to_link = ticket.match_issues(all_issues, summary)
    ticket.link_issues(to_link, issue_key)
    # OPEN TICKET
    issue_url = ticket.open_issue(issue_key)
    # MOVE FILES TO ERROR FOLDER.
    print(protocol_files_path)
    error_files = [saved_file_path_calibration, run_log_file_path] + file_paths

    # Move protocol file(s) to error folder
    if protocol_files_path:
        for file in os.listdir(protocol_files_path):
            error_files.append(os.path.join(protocol_files_path, file))

    error_folder_path = os.path.join(storage_directory, "issue_key")
    os.makedirs(error_folder_path, exist_ok=True)
    for source_file in error_files:
        try:
            destination_file = os.path.join(
                error_folder_path, os.path.basename(source_file)
            )
            shutil.move(source_file, destination_file)
        except shutil.Error:
            continue
    # POST ALL FILES TO TICKET
    list_of_files = os.listdir(error_folder_path)
    for file in list_of_files:
        file_to_attach = os.path.join(error_folder_path, file)
        ticket.post_attachment_to_ticket(issue_key, file_to_attach)
    # ADD ERROR COMMENTS TO TICKET
    read_each_log(error_folder_path, raw_issue_url)
    # WRITE ERRORED RUN TO GOOGLE SHEET
    if len(run_or_other) < 1:
        # CONNECT TO GOOGLE DRIVE
        credentials_path = os.path.join(storage_directory, "credentials.json")
        google_sheet_name = "ABR-run-data"
        google_drive = google_drive_tool.google_drive(
            credentials_path,
            "1Cvej0eadFOTZr9ILRXJ0Wg65ymOtxL4m",
            "rhyann.clarke@opentrons.ocm",
        )
        # CONNECT TO GOOGLE SHEET
        google_sheet = google_sheets_tool.google_sheet(
            credentials_path, google_sheet_name, 0
        )
        error_run_log = os.path.join(
            error_folder_path, os.path.basename(run_log_file_path)
        )
        try:
            google_drive.upload_file(error_run_log, "1Cvej0eadFOTZr9ILRXJ0Wg65ymOtxL4m")
        except FileNotFoundError:
            print("Run file not uploaded.")
        run_id = os.path.basename(error_run_log).split("_")[1].split(".")[0]
        # Get hellma readings
        file_values = plate_reader.read_hellma_plate_files(storage_directory, 101934)

        (
            runs_and_robots,
            headers,
            runs_and_lpc,
            headers_lpc,
        ) = abr_google_drive.create_data_dictionary(
            run_id,
            error_folder_path,
            issue_url,
            file_values,
        )

        start_row = google_sheet.get_index_row() + 1
        google_sheet.batch_update_cells(runs_and_robots, "A", start_row, "0")
        print("Wrote run to ABR-run-data")
        # Add LPC to google sheet
        google_sheet_lpc = google_sheets_tool.google_sheet(
            credentials_path, "ABR-LPC", 0
        )
        start_row_lpc = google_sheet_lpc.get_index_row() + 1
        google_sheet_lpc.batch_update_cells(runs_and_lpc, "A", start_row_lpc, "0")
    else:
        print("Ticket created.")
    # Open folder directory incase uploads to ticket were incomplete
    subprocess.Popen(["explorer", error_folder_path])
