"""ABR Run Log Pull."""
from typing import Set, Dict, Any
import argparse
import os
import json
import requests
import sys
from abr_testing.data_collection import read_robot_logs
from abr_testing.automation import google_drive_tool


def get_run_ids_from_robot(ip: str) -> Set[str]:
    """Get all completed runs from each robot."""
    run_ids = set()
    try:
        response = requests.get(
            f"http://{ip}:31950/runs", headers={"opentrons-version": "3"}
        )
        run_data = response.json()
        run_list = run_data.get("data", "")
    except requests.exceptions.RequestException:
        print(f"Could not connect to robot with IP {ip}")
        run_list = []
    for run in run_list:
        run_id = run["id"]
        if not run["current"]:
            run_ids.add(run_id)
    return run_ids


def get_run_data(one_run: Any, ip: str) -> Dict[str, Any]:
    """Use http requests to get command, health, and protocol data from robot."""
    response = requests.get(
        f"http://{ip}:31950/runs/{one_run}/commands",
        headers={"opentrons-version": "3"},
        params={"cursor": 0, "pageLength": 0},
    )
    data = response.json()
    command_count = data["meta"]["totalLength"]
    page_length = 100
    commands = list()
    run = dict()
    for cursor in range(0, command_count, page_length):
        response = requests.get(
            f"http://{ip}:31950/runs/{one_run}/commands",
            headers={"opentrons-version": "3"},
            params={"cursor": cursor, "pageLength": page_length},
        )
        command_data = response.json()
        commands.extend(command_data.get("data", ""))
    run["commands"] = commands
    response = requests.get(
        f"http://{ip}:31950/runs/{one_run}", headers={"opentrons-version": "3"}
    )
    run_meta_data = response.json()
    protocol_id = run_meta_data["data"]["protocolId"]
    run.update(run_meta_data["data"])
    response = requests.get(
        f"http://{ip}:31950/protocols/{protocol_id}", headers={"opentrons-version": "3"}
    )
    protocol_data = response.json()
    run["protocol"] = protocol_data["data"]
    response = requests.get(
        f"http://{ip}:31950/health", headers={"opentrons-version": "3"}
    )
    health_data = response.json()
    run["robot_name"] = health_data.get("name", "")
    run["API_Version"] = health_data.get("api_version", "")
    run["robot_serial"] = health_data.get("robot_serial", "")
    run["run_id"] = one_run

    # Instruments Attached
    response = requests.get(
        f"http://{ip}:31950/instruments", headers={"opentrons-version": "3"}
    )
    instrument_data = response.json()
    for instrument in instrument_data["data"]:
        run[instrument["mount"]] = instrument["serialNumber"]
    return run


def save_runs(runs_to_save: Set[str], ip: str, storage_directory: str) -> Set[str]:
    """Saves runs to user given storage directory."""
    saved_file_paths = set()
    for a_run in runs_to_save:
        data = get_run_data(a_run, ip)
        saved_file_path = read_robot_logs.save_run_log_to_json(
            ip, data, storage_directory
        )
        saved_file_paths.add(saved_file_path)
    print(f"Saved {len(runs_to_save)} run(s) from robot with IP address {ip}.")
    return saved_file_paths


def get_all_run_logs(
    storage_directory: str, google_drive: google_drive_tool.google_drive
) -> None:
    """GET ALL RUN LOGS.

    Connect to each ABR robot to read run log data.
    Read each robot's list of unique run log IDs and compare them to all IDs in storage.
    Any ID that is not in storage, download the run log and put it in storage.
    """
    ip_json_file = os.path.join(storage_directory, "IPs.json")
    try:
        ip_file = json.load(open(ip_json_file))
        robot_dict = ip_file.get("ip_address_list")
    except FileNotFoundError:
        print(f"Add .json file with robot IPs to: {storage_directory}.")
        sys.exit()
    ip_address_list = list(robot_dict.keys())
    runs_from_storage = read_robot_logs.get_run_ids_from_google_drive(google_drive)
    for ip in ip_address_list:
        runs = get_run_ids_from_robot(ip)
        runs_to_save = read_robot_logs.get_unseen_run_ids(runs, runs_from_storage)
        save_runs(runs_to_save, ip, storage_directory)
        google_drive.upload_missing_files(storage_directory)


def run(storage_directory: str, folder_name: str, email: str) -> None:
    """Main control function."""
    try:
        credentials_path = os.path.join(storage_directory, "credentials.json")
    except FileNotFoundError:
        print(f"Add credentials.json file to: {storage_directory}.")
        sys.exit()
    google_drive = google_drive_tool.google_drive(credentials_path, folder_name, email)
    get_all_run_logs(storage_directory, google_drive)


if __name__ == "__main__":
    """Get run logs."""
    parser = argparse.ArgumentParser(description="Pulls run logs from ABR robots.")
    parser.add_argument(
        "storage_directory",
        metavar="STORAGE_DIRECTORY",
        type=str,
        nargs=1,
        help="Path to long term storage directory for run logs.",
    )
    parser.add_argument(
        "folder_name",
        metavar="FOLDER_NAME",
        type=str,
        nargs=1,
        help="Google Drive folder name. Open desired folder and copy string after drive/folders/.",
    )
    parser.add_argument(
        "email", metavar="EMAIL", type=str, nargs=1, help="opentrons gmail."
    )
    args = parser.parse_args()
    storage_directory = args.storage_directory[0]
    folder_name = args.folder_name[0]
    email = args.email[0]
    run(storage_directory, folder_name, email)
