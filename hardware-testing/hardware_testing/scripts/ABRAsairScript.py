"""ABR Asair Automation Script!"""
import paramiko as pmk
import time
import json
import multiprocessing
from typing import Optional, List, Any


def execute(client: pmk.SSHClient, command: str, args: list) -> Optional[int]:
    """Execute given command on a remote client, returns 1 if command fails."""
    command = command.format(name=args[0], duration=args[1], frequency=args[2])
    print(f"{args[0]} Executing command: {command}")

    try:
        stdin, stdout, stderr = client.exec_command(command, get_pty=True)
        stdout_lines: List[str] = []
        stderr_lines: List[str] = []
        time.sleep(25)

        if stderr.channel.recv_ready():
            stderr_lines = stderr.readlines()
            if stderr_lines != []:
                print(f"{args[0]} ERROR: ", stderr_lines)
                return 1
        if stdout.channel.exit_status_ready():
            if stdout.channel.recv_exit_status() != 0:
                print(f"{args[0]} command failed:", "".join(stderr_lines))
                # Terminate process on failure.
                raise RuntimeError(
                    f"{args[0]} encountered an error and the process will terminate."
                )
        else:
            print(f"{args[0]} command success:", "".join(stdout_lines))
            return 0
    except Exception as e:
        print(f"Error with {args[0]}:", e)
        raise  # Re-raise the exception to propagate it up and terminate the process.
    return None


def connect_ssh(ip: str) -> pmk.SSHClient:
    """Connect to given ip address through SSH."""
    print("Connecting to:", ip)
    client = pmk.SSHClient()
    client.set_missing_host_key_policy(pmk.AutoAddPolicy())
    client.connect(ip, username="root", password=None)
    return client


def run_command_on_ip(
    index: int, robot_ips: List[str], robot_names: List[str], cd: str, cmd: str
) -> None:
    """Execute ssh command and start abr_asair script on the specified robot."""
    curr_ip = robot_ips[index]
    try:
        ssh = connect_ssh(curr_ip)
        status = execute(ssh, cd + cmd, [robot_names[index], "540", "5"])
        if status == 0:
            print(f"Envrironmental sensors for {curr_ip}, are now running")
    except Exception as e:
        print(f"Error running command on {curr_ip}: {e}")


def run() -> List[Any]:
    """Run asair script module."""
    # Load Robot IPs
    cmd = "nohup python3 -m hardware_testing.scripts.abr_asair_sensor {name} {duration} {frequency}"
    cd = "cd /opt/opentrons-robot-server && "
    robot_ips = []
    robot_names = []

    robot = input("Enter IP of robot (type 'all' to run on all robots): ")
    if robot.lower() == "all":
        ip_file = input("Path of IPs.json: ")
        with open(ip_file) as file:
            file_dict = json.load(file)
            robot_dict = file_dict.get("ip_address_list")
            robot_ips = list(robot_dict.keys())
            robot_names = list(robot_dict.values())
    else:
        robot_name = input("What is the name of the robot? ")
        robot_ips.append(robot)
        robot_names.append(robot_name)
    print("Executing Script on Robot(s):")
    # Launch the processes for each robot.
    processes = []
    for index in range(len(robot_ips)):
        process = multiprocessing.Process(
            target=run_command_on_ip, args=(index, robot_ips, robot_names, cd, cmd)
        )
        processes.append(process)
    return processes


if __name__ == "__main__":
    # Wait for all processes to finish.
    processes = run()
    for process in processes:
        process.start()
        time.sleep(20)
    for process in processes:
        process.join()
