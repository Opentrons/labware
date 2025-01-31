"""Get Calibration logs from robots."""
from typing import Dict, Any, List, Set
import argparse
import os
import json
import sys
import traceback
import hashlib
from abr_testing.data_collection import read_robot_logs
from abr_testing.automation import google_drive_tool, google_sheets_tool


def instrument_helper(
    headers_beg: List[str],
    headers_end: List[str],
    calibration_log: Dict[Any, Any],
    google_sheet_name: str,
    inst_sheet_serials: Set[str],
    inst_sheet_modify_dates: Set[str],
    storage_directory: str,
) -> List[Any]:
    """Helper for parsing instrument calibration data."""
    # Populate Instruments
    # INSTRUMENT SHEET
    instruments_upload_rows: List[Any] = []
    instrument_headers = (
        headers_beg + list(calibration_log["Instruments"][0].keys())[:7] + headers_end
    )
    local_instrument_file = google_sheet_name + "-Instruments"
    read_robot_logs.create_abr_data_sheet(
        storage_directory, local_instrument_file, instrument_headers
    )
    # INSTRUMENTS DATA
    instruments = calibration_log["Instruments"]
    for instrument in range(len(instruments)):
        one_instrument = instruments[instrument]
        inst_serial = one_instrument["serialNumber"]
        modified = one_instrument["data"]["calibratedOffset"].get("last_modified", "")
        if inst_serial in inst_sheet_serials and modified in inst_sheet_modify_dates:
            continue
        x = one_instrument["data"]["calibratedOffset"]["offset"].get("x", "")
        y = one_instrument["data"]["calibratedOffset"]["offset"].get("y", "")
        z = one_instrument["data"]["calibratedOffset"]["offset"].get("z", "")
        instrument_row = (
            list(calibration_log.values())[:4]
            + list(one_instrument.values())[:7]
            + list([x, y, z, modified])
        )
        instruments_upload_rows.append(instrument_row)
    return instruments_upload_rows


def module_helper(
    headers_beg: List[str],
    headers_end: List[str],
    calibration_log: Dict[Any, Any],
    google_sheet_name: str,
    module_sheet_serials: Set[str],
    module_modify_dates: Set[str],
    storage_directory: str,
) -> List[Any]:
    """Helper for parsing module calibration data."""
    # Populate Modules
    # MODULE SHEET
    modules_upload_rows: List[Any] = []
    if len(calibration_log.get("Modules", "")) > 0:
        module_headers = (
            headers_beg + list(calibration_log["Modules"][0].keys())[:7] + headers_end
        )
        local_modules_file = google_sheet_name + "-Modules"
        read_robot_logs.create_abr_data_sheet(
            storage_directory, local_modules_file, module_headers
        )
        # MODULES DATA
        modules = calibration_log["Modules"]
        for module in range(len(modules)):
            one_module = modules[module]
            mod_serial = one_module["serialNumber"]
            try:
                modified = one_module["moduleOffset"].get("last_modified", "")
                x = one_module["moduleOffset"]["offset"].get("x", "")
                y = one_module["moduleOffset"]["offset"].get("y", "")
                z = one_module["moduleOffset"]["offset"].get("z", "")
            except KeyError:
                continue
            if mod_serial in module_sheet_serials and modified in module_modify_dates:
                continue
            module_row = (
                list(calibration_log.values())[:4]
                + list(one_module.values())[:7]
                + list([x, y, z, modified])
            )
            modules_upload_rows.append(module_row)
    return modules_upload_rows


def create_hash(
    robot_name: str, deck_slot: str, pipette_calibrated_with: str, last_modified: str
) -> str:
    """Create unique hash identifier for deck calibrations."""
    combined_string = robot_name + deck_slot + pipette_calibrated_with + last_modified
    hashed_obj = hashlib.sha256(combined_string.encode())
    return hashed_obj.hexdigest()


