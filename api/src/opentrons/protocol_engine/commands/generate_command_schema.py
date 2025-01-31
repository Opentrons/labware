"""Generate a JSON schema against which all create commands statically validate."""

import json
import argparse
import sys
from opentrons.protocol_engine.commands.command_unions import CommandCreateAdapter


def generate_command_schema(version: str) -> str:
    """Generate a JSON Schema that all valid create commands can validate against."""
    schema_as_dict = CommandCreateAdapter.json_schema(mode="validation")
    schema_as_dict["$id"] = f"opentronsCommandSchemaV{version}"
    schema_as_dict["$schema"] = "http://json-schema.org/draft-07/schema#"
    return json.dumps(schema_as_dict, indent=2, sort_keys=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="generate_command_schema",
        description="Generate A JSON-schema of all possible Create-Commands accepted by the current Protocol Engine",
    )
    parser.add_argument(
        "version",
        type=str,
        help="The command schema version. This is a single integer (e.g. 7) that will be used to name the generated schema file",
    )
    args = parser.parse_args()
    print(generate_command_schema(args.version))

    sys.exit()

__all__ = ["generate_command_schema"]
