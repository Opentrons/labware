import concurrent
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional

import docker  # type: ignore
from automation.data.protocol import Protocol
from rich.console import Console
from rich.traceback import install

install(show_locals=True)
IMAGE: str = "opentrons-analysis"
CONTAINER_LABWARE: str = "/var/lib/ot"
HOST_LABWARE: Path = Path(Path(__file__).parent.parent, "files", "labware")
HOST_PROTOCOLS_ROOT: Path = Path(Path(__file__).parent.parent, "files", "protocols")
CONTAINER_PROTOCOLS_ROOT: str = "/var/lib/ot/protocols"
CONTAINER_RESULTS: str = "/var/lib/ot/analysis_results"
HOST_RESULTS: Path = Path(Path(__file__).parent.parent, "analysis_results")
ANALYSIS_SUFFIX: str = "analysis.json"
ANALYSIS_TIMEOUT_SECONDS: int = 30
MAX_ANALYSIS_CONTAINER_INSTANCES: int = 5

console = Console()


def is_running_in_github_actions() -> bool:
    return os.getenv("GITHUB_ACTIONS") == "true"


class ProtocolType(Enum):
    PROTOCOL_DESIGNER = auto()
    PYTHON = auto()


@dataclass
class TargetProtocol:
    host_protocol_file: Path
    container_protocol_file: Path
    host_analysis_file: Path
    container_analysis_file: Path
    tag: str
    custom_labware_paths: List[str]
    analysis_execution_time: Optional[float] = None
    command_exit_code: Optional[int] = None
    command_output: Optional[str] = None
    analysis: Optional[Dict[str, Any]] = None

    @property
    def analysis_file_exists(self) -> bool:
        return self.host_analysis_file.exists()

    def create_failed_analysis(self) -> Dict[str, Any]:
        created_at = datetime.now(timezone.utc).isoformat()

        return {
            "createdAt": created_at,
            "errors": [
                {
                    "analysis_execution_time": self.analysis_execution_time,
                    "command_output": self.command_output,
                    "command_exit_code": self.command_exit_code,
                },
            ],
            "files": [],
            "metadata": [],
            "commands": [],
            "labware": [],
            "pipettes": [],
            "modules": [],
            "liquids": [],
            "config": {},
            "runTimeParameters": [],
        }

    def write_failed_analysis(self) -> None:
        analysis = self.create_failed_analysis()
        with open(self.host_analysis_file, "w") as file:
            json.dump(analysis, file, indent=4)

    def set_analysis(self) -> None:
        if self.analysis_file_exists:
            with open(self.host_analysis_file, "r") as file:
                self.analysis = json.load(file)
        else:
            self.write_failed_analysis()

    @property
    def protocol_file_name(self) -> str:
        return self.host_protocol_file.name

    @property
    def protocol_type(self) -> str:
        return (ProtocolType.PYTHON if self.host_protocol_file.suffix == ".py" else ProtocolType.PROTOCOL_DESIGNER).name.title()

    def set_analysis_execution_time(self, analysis_execution_time: float) -> None:
        self.analysis_execution_time = analysis_execution_time


def start_containers(image_name: str, num_containers: int, timeout: int = 60) -> List[docker.models.containers.Container]:
    client = docker.from_env()
    volumes = {
        str(HOST_LABWARE): {"bind": CONTAINER_LABWARE, "mode": "rw"},
        str(HOST_RESULTS): {"bind": CONTAINER_RESULTS, "mode": "rw"},
        str(HOST_PROTOCOLS_ROOT): {"bind": CONTAINER_PROTOCOLS_ROOT, "mode": "rw"},
    }

    # Stop and remove existing containers
    containers: List[docker.models.containers.Container] = client.containers.list(filters={"ancestor": image_name})
    if containers:
        console.print("Stopping and removing existing container(s)...")
        for container in containers:
            container.stop(timeout=10)
            container.remove()

    # Start new containers
    console.print(f"Starting {num_containers} new container(s).")
    containers = []
    for _ in range(num_containers):
        container = client.containers.run(image_name, detach=True, volumes=volumes)
        containers.append(container)

    # Wait for containers to be ready
    start_time = time.time()
    while time.time() - start_time < timeout:
        all_ready = True
        for container in containers:
            exit_code, _ = container.exec_run(f"ls -al {CONTAINER_LABWARE}")
            if exit_code != 0:
                all_ready = False
                break
        if all_ready:
            console.print("All containers are ready.")
            break
        else:
            console.print("Waiting for containers to be ready...")
            time.sleep(5)
    else:
        console.print("Timeout waiting for containers to be ready. Proceeding anyway.")
    return containers


def stop_and_remove_containers(image_name: str) -> None:
    client = docker.from_env()
    containers = client.containers.list(all=True, filters={"ancestor": image_name})
    for container in containers:
        try:
            if container.status == "running":
                console.print(f"Stopping container {container.short_id}...")
                container.stop(timeout=10)
            console.print(f"Removing container {container.short_id}...")
            container.remove()
        except Exception as e:
            console.print(f"Error stopping/removing container {container.short_id}: {e}")


