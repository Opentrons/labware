#!/bin/bash

# Function to validate `opentrons_simulate --help`
# Arguments:
#   1. Test Key (required)
#   2. Virtual Environment Directory (optional, default: "venv")
#   3. Result Directory (optional, default: "results")
test_opentrons_simulate_help() {
    local test_key="$1"
    local expected_output="${2}"
    local venv="${3:-"venv"}"
    local result_dir="${4:-"results"}"
    mkdir -p "$result_dir"
    local result_file="$result_dir/$test_key.txt"

    echo "Activating virtual environment $venv..."
    # shellcheck disable=SC1091
    source "$venv/bin/activate"

    echo "Validating opentrons_simulate --help for test: $test_key..."

    local output
    local return_code
    output=$(opentrons_simulate --help 2>&1)
    return_code=$?

    if [ $return_code -ne 0 ]; then
        echo "FAIL: Return code is $return_code, expected 0" | tee "$result_file"
        echo "Output was:" >> "$result_file"
        echo "$output" >> "$result_file"
        mv "$result_file" "${result_file%.txt}_FAIL.txt"
        return 1
    fi

    echo "PASS: Return code is $return_code, expected 0" | tee "$result_file"
    echo "Output was:" >> "$result_file"
    echo "$output" >> "$result_file"

    if echo "$output" | grep -q "$expected_output"; then
        echo "PASS: Output contains expected string" | tee -a "$result_file"
        echo "PASS: Test $test_key completed successfully." | tee -a "$result_file"
        return 0
    fi
    echo "FAIL: Output does not contain expected string" | tee -a "$result_file"
    return 1
}

test_opentrons_simulate_help "$@"