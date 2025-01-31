"""Implements fluid stack tracking for pipettes.

Inside a pipette's tip, there can be a mix of kinds of fluids - here, "fluid" means "liquid" (i.e. a protocol-relevant
working liquid that is aspirated or dispensed from wells) or "air" (i.e. because there was an air gap). Since sometimes
you want air gaps in different places - physically-below liquid to prevent dripping, physically-above liquid to provide
extra room to push the plunger - we need to support some notion of at least phsyical ordinal position of air and liquid,
and we do so as a logical stack because that's physically relevant.
"""
from logging import getLogger
from numpy import isclose
from ..types import AspiratedFluid, FluidKind

_LOG = getLogger(__name__)


class FluidStack:
    """A FluidStack data structure is a list of AspiratedFluids, with stack-style (last-in-first-out) ordering.

    The front of the list is the physical-top of the liquid stack (logical-bottom of the stack data structure)
    and the back of the list is the physical-bottom of the liquid stack (logical-top of the stack data structure).
    The state is internal and the interaction surface is the methods. This is a mutating API.
    """

    _FluidStack = list[AspiratedFluid]

    _fluid_stack: _FluidStack

    def __init__(self, _fluid_stack: _FluidStack | None = None) -> None:
        """Build a FluidStack.

        The argument is provided for testing and shouldn't be generally used.
        """
        self._fluid_stack = _fluid_stack or []

    def add_fluid(self, new: AspiratedFluid) -> None:
        """Add fluid to a stack.

        If the new fluid is of a different kind than what's on the physical-bottom of the stack, add a new record.
        If the new fluid is of the same kind as what's on the physical-bottom of the stack, add the new volume to
        the same record.
        """
        if len(self._fluid_stack) == 0 or self._fluid_stack[-1].kind != new.kind:
            # this is a new kind of fluid, append the record
            self._fluid_stack.append(new)
        else:
            # this is more of the same kind of fluid, add the volumes
            old_fluid = self._fluid_stack.pop(-1)
            self._fluid_stack.append(
                AspiratedFluid(kind=new.kind, volume=old_fluid.volume + new.volume)
            )

    def _alter_fluid_records(
        self, remove: int, new_last: AspiratedFluid | None
    ) -> None:
        if remove >= len(self._fluid_stack) or len(self._fluid_stack) == 0:
            self._fluid_stack = []
            return
        if remove != 0:
            removed = self._fluid_stack[:-remove]
        else:
            removed = self._fluid_stack
        if new_last:
            removed[-1] = new_last
        self._fluid_stack = removed

    def remove_fluid(self, volume: float) -> None:
        """Remove a specific amount of fluid from the physical-bottom of the stack.

        This will consume records that are wholly included in the provided volume and alter the remaining
        final records (if any) to decrement the amount of volume removed from it.

        This function is designed to be used inside pipette store action handlers, which are generally not
        exception-safe, and therefore swallows and logs errors.
        """
        self._fluid_stack_iterator = reversed(self._fluid_stack)
        removed_elements: list[AspiratedFluid] = []
        while volume > 0:
            try:
                last_stack_element = next(self._fluid_stack_iterator)
            except StopIteration:
                _LOG.error(
                    f"Attempting to remove more fluid than present, {volume}uL left over"
                )
                self._alter_fluid_records(len(removed_elements), None)
                return
            if last_stack_element.volume < volume:
                removed_elements.append(last_stack_element)
                volume -= last_stack_element.volume
            elif isclose(last_stack_element.volume, volume):
                self._alter_fluid_records(len(removed_elements) + 1, None)
                return
            else:
                self._alter_fluid_records(
                    len(removed_elements),
                    AspiratedFluid(
                        kind=last_stack_element.kind,
                        volume=last_stack_element.volume - volume,
                    ),
                )
                return

        _LOG.error(f"Failed to handle removing {volume}uL from {self._fluid_stack}")

    def aspirated_volume(self, kind: FluidKind | None = None) -> float:
        """Measure the total amount of fluid (optionally filtered by kind) in the stack."""
        volume = 0.0
        for el in self._fluid_stack:
            if kind is not None and el.kind != kind:
                continue
            volume += el.volume
        return volume

    def liquid_part_of_dispense_volume(self, volume: float) -> float:
        """Get the amount of liquid in the specified volume starting at the physical-bottom of the stack."""
        liquid_volume = 0.0
        for el in reversed(self._fluid_stack):
            if el.kind == FluidKind.LIQUID:
                liquid_volume += min(volume, el.volume)
            volume -= min(el.volume, volume)
            if isclose(volume, 0.0):
                return liquid_volume
        return liquid_volume

    def __eq__(self, other: object) -> bool:
        """Equality."""
        if isinstance(other, type(self)):
            return other._fluid_stack == self._fluid_stack
        return False

    def __repr__(self) -> str:
        """String representation of a fluid stack."""
        if self._fluid_stack:
            stringified_stack = (
                f'(top) {", ".join([str(item) for item in self._fluid_stack])} (bottom)'
            )
        else:
            stringified_stack = "empty"
        return f"<{self.__class__.__name__}: {stringified_stack}>"
