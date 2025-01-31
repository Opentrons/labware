"""Types and functions for accessing liquid class definitions."""

from .. import load_shared_data
from .liquid_class_definition import LiquidClassSchemaV1


DEFAULT_VERSION = 1


class LiquidClassDefinitionDoesNotExist(Exception):
    """Specified liquid class definition does not exist."""


def load_definition(name: str, version: int = DEFAULT_VERSION) -> LiquidClassSchemaV1:
    """Load the specified liquid class' definition as a LiquidClassSchemaV1 object.

    Note: this is an expensive operation and should be called sparingly.
    """
    try:
        return LiquidClassSchemaV1.model_validate_json(
            load_shared_data(f"liquid-class/definitions/{version}/{name}.json")
        )
    except FileNotFoundError:
        raise LiquidClassDefinitionDoesNotExist(
            f"No definition found for liquid class '{name}'"
        )
