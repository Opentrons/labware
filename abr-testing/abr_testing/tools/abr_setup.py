"""Automate ABR data collection."""
import os
import time
import configparser
import traceback
import sys
from datetime import datetime, timedelta
from typing import Any
from hardware_testing.scripts import ABRAsairScript  # type: ignore
from abr_testing.automation import google_sheets_tool
from abr_testing.data_collection import (
    get_run_logs,
    abr_google_drive,
    abr_calibration_logs,
)
from abr_testing.tools import sync_abr_sheet


def clean_sheet(sheet_name: str, credentials: str) -> Any:
    """Remove data older than 60 days from sheet."""
    sheet = google_sheets_tool.google_sheet(
        credentials=credentials, file_name=sheet_name, tab_number=0
    )
    date_columns = sheet.get_column(3)
    curr_date = datetime.now()
    cutoff_days = 60  # Cutoff period in days
    cutoff_date = curr_date - timedelta(days=cutoff_days)

    rem_rows = []
    for row_id, date in enumerate(date_columns):
        # Convert to datetime if needed
        formatted_date = None
        if isinstance(date, str):  # Assuming dates might be strings
            try:
                formatted_date = datetime.strptime(date, "%m/%d/%Y")
            except ValueError:
                try:
                    formatted_date = datetime.strptime(date, "%Y-%m-%d")
                except ValueError:
                    continue

        # Check if the date is older than the cutoff
        if formatted_date < cutoff_date:
            rem_rows.append(row_id)
        if len(rem_rows) > 1500:
            break
    if len(rem_rows) == 0:
        # No more rows to remove
        print("Nothing to remove")
        return
    print(f"Rows to be removed: {rem_rows}")
    try:
        sheet.batch_delete_rows(rem_rows)
        print("deleted rows")
    except Exception:
        print("could not delete rows")
        return

    clean_sheet(sheet_name, credentials)


def run_sync_abr_sheet(
    storage_directory: str, abr_data_sheet: str, room_conditions_sheet: str
) -> None:
    """Sync ABR sheet with temp and lifetime percents."""
    sync_abr_sheet.run(storage_directory, abr_data_sheet, room_conditions_sheet)


def run_temp_sensor(ambient_conditions_sheet: str, credentials: str) -> None:
    """Run temperature sensors on all robots."""
    # Remove entries > 60 days
    clean_sheet(ambient_conditions_sheet, credentials)
    processes = ABRAsairScript.run()
    for process in processes:
        process.start()
        time.sleep(20)
    for process in processes:
        process.join()


def get_abr_logs(storage_directory: str, folder_name: str, email: str) -> None:
    """Retrieve run logs on all robots and record missing run logs in google drive."""
    try:
        get_run_logs.run(storage_directory, folder_name, email)
    except Exception as e:
        print("Cannot Get Run Logs", e)
        traceback.print_exc


def record_abr_logs(
    storage_directory: str, folder_name: str, google_sheet_name: str, email: str
) -> None:
    """Write run logs to ABR run logs in sheets."""
    try:
        abr_google_drive.run(storage_directory, folder_name, google_sheet_name, email)
    except Exception as e:
        print(e)


def get_calibration_data(
    storage_directory: str, folder_name: str, google_sheet_name: str, email: str
) -> None:
    """Download calibration logs and write to ABR-calibration-data in sheets."""
    try:
        abr_calibration_logs.run(
            storage_directory, folder_name, google_sheet_name, email
        )
    except Exception as e:
        print("Cannot get calibration data", e)
        traceback.print_exc()


def main(configurations: configparser.ConfigParser) -> None:
    """Main function."""
    storage_directory = None
    email = None
    drive_folder = None
    sheet_name = None
    ambient_conditions_sheet = None
    sheet_url = None

    # If default is not specified get all values
    default = configurations["DEFAULT"]
    credentials = ""
    if default:
        try:
            credentials = default["Credentials"]
        except KeyError as e:
            print("Cannot read config file\n" + str(e))

    # Run Temperature Sensors
    ambient_conditions_sheet = configurations["TEMP-SENSOR"]["Sheet_Url"]
    ambient_conditions_sheet_name = configurations["TEMP-SENSOR"]["Sheet_Name"]
    print("Starting temp sensors...")
    run_temp_sensor(ambient_conditions_sheet_name, credentials)
    print("Temp Sensors Started")
    # Get Run Logs and Record
    storage_directory = configurations["RUN-LOG"]["Storage"]
    email = configurations["RUN-LOG"]["Email"]
    drive_folder = configurations["RUN-LOG"]["Drive_Folder"]
    sheet_name = configurations["RUN-LOG"]["Sheet_Name"]
    sheet_url = configurations["RUN-LOG"]["Sheet_Url"]
    print(sheet_name)
    if storage_directory and drive_folder and sheet_name and email:
        print("Retrieving robot run logs...")
        get_abr_logs(storage_directory, drive_folder, email)
        print("Recording robot run logs...")
        record_abr_logs(storage_directory, drive_folder, sheet_name, email)
        print("Run logs updated")
    else:
        print("Storage, Email, or Drive Folder is missing, please fix configs")
        sys.exit(1)
    # Update Google Sheet with missing temp/rh
    if storage_directory and sheet_url and ambient_conditions_sheet:
        run_sync_abr_sheet(storage_directory, sheet_url, ambient_conditions_sheet)
    # Collect calibration data
    storage_directory = configurations["CALIBRATION"]["Storage"]
    email = configurations["CALIBRATION"]["Email"]
    drive_folder = configurations["CALIBRATION"]["Drive_Folder"]
    sheet_name = configurations["CALIBRATION"]["Sheet_Name"]
    if storage_directory and drive_folder and sheet_name and email:
        print("Retrieving and recording robot calibration data...")
        get_calibration_data(storage_directory, drive_folder, sheet_name, email)
        print("Calibration logs updated")
    else:
        print(
            "Storage, Email, Drive Folder, or Sheet name is missing, please fix configs"
        )
        sys.exit(1)


if __name__ == "__main__":
    configurations = None
    configs_file = None
    while not configs_file:
        configs_file = input("Please enter path to config.ini: ")
        if os.path.exists(configs_file):
            break
        else:
            configs_file = None
            print("Please enter a valid path")
    try:
        configurations = configparser.ConfigParser()
        configurations.read(configs_file)
    except configparser.ParsingError as e:
        print("Cannot read configuration file\n" + str(e))
    if configurations:
        main(configurations)
