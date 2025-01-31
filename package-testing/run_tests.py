from dataclasses import dataclass
import os
import platform
import subprocess
import sys
from typing import List, Union


@dataclass
class TestConfig:
    test_key: str
    test_helper: str


@dataclass
class TestHelp(TestConfig):
    expected_output: str


@dataclass
class TestSimulate(TestConfig):
    protocol_path: str
    expected_return_code: str


tests: List[Union[TestHelp, TestSimulate]] = [
    TestHelp(
        test_key="help",
        test_helper="help",
        expected_output="Simulate a protocol for an Opentrons robot"
    ),
    TestSimulate(
        test_key="Flex_v2_19_expect_success",
        test_helper="simulate",
        protocol_path="../analyses-snapshot-testing/files/protocols/Flex_S_v2_19_Illumina_DNA_Prep_48x.py",
        expected_return_code="0",
    ),
    TestSimulate(
        test_key="OT2_v2_20_expect_success",
        test_helper="simulate",
        protocol_path="../analyses-snapshot-testing/files/protocols/OT2_S_v2_20_8_None_SINGLE_HappyPath.py",
        expected_return_code="0",
    ),
    TestSimulate(
        test_key="Flex_v2_16_expect_error",
        test_helper="simulate",
        protocol_path="../analyses-snapshot-testing/files/protocols/Flex_X_v2_16_P1000_96_TM_ModuleAndWasteChuteConflict.py",
        expected_return_code="1",
    ),
    TestSimulate(
        test_key="OT2_v6PD_expect_error",
        test_helper="simulate",
        protocol_path="../analyses-snapshot-testing/files/protocols/OT2_X_v6_P300M_P20S_HS_MM_TM_TC_AllMods.json",
        expected_return_code="1",
    ),
]


def get_os_type() -> str:
    """Determine the current operating system type."""
    return "windows_nt" if "windows" in platform.system().lower() else "unix"


def build_command(test: TestConfig, script_ext: str, venv_dir: str, results_dir: str) -> List[str]:
    """
    Build the command to run a test based on the test type.

    Args:
        test: The test object (either TestHelp or TestSimulate).
        script_ext: The script file extension (e.g., "ps1", "sh").
        venv_dir: The virtual environment directory.
        results_dir: The directory for storing test results.

    Returns:
        A list of strings representing the command to execute.

    Raises:
        ValueError: If the test type is unknown.
    """
    prefix = ["pwsh", "-File"] if get_os_type() == "windows_nt" else []

    # Build command based on test type
    if isinstance(test, TestHelp):
        return prefix + [
            f"./{test.test_helper}.{script_ext}",
            test.test_key,
            test.expected_output,
            venv_dir,
            results_dir,
        ]
    elif isinstance(test, TestSimulate):
        return prefix + [
            f"./{test.test_helper}.{script_ext}",
            test.test_key,
            test.protocol_path,
            test.expected_return_code,
            venv_dir,
            results_dir,
        ]
    else:
        raise ValueError(f"Unknown test type: {type(test)}")


def run_test(test: TestConfig, script_ext: str, venv_dir: str, results_dir: str):
    """
    Run a single test.

    Args:
        test: The test object to run.
        script_ext: The script extension (e.g., "ps1", "sh").
        venv_dir: The virtual environment directory.
        results_dir: The directory to store test results.
    """
    # Ensure results directory exists
    os.makedirs(results_dir, exist_ok=True)

    # Build and execute command
    command = build_command(test, script_ext, venv_dir, results_dir)
    print(f"Running {test.test_key} using {test.test_helper}.{script_ext}...")
    try:
        subprocess.run(command, check=True, shell=False)
        print(f"Test {test.test_key} passed.")
    except subprocess.CalledProcessError as e:
        print(f"Test {test.test_key} failed: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 4:
        print("Usage: python run_tests.py <venv_dir> <results_dir> <tests>")
        sys.exit(1)

    venv_dir, results_dir, tests_arg = sys.argv[1:4]
    os_type = get_os_type()
    script_ext = "ps1" if os_type == "windows_nt" else "sh"

    # Filter tests based on user input
    if tests_arg.lower() == "all":
        selected_tests = tests
    else:
        requested_keys = tests_arg.split(",")
        selected_tests = [test for test in tests if test.test_key in requested_keys]

    if not selected_tests:
        print(f"No matching tests found for the provided test keys: {tests_arg}")
        sys.exit(1)

    # Run selected tests
    for test in selected_tests:
        run_test(test, script_ext, venv_dir, results_dir)


if __name__ == "__main__":
    main()
