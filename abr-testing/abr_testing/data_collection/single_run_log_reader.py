"""Reads single run log retrieved by get_run_logs.py and saves to local csv."""
import argparse
import sys
import os
import csv
from abr_testing.data_collection import read_robot_logs
from abr_testing.data_collection import abr_google_drive
from abr_testing.tools import plate_reader

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Read single run log locally saved.")
    parser.add_argument(
        "run_log_file_path",
        metavar="RUN_LOG_FILE_PATH",
        type=str,
        nargs=1,
        help="Folder path that holds individual run logs of interest.",
    )
    args = parser.parse_args()
    run_log_file_path = args.run_log_file_path[0]

    try:
        credentials_path = os.path.join(run_log_file_path, "credentials.json")
    except FileNotFoundError:
        print(f"Add credentials.json file to: {run_log_file_path}.")
        sys.exit()
    # Get Runs from Storage and Read Logs
    run_ids_in_storage = read_robot_logs.get_run_ids_from_storage(run_log_file_path)
    # Get hellma readins
    file_values = plate_reader.read_hellma_plate_files(run_log_file_path, 101934)

    (
        runs_and_robots,
        header,
        runs_and_lpc,
        lpc_headers,
    ) = abr_google_drive.create_data_dictionary(
        run_ids_in_storage,
        run_log_file_path,
        "",
        file_values,
    )
    print("list_of_heights not recorded.")
    transposed_list = list(zip(*runs_and_robots))
    # Adds Run to local csv
    sheet_location = os.path.join(run_log_file_path, "saved_data.csv")
    file_exists = os.path.exists(sheet_location) and os.path.getsize(sheet_location) > 0
    with open(sheet_location, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(header)
        for run in transposed_list:
            # Add new row
            writer.writerow(run)
