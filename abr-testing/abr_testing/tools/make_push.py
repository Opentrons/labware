"""Push one or more folders to one or more robots."""
import subprocess
import json
from typing import List
from multiprocessing import Process, Queue

global folders
# Opentrons folders that can be pushed to robot
folders = [
    "abr-testing",
    "hardware-testing",
    "abr-testing + hardware-testing",
    "other",
]


def push_subroutine(cmd: str, queue: Queue) -> None:
    """Pushes specified folder to specified robot."""
    try:
        subprocess.run(cmd)
        queue.put(f"{cmd}: SUCCESS!\n")
    except Exception:
        queue.put(f"{cmd}: FAILED\n")


def main(folder_to_push: str, robot_to_push: str) -> int:
    """Main process!"""
    cmd = "make -C {folder} push-ot3 host={ip}"
    robot_ip_path = ""
    push_cmd = ""
    processes: List[Process] = []
    queue: Queue = Queue()
    folder_int = int(folder_to_push)
    if folders[folder_int].lower() == "abr-testing + hardware-testing":
        if robot_to_push.lower() == "all":
            robot_ip_path = input("Path to robot ips: ")
            with open(robot_ip_path, "r") as ip_file:
                robot_json = json.load(ip_file)
                robot_ips_dict = robot_json.get("ip_address_list")
                robot_ips = list(robot_ips_dict.keys())
                ip_file.close()
        else:
            robot_ips = [robot_to_push]
        for folder_name in folders[:-2]:
            # Push abr-testing and hardware-testing folders to all robots
            for robot in robot_ips:
                push_cmd = cmd.format(folder=folder_name, ip=robot)
                process = Process(
                    target=push_subroutine,
                    args=(
                        push_cmd,
                        queue,
                    ),
                )
                process.start()
                processes.append(process)
    else:

        if folder_int == (len(folders) - 1):
            folder_name = input("Which folder? ")
        else:
            folder_name = folders[folder_int]
        if robot_to_push.lower() == "all":
            robot_ip_path = input("Path to robot ips: ")
            with open(robot_ip_path, "r") as ip_file:
                robot_json = json.load(ip_file)
                robot_ips = robot_json.get("ip_address_list")
            ip_file.close()
        else:
            robot_ips = [robot_to_push]

        # Push folder to robots
        for robot in robot_ips:
            push_cmd = cmd.format(folder=folder_name, ip=robot)
            process = Process(target=push_subroutine, args=(push_cmd, queue))
            process.start()
            processes.append(process)

    for process in processes:
        process.join()
        result = queue.get()
        print(f"\n{result}")
    return 0


if __name__ == "__main__":
    for i, folder in enumerate(folders):
        print(f"{i}) {folder}")
    folder_to_push = input("Please Select a Folder to Push: ")
    robot_to_push = input("Type in robots ip (type all for all): ")
    print(main(folder_to_push, robot_to_push))
