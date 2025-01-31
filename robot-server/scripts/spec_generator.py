#!/usr/bin/env python
"""Generate a static openapi spec from the robot server code.

The spec can then be hosted on the internet for customer reference if they don't have
a machine handy.

"""

from argparse import ArgumentParser, FileType
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
import json
from io import TextIOBase
import os
import sys

from robot_server.app_setup import app
from robot_server.versioning import API_VERSION


def write_api_spec(output: TextIOBase) -> None:
    spec_dict = get_openapi(
        title="Opentrons HTTP API Spec",
        version=str(API_VERSION),
        description=(
            "This OpenAPI spec describes the HTTP API for Opentrons "
            "robots. It may be retrieved from a robot on port 31950 at "
            "/openapi. Some schemas used in requests and responses use "
            "the `x-patternProperties` key to mean the JSON Schema "
            "`patternProperties` behavior."
        ),
        routes=app.routes,
    )
    json.dump(spec_dict, output)


def _run_cmdline() -> int:
    parser = ArgumentParser(
        description="Generate a static openapi spec. Note: robot-server must be importable when you run this."
    )
    parser.add_argument(
        "output",
        metavar="OUTPUT",
        type=FileType("w"),
        help="Where to write the file (will be json)",
    )
    args = parser.parse_args()
    write_api_spec(args.output)
    return 0


if __name__ == "__main__":
    sys.exit(_run_cmdline())
