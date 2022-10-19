from typing import Optional


class InvalidModuleLocationError(ValueError):
    """Error raised if a load location for a module is invalid."""

    def __init__(self, invalid_value: Optional[str], module_name: str) -> None:
        """Initialize the error and message with the invalid value."""
        super().__init__(
            f"{invalid_value} is not a valid load location for {module_name}."
        )
        self.invalid_value = invalid_value
        self.module_name = module_name
