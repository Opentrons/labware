""" opentrons.calibration_storage.helpers: various miscellaneous
functions

This module has functions that you can import to save robot or
labware calibration to its designated file location.
"""
import json
from typing import Any, Union, List, Dict, TYPE_CHECKING, cast, Tuple
from dataclasses import is_dataclass, asdict


from hashlib import sha256

from . import types as local_types

if TYPE_CHECKING:
    from opentrons_shared_data.labware.types import LabwareDefinition
    from opentrons_shared_data.pipette.types import LabwareUri


def dict_filter_none(data: List[Tuple[str, Any]]) -> Dict[str, Any]:
    """
    Helper function to filter out None keys from a dataclass
    before saving to file.
    """
    return dict(item for item in data if item[1] is not None)


def convert_to_dict(obj: Any) -> Dict[str, Any]:
    # The correct way to type this is described here:
    # https://github.com/python/mypy/issues/6568
    # Unfortunately, since it's not currently supported I have an
    # assert check instead.
    assert is_dataclass(obj) and not isinstance(
        obj, type
    ), "This function is intended for dataclasses only"
    return asdict(obj, dict_factory=dict_filter_none)


# TODO(mc, 2021-11-09): this hashing function may produce different hashes
# for semantically identical labware defs. For example, a value of `10` will
# produce a different hash than a value of `10.0`. Hashing should be produce
# identical hashes for `==` values. This could be done by running defs through
# Pydantic or similar rather via json.dumps
def hash_labware_def(labware_def: "LabwareDefinition") -> str:
    """
    Helper function to take in a labware definition and return
    a hashed string of key elements from the labware definition
    to make it a unique identifier.

    :param labware_def: Full labware definition
    :returns: sha256 string
    """
    # remove keys that do not affect run
    blocklist = ["metadata", "brand", "groups"]
    def_no_metadata = {k: v for k, v in labware_def.items() if k not in blocklist}
    sorted_def_str = json.dumps(def_no_metadata, sort_keys=True, separators=(",", ":"))

    return sha256(sorted_def_str.encode("utf-8")).hexdigest()


def details_from_uri(uri: str, delimiter: str = "/") -> local_types.UriDetails:
    """
    Unpack a labware URI to get the namespace, loadname and version
    """
    try:
        info = uri.split(delimiter)
        return local_types.UriDetails(
            namespace=info[0], load_name=info[1], version=int(info[2])
        )
    except IndexError:
        # Here we are assuming that the 'uri' passed in is actually
        # the loadname, though sometimes it may be an empty string.
        return local_types.UriDetails(namespace="", load_name=uri, version=1)


def uri_from_details(
    namespace: str, load_name: str, version: Union[str, int], delimiter: str = "/"
) -> "LabwareUri":
    """Build a labware URI from its details.

    A labware URI is a string that uniquely specifies a labware definition.

    :returns str: The URI.
    """
    return cast("LabwareUri", f"{namespace}{delimiter}{load_name}{delimiter}{version}")


def uri_from_definition(
    definition: "LabwareDefinition", delimiter: str = "/"
) -> "LabwareUri":
    """Build a labware URI from its definition.

    A labware URI is a string that uniquely specifies a labware definition.

    :returns str: The URI.
    """
    return uri_from_details(
        namespace=definition["namespace"],
        load_name=definition["parameters"]["loadName"],
        version=definition["version"],
        delimiter=delimiter,
    )
