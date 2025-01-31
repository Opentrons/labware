"""Check ABR Protocols Simulate Successfully."""
from abr_testing.protocol_simulation import simulation_metrics
import os
from pathlib import Path
from typing import Dict, List, Tuple, Union
import traceback


def run(
    file_dict: Dict[str, Dict[str, Union[str, Path]]], labware_defs: List[Path]
) -> None:
    """Simulate protocol and raise errors."""
    for file in file_dict:
        path = file_dict[file]["path"]
        csv_params = ""
        try:
            csv_params = str(file_dict[file]["csv"])
        except KeyError:
            pass
        try:
            print(f"Simulating {file}")
            simulation_metrics.main(
                protocol_file_path=Path(path),
                save=False,
                parameters=csv_params,
                extra_files=labware_defs,
            )
        except Exception as e:
            traceback.print_exc()
            print(str(e))
        print("\n")


def search(seq: str, dictionary: dict) -> str:
    """Search for specific sequence in file."""
    for key in dictionary.keys():
        parts = key.split("_")
        if parts[0] == seq:
            return key
    return ""


def get_files() -> Tuple[Dict[str, Dict[str, Union[str, Path]]], List[Path]]:
    """Map protocols with corresponding csv files."""
    file_dict: Dict[str, Dict[str, Union[str, Path]]] = {}
    labware_defs = []
    for root, directories, _ in os.walk(root_dir):
        for directory in directories:
            if directory not in exclude:
                active_dir = os.path.join(root, directory)
                for file in os.listdir(
                    active_dir
                ):  # Iterate over files in `active_protocols`
                    if file.endswith(".py") and file not in exclude:
                        file_dict[file] = {}
                        file_dict[file]["path"] = Path(
                            os.path.abspath(
                                os.path.join(root_dir, os.path.join(directory, file))
                            )
                        )
            if directory == "csv_parameters":
                active_dir = os.path.join(root, directory)
                for file in os.listdir(
                    active_dir
                ):  # Iterate over files in `active_protocols`
                    if file.endswith(".csv") and file not in exclude:
                        search_str = file.split("_")[0]
                        protocol = search(search_str, file_dict)
                        if protocol:
                            file_dict[protocol]["csv"] = str(
                                os.path.abspath(
                                    os.path.join(
                                        root_dir, os.path.join(directory, file)
                                    )
                                )
                            )
            if directory == "custom_labware":
                active_dir = os.path.join(root, directory)
                for file in os.listdir(
                    active_dir
                ):  # Iterate over files in `active_protocols`
                    if file.endswith(".json") and file not in exclude:
                        labware_defs.append(
                            Path(
                                os.path.abspath(
                                    os.path.join(
                                        root_dir, os.path.join(directory, file)
                                    )
                                )
                            )
                        )
    return (file_dict, labware_defs)


if __name__ == "__main__":
    # Directory to search
    global root_dir
    root_dir = "abr_testing/protocols"
    global exclude
    exclude = [
        "__init__.py",
        "helpers.py",
    ]
    print("Simulating Protocols")
    file_dict, labware_defs = get_files()
    # print(file_dict)
    run(file_dict, labware_defs)
