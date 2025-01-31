#!/bin/bash

# Function to test `opentrons_simulate` with a given protocol file
# Arguments:
#   1. Test Key (required)
#   2. Protocol File Path (required)
#   3. Expected return code (required)
#   4. Virtual Environment Directory (optional)
#   5. Result Directory (optional)
simulate_protocol() {
    local test_key="$1"
    local protocol_file_path="$2"
    local expected_return_code="$3"
    local venv="${4:-"venv"}"
    local result_dir="${5:-"results"}"
    mkdir -p "$result_dir"
    local result_file="$result_dir/$test_key.txt"

    # echo "test_key: $test_key, protocol_file_path: $protocol_file_path, expected_return_code: $expected_return_code, venv: $venv, result_dir:$result_dir"
    # Fail fast if protocol file does not exist
    if [ ! -f "$protocol_file_path" ]; then
        echo "FAIL: Protocol file not found: $protocol_file_path"
        exit 1
    fi
    echo "Activating virtual environment $venv ..."
    # shellcheck disable=SC1091
    source "$venv/bin/activate"

    printf "Running opentrons_simulate for protocol:\n %s\n" "$protocol_file_path"

    output=$(opentrons_simulate "$protocol_file_path" 2>&1)
    return_code=$?

    if [ $return_code -ne "$expected_return_code" ]; then
        echo "FAIL: Return code is $return_code, expected $expected_return_code" | tee "$result_file"
        echo "Output was:" >> "$result_file"
        echo "$output" >> "$result_file"
        mv "$result_file" "${result_file%.txt}_FAIL.txt"
        exit 1
    else
        echo "PASS: Return code is $return_code, expected $expected_return_code" | tee "$result_file"
        echo "Output was:" >> "$result_file"
        echo "$output" >> "$result_file"
        exit 0
    fi
}

simulate_protocol "$@"
