from __future__ import annotations

from typing import List, Optional, Iterator


class CommandBuilder:
    """Class used to build GCODE commands."""

    def __init__(self, terminator: str = "\n") -> None:
        """
        Construct a command builder.

        Args:
            terminator: The command terminator.
        """
        self._terminator = terminator
        self._elements: List[str] = []

    def add_float(
        self, prefix: str, value: float, precision: Optional[int] = None
    ) -> CommandBuilder:
        """
        Add a float value.

        Args:
            prefix: The value prefix.
            value: The float value.
            precision: Rounding precision. If None, there will be no rounding.

        Returns: self
        """
        value = round(value, precision) if precision is not None else value
        return self.add_element(f"{prefix}{value}")

    def add_int(self, prefix: str, value: int) -> CommandBuilder:
        """
        Add an integer value.

        Args:
            prefix: The value prefix
            value: The integer value

        Returns: self
        """
        return self.add_element(f"{prefix}{value}")

    def add_gcode(self, gcode: str) -> CommandBuilder:
        """
        Add a GCODE.

        Args:
            gcode: The gcode

        Returns: self
        """
        return self.add_element(gcode)

    def add_builder(self, builder: CommandBuilder) -> CommandBuilder:
        """
        Add all elements from builder

        Args:
            builder: a command builder

        Returns: self
        """
        self._elements += builder._elements
        return self

    def add_element(self, element: str) -> CommandBuilder:
        """
        Add an element to the command builder

        Args:
            element: an element as a string

        Returns: self
        """
        self._elements.append(element)
        return self

    def build(self) -> str:
        """
        Build command as a string.

        Returns: string
        """
        return " ".join(self._elements + [self._terminator])

    def __str__(self) -> str:
        return self.build()

    def __iter__(self) -> Iterator[str]:
        return iter(self._elements)

    def __bool__(self) -> bool:
        return len(self._elements) != 0

    def __eq__(self, other: object) -> bool:
        if isinstance(other, CommandBuilder):
            return self.build() == other.build()
        return False
