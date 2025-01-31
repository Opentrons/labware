import json
import pytest
from pathlib import Path
import typeguard

from opentrons_shared_data import load_shared_data
from opentrons_shared_data.protocol.types import (
    JsonProtocolV3,
    JsonProtocolV4,
    JsonProtocolV5,
)
from . import list_fixtures


@pytest.mark.parametrize("defpath", list_fixtures(3))
def test_v3_types(defpath: Path) -> None:
    defn = json.loads(load_shared_data(defpath))
    typeguard.check_type(defn, JsonProtocolV3)


@pytest.mark.parametrize("defpath", list_fixtures(4))
def test_v4_types(defpath: Path) -> None:
    defn = json.loads(load_shared_data(defpath))
    typeguard.check_type(defn, JsonProtocolV4)


@pytest.mark.parametrize("defpath", list_fixtures(5))
def test_v5_types(defpath: Path) -> None:
    defn = json.loads(load_shared_data(defpath))
    typeguard.check_type(defn, JsonProtocolV5)