def deck_helper(
    headers_beg: List[str],
    headers_end: List[str],
    calibration_log: Dict[Any, Any],
    google_sheet_name: str,
    deck_sheet_hashes: Set[str],
    storage_directory: str,
) -> List[Any]:
    """Helper for parsing deck calibration data."""
    deck_upload_rows: List[Any] = []
    # Populate Deck
    # DECK SHEET
    local_deck_file = google_sheet_name + "-Deck"
    deck_headers = headers_beg + list(["pipetteCalibratedWith", "Slot"]) + headers_end
    read_robot_logs.create_abr_data_sheet(
        storage_directory, local_deck_file, deck_headers
    )
    # DECK DATA
    deck = calibration_log["Deck"]
    deck_modified = str(deck["data"].get("lastModified"))
    slots = ["D3", "D1", "A1"]
    pipette_calibrated_with = str(deck["data"].get("pipetteCalibratedWith", ""))
    for i in range(len(deck["data"]["matrix"])):
        robot = calibration_log["Robot"]
        deck_slot = slots[i]
        unique_hash = create_hash(
            robot, deck_slot, pipette_calibrated_with, deck_modified
        )
        if unique_hash in deck_sheet_hashes:
            continue
        coords = deck["data"]["matrix"][i]
        x = coords[0]
        y = coords[1]
        z = coords[2]
        deck_row = list(calibration_log.values())[:4] + list(
            [pipette_calibrated_with, slots[i], x, y, z, deck_modified]
        )
        deck_upload_rows.append(deck_row)
    return deck_upload_rows


def send_batch_update(
    instruments_upload_rows: List[str],
    google_sheet_instruments: google_sheets_tool.google_sheet,
    modules_upload_rows: List[str],
    google_sheet_modules: google_sheets_tool.google_sheet,
    deck_upload_rows: List[str],
    google_sheet_deck: google_sheets_tool.google_sheet,
) -> None:
    """Executes batch updates."""
    # Prepare data for batch update
    try:
        transposed_instruments_upload_rows = list(
            map(list, zip(*instruments_upload_rows))
        )
        google_sheet_instruments.batch_update_cells(
            transposed_instruments_upload_rows,
            "A",
            google_sheet_instruments.get_index_row() + 1,
            "0",
        )
    except Exception:
        print("No new instrument data")
    try:
        transposed_module_upload_rows = list(map(list, zip(*modules_upload_rows)))
        google_sheet_modules.batch_update_cells(
            transposed_module_upload_rows,
            "A",
            google_sheet_modules.get_index_row() + 1,
            "1020695883",
        )
    except Exception:
        print("No new module data")
    try:
        transposed_deck_upload_rows = list(map(list, zip(*deck_upload_rows)))
        google_sheet_deck.batch_update_cells(
            transposed_deck_upload_rows,
            "A",
            google_sheet_deck.get_index_row() + 1,
            "1332568460",
        )
    except Exception:
        print("No new deck data")


def upload_calibration_offsets(
    calibration_data: List[Dict[str, Any]],
    storage_directory: str,
    google_sheet_instruments: google_sheets_tool.google_sheet,
    google_sheet_modules: google_sheets_tool.google_sheet,
    google_sheet_deck: google_sheets_tool.google_sheet,
    google_sheet_name: str,
) -> None:
    """Upload calibration data to google_sheet."""
    # Common Headers
    headers_beg = list(calibration_data[0].keys())[:4]
    headers_end = list(["X", "Y", "Z", "lastModified"])
    sheets = [google_sheet_instruments, google_sheet_modules, google_sheet_deck]
    instruments_upload_rows: List[Any] = []
    modules_upload_rows: List[Any] = []
    deck_upload_rows: List[Any] = []
    inst_sheet_serials: Set[str] = set()
    inst_sheet_modify_dates: Set[str] = set()
    module_sheet_serials: Set[str] = set()
    deck_sheet_hashes: Set[str] = set()
    # Get current serials, and modified info from google sheet
    for i, sheet in enumerate(sheets):
        if i == 0:
            inst_sheet_serials = sheet.get_column(8)
            inst_sheet_modify_dates = sheet.get_column(15)
        if i == 1:
            module_sheet_serials = sheet.get_column(6)
            module_modify_dates = sheet.get_column(15)
        elif i == 2:
            deck_sheet_hashes = sheet.get_column(11)

    # Iterate through calibration logs and accumulate data
    for calibration_log in calibration_data:
        for sheet_ind, sheet in enumerate(sheets):
            if sheet_ind == 0:
                instruments_upload_rows += instrument_helper(
                    headers_beg,
                    headers_end,
                    calibration_log,
                    google_sheet_name,
                    inst_sheet_serials,
                    inst_sheet_modify_dates,
                    storage_directory,
                )
            elif sheet_ind == 1:
                modules_upload_rows += module_helper(
                    headers_beg,
                    headers_end,
                    calibration_log,
                    google_sheet_name,
                    module_sheet_serials,
                    module_modify_dates,
                    storage_directory,
                )
            elif sheet_ind == 2:
                deck_upload_rows += deck_helper(
                    headers_beg,
                    headers_end,
                    calibration_log,
                    google_sheet_name,
                    deck_sheet_hashes,
                    storage_directory,
                )
    send_batch_update(
        instruments_upload_rows,
        google_sheet_instruments,
        modules_upload_rows,
        google_sheet_modules,
        deck_upload_rows,
        google_sheet_deck,
    )