def host_analysis_path(protocol_file: Path, tag: str) -> Path:
    return Path(HOST_RESULTS, f"{protocol_file.stem}_{tag}_{ANALYSIS_SUFFIX}")


def container_analysis_path(protocol_file: Path, tag: str) -> Path:
    return Path(CONTAINER_RESULTS, f"{protocol_file.stem}_{tag}_{ANALYSIS_SUFFIX}")


def protocol_custom_labware_paths_in_container(protocol: Protocol) -> List[str]:
    if not HOST_LABWARE.is_dir() or protocol.custom_labware is None:
        return []

    return [
        str(os.path.join(CONTAINER_LABWARE, f"{file}.json"))
        for file in protocol.custom_labware
        if f"{file}.json" in os.listdir(HOST_LABWARE)
    ]


def analyze(protocol: TargetProtocol, container: docker.models.containers.Container) -> bool:
    command = (
        f"python -I -m opentrons.cli analyze --json-output {protocol.container_analysis_file} "
        f"{protocol.container_protocol_file} {' '.join(protocol.custom_labware_paths)}"
    )
    start_time = time.time()
    result = None
    exit_code = None
    console.print(f"Beginning analysis of {protocol.host_protocol_file.name}")
    try:
        command_result = container.exec_run(cmd=command)
        exit_code = command_result.exit_code
        result = command_result.output
        protocol.command_output = result.decode("utf-8") if result else ""
        protocol.command_exit_code = exit_code
        protocol.set_analysis()
        return True
    except Exception as e:
        console.print(f"An unexpected error occurred: {e}")
        protocol.command_output = result.decode("utf-8") if result else str(e)
        protocol.command_exit_code = exit_code if exit_code is not None else -1
        protocol.set_analysis()
        return False
    finally:
        protocol.set_analysis_execution_time(time.time() - start_time)
        console.print(f"Analysis of {protocol.host_protocol_file.name} completed in {protocol.analysis_execution_time:.2f} seconds.")


def analyze_many(protocol_files: List[TargetProtocol], containers: List[docker.models.containers.Container]) -> None:
    num_containers = len(containers)
    with ThreadPoolExecutor(max_workers=num_containers) as executor:
        futures = []
        for i, protocol in enumerate(protocol_files):
            container = containers[i % num_containers]
            future = executor.submit(analyze, protocol, container)
            futures.append((future, protocol))
        for future, protocol in futures:
            try:
                future.result(timeout=ANALYSIS_TIMEOUT_SECONDS)
            except concurrent.futures.TimeoutError:
                console.print(f"Analysis of {protocol.host_protocol_file} exceeded {ANALYSIS_TIMEOUT_SECONDS} seconds and was aborted.")
                # Handle timeout (e.g., mark as failed)
            except Exception as e:
                console.print(f"An error occurred during analysis: {e}")

    accumulated_time = sum(protocol.analysis_execution_time for protocol in protocol_files if protocol.analysis_execution_time is not None)
    console.print(f"{len(protocol_files)} protocols with total analysis time of {accumulated_time:.2f} seconds.\n")


def analyze_against_image(tag: str, protocols: List[TargetProtocol], num_containers: int = 1) -> List[TargetProtocol]:
    image_name = f"{IMAGE}:{tag}"
    try:
        console.print(f"\nAnalyzing {len(protocols)} protocol(s) against {image_name} using {num_containers} container(s)...")
        containers = start_containers(image_name, num_containers)
        analyze_many(protocols, containers)
    finally:
        if is_running_in_github_actions():
            pass  # We don't need to stop and remove containers in CI
        else:
            stop_and_remove_containers(image_name)
    return protocols


def get_container_instances(protocol_len: int) -> int:
    # Scaling linearly with the number of protocols
    instances = max(1, min(MAX_ANALYSIS_CONTAINER_INSTANCES, protocol_len // 10))
    return instances


def generate_analyses_from_test(tag: str, protocols: List[Protocol]) -> None:
    """Generate analyses from the tests."""
    start_time = time.time()
    protocols_to_process: List[TargetProtocol] = []
    for test_protocol in protocols:
        host_protocol_file = Path(test_protocol.file_path)
        container_protocol_file = Path(CONTAINER_PROTOCOLS_ROOT, host_protocol_file.relative_to(HOST_PROTOCOLS_ROOT))
        host_analysis_file = host_analysis_path(host_protocol_file, tag)
        container_analysis_file = container_analysis_path(host_protocol_file, tag)
        protocols_to_process.append(
            TargetProtocol(
                host_protocol_file,
                container_protocol_file,
                host_analysis_file,
                container_analysis_file,
                tag,
                protocol_custom_labware_paths_in_container(test_protocol),
            )
        )
    instance_count = get_container_instances(len(protocols_to_process))
    analyze_against_image(tag, protocols_to_process, instance_count)
    end_time = time.time()
    console.print(f"Clock time to generate analyses: {end_time - start_time:.2f} seconds.")