def run(
    storage_directory: str, folder_name: str, google_sheet_name_param: str, email: str
) -> None:
    """Main control function."""
    # Connect to google drive.
    google_sheet_name = google_sheet_name_param
    try:
        credentials_path = os.path.join(storage_directory, "credentials.json")
    except FileNotFoundError:
        print(f"Add credentials.json file to: {storage_directory}.")
        sys.exit()
    google_drive = google_drive_tool.google_drive(credentials_path, folder_name, email)
    # Connect to google sheet
    google_sheet_instruments = google_sheets_tool.google_sheet(
        credentials_path, google_sheet_name, 0
    )
    google_sheet_modules = google_sheets_tool.google_sheet(
        credentials_path, google_sheet_name, 1
    )
    google_sheet_deck = google_sheets_tool.google_sheet(
        credentials_path, google_sheet_name, 2
    )
    ip_json_file = os.path.join(storage_directory, "IPs.json")
    try:
        ip_file = json.load(open(ip_json_file))
        robot_dict = ip_file.get("ip_address_list")
    except FileNotFoundError:
        print(f"Add .json file with robot IPs to: {storage_directory}.")
        sys.exit()
    ip_or_all = ""
    while not ip_or_all:
        ip_or_all = input("IP Address or ALL: ")
        calibration_data = []
        if ip_or_all.upper() == "ALL":
            ip_address_list = list(robot_dict.keys())
            for ip in ip_address_list:
                saved_file_path, calibration = read_robot_logs.get_calibration_offsets(
                    ip, storage_directory
                )
                calibration_data.append(calibration)
        else:
            try:
                (
                    saved_file_path,
                    calibration,
                ) = read_robot_logs.get_calibration_offsets(
                    ip_or_all, storage_directory
                )
                calibration_data.append(calibration)
            except Exception:
                print("Invalid IP try again")
                ip_or_all = ""
    try:
        upload_calibration_offsets(
            calibration_data,
            storage_directory,
            google_sheet_instruments,
            google_sheet_modules,
            google_sheet_deck,
            google_sheet_name,
        )
        print("Successfully uploaded calibration data!")
    except Exception:
        print("No calibration data to upload: ")
        traceback.print_exc()
        sys.exit(1)
    google_drive.upload_missing_files(storage_directory)


if __name__ == "__main__":
    """Get calibration logs."""
    parser = argparse.ArgumentParser(
        description="Pulls calibration logs from ABR robots."
    )
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
        "google_sheet_name",
        metavar="GOOGLE_SHEET_NAME",
        type=str,
        nargs=1,
        help="Google sheet name.",
    )
    parser.add_argument(
        "email", metavar="EMAIL", type=str, nargs=1, help="opentrons gmail."
    )
    args = parser.parse_args()
    storage_directory = args.storage_directory[0]
    folder_name = args.folder_name[0]
    google_sheet_name = args.google_sheet_name[0]
    email = args.email[0]
    run(storage_directory, folder_name, google_sheet_name, email)
