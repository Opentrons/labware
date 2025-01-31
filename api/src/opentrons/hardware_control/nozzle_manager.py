from typing import Dict, List, Optional, Any, Sequence, Iterator, Tuple, cast
from dataclasses import dataclass
from collections import OrderedDict
from itertools import chain

from opentrons.hardware_control.types import CriticalPoint
from opentrons.types import (
    Point,
    NozzleConfigurationType,
)
from opentrons_shared_data.pipette.pipette_definition import (
    PipetteGeometryDefinition,
    PipetteRowDefinition,
    ValidNozzleMaps,
)
from opentrons_shared_data.errors import ErrorCodes, GeneralError, PythonException

MAXIMUM_NOZZLE_COUNT = 24


def _nozzle_names_by_row(rows: List[PipetteRowDefinition]) -> Iterator[str]:
    for row in rows:
        for nozzle in row.ordered_nozzles:
            yield nozzle


def _row_or_col_index_for_nozzle(
    row_or_col: "OrderedDict[str, List[str]]", nozzle: str
) -> int:
    for index, row_or_col_contents in enumerate(row_or_col.values()):
        if nozzle in row_or_col_contents:
            return index
    raise KeyError(nozzle)


def _row_col_indices_for_nozzle(
    rows: "OrderedDict[str, List[str]]",
    cols: "OrderedDict[str, List[str]]",
    nozzle: str,
) -> Tuple[int, int]:
    return _row_or_col_index_for_nozzle(rows, nozzle), _row_or_col_index_for_nozzle(
        cols, nozzle
    )


@dataclass
class NozzleMap:
    """
    A NozzleMap instance represents a specific configuration of active nozzles on a pipette.

    It exposes properties of the configuration like the configuration's front-right, front-left,
    back-left and starting nozzles as well as a map of all the nozzles active in the configuration.

    Because NozzleMaps represent configurations directly, the properties of the NozzleMap may not
    match the properties of the physical pipette. For instance, a NozzleMap for a single channel
    configuration of an 8-channel pipette - say, A1 only - will have its front left, front right,
    and active channels all be A1, while the physical configuration would have the front right
    channel be H1.
    """

    starting_nozzle: str
    #: The nozzle that automated operations that count nozzles should start at
    # these are really ordered dicts but you can't say that even in quotes because pydantic needs to
    # evaluate them to generate serdes code so please only use ordered dicts here
    map_store: Dict[str, Point]
    #: A map of all of the nozzles active in this configuration
    valid_map_key: str
    #: A key indicating which valid nozzle map from the pipette definition represents this configuration
    rows: Dict[str, List[str]]
    #: A map of all the rows active in this configuration
    columns: Dict[str, List[str]]
    #: A map of all the columns active in this configuration
    configuration: NozzleConfigurationType
    #: The kind of configuration this is

    full_instrument_map_store: Dict[str, Point]
    #: A map of all of the nozzles of an instrument
    full_instrument_rows: Dict[str, List[str]]
    #: A map of all the rows of an instrument

    @classmethod
    def determine_nozzle_configuration(
        cls,
        physical_rows: "OrderedDict[str, List[str]]",
        current_rows: "OrderedDict[str, List[str]]",
        physical_cols: "OrderedDict[str, List[str]]",
        current_cols: "OrderedDict[str, List[str]]",
    ) -> "NozzleConfigurationType":
        """
        Determine the nozzle configuration based on the starting and
        ending nozzle.
        """
        if physical_rows == current_rows and physical_cols == current_cols:
            return NozzleConfigurationType.FULL
        if len(current_rows) == 1 and len(current_cols) == 1:
            return NozzleConfigurationType.SINGLE
        if len(current_rows) == 1:
            return NozzleConfigurationType.ROW
        if len(current_cols) == 1:
            return NozzleConfigurationType.COLUMN
        return NozzleConfigurationType.SUBRECT

    def __str__(self) -> str:
        return f"back_left_nozzle: {self.back_left} front_right_nozzle: {self.front_right} configuration: {self.configuration}"

    @property
    def back_left(self) -> str:
        """The backest, leftest (i.e. back if it's a column, left if it's a row) nozzle of the configuration.

        Note: This is the value relevant for this particular configuration, and it may not represent the back left nozzle
        of the underlying physical pipette. For instance, the back-left nozzle of a configuration representing nozzles
        D7 to H12 of a 96-channel pipette is D7, which is not the back-left nozzle of the physical pipette (A1).
        """
        return next(iter(self.rows.values()))[0]

    @property
    def front_right(self) -> str:
        """The frontest, rightest (i.e. front if it's a column, right if it's a row) nozzle of the configuration.

        Note: This is the value relevant for this configuration, not the physical pipette. See the note on back_left.
        """
        return next(reversed(list(self.rows.values())))[-1]

    @property
    def full_instrument_back_left(self) -> str:
        """The backest, leftest (i.e. back if it's a column, left if it's a row) nozzle of the full instrument.

        Note: This value represents the back left nozzle of the underlying physical pipette. For instance,
        the back-left nozzle of a 96-Channel pipette is A1.
        """
        return next(iter(self.full_instrument_rows.values()))[0]

    @property
    def full_instrument_front_right(self) -> str:
        """The frontest, rightest (i.e. front if it's a column, right if it's a row) nozzle of the full instrument.

        Note: This value represents the front right nozzle of the physical pipette. See the note on full_instrument_back_left.
        """
        return next(reversed(list(self.full_instrument_rows.values())))[-1]

    @property
    def starting_nozzle_offset(self) -> Point:
        """The position of the starting nozzle."""
        return self.map_store[self.starting_nozzle]

    @property
    def xy_center_offset(self) -> Point:
        """The position of the geometrical center of all nozzles in the configuration.

        Note: This is the value relevant for this configuration, not the physical pipette. See the note on back_left.
        """
        difference = self.map_store[self.front_right] - self.map_store[self.back_left]
        return self.map_store[self.back_left] + Point(
            difference[0] / 2, difference[1] / 2, 0
        )

    @property
    def instrument_xy_center_offset(self) -> Point:
        """The position of the geometrical center of all nozzles for the entire instrument.

        Note: This the value reflects the center of the maximum number of nozzles of the physical pipette.
        This would be the same as a full configuration.
        """
        difference = (
            self.full_instrument_map_store[self.full_instrument_front_right]
            - self.full_instrument_map_store[self.full_instrument_back_left]
        )
        return self.full_instrument_map_store[self.full_instrument_back_left] + Point(
            difference[0] / 2, difference[1] / 2, 0
        )

    @property
    def y_center_offset(self) -> Point:
        """The position in the center of the primary column of the map."""
        front_left = next(reversed(list(self.rows.values())))[0]
        difference = self.map_store[front_left] - self.map_store[self.back_left]
        return self.map_store[self.back_left] + Point(0, difference[1] / 2, 0)

    @property
    def front_nozzle_offset(self) -> Point:
        """The offset for the front_left nozzle."""
        # front left-most nozzle of the 96 channel in a given configuration
        # and front nozzle of the 8 channel
        front_left = next(iter(self.columns.values()))[-1]
        return self.map_store[front_left]

    @property
    def front_right_nozzle_offset(self) -> Point:
        """The offset for the front_right nozzle."""
        # Front-right-most nozzle of the 96 channel in a given configuration
        # and Front-most nozzle of the 8-channel
        return self.map_store[self.front_right]

    @property
    def back_left_nozzle_offset(self) -> Point:
        """The offset for the back_left nozzle."""
        # Back-left-most nozzle of the 96-channel in a given configuration
        # and back-most nozzle of the 8-channel
        return self.map_store[self.back_left]

    @property
    def tip_count(self) -> int:
        """The total number of active nozzles in the configuration, and thus the number of tips that will be picked up."""
        return len(self.map_store)

    @property
    def physical_nozzle_count(self) -> int:
        """The number of physical nozzles, regardless of configuration."""
        return len(self.full_instrument_map_store)

    @property
    def active_nozzles(self) -> list[str]:
        """An unstructured list of all nozzles active in the configuration."""
        return list(self.map_store.keys())

    @classmethod
    def build(  # noqa: C901
        cls,
        physical_nozzles: "OrderedDict[str, Point]",
        physical_rows: "OrderedDict[str, List[str]]",
        physical_columns: "OrderedDict[str, List[str]]",
        starting_nozzle: str,
        back_left_nozzle: str,
        front_right_nozzle: str,
        valid_nozzle_maps: ValidNozzleMaps,
    ) -> "NozzleMap":
        try:
            back_left_row_index, back_left_column_index = _row_col_indices_for_nozzle(
                physical_rows, physical_columns, back_left_nozzle
            )
        except KeyError as e:
            raise IncompatibleNozzleConfiguration(
                message=f"No entry for back left nozzle {e} in pipette",
                wrapping=[PythonException(e)],
            ) from e
        try:
            (
                front_right_row_index,
                front_right_column_index,
            ) = _row_col_indices_for_nozzle(
                physical_rows, physical_columns, front_right_nozzle
            )
        except KeyError as e:
            raise IncompatibleNozzleConfiguration(
                message=f"No entry for front right nozzle {e} in pipette",
                wrapping=[PythonException(e)],
            ) from e

        correct_rows_with_all_columns = list(physical_rows.items())[
            back_left_row_index : front_right_row_index + 1
        ]
        correct_rows = [
            (
                row_name,
                row_entries[back_left_column_index : front_right_column_index + 1],
            )
            for row_name, row_entries in correct_rows_with_all_columns
        ]
        rows = OrderedDict(correct_rows)
        correct_columns_with_all_rows = list(physical_columns.items())[
            back_left_column_index : front_right_column_index + 1
        ]
        correct_columns = [
            (col_name, col_entries[back_left_row_index : front_right_row_index + 1])
            for col_name, col_entries in correct_columns_with_all_rows
        ]
        columns = OrderedDict(correct_columns)

        map_store = OrderedDict(
            (nozzle, physical_nozzles[nozzle]) for nozzle in chain(*rows.values())
        )

        if (
            cls.determine_nozzle_configuration(
                physical_rows, rows, physical_columns, columns
            )
            != NozzleConfigurationType.FULL
        ):
            if len(rows) * len(columns) > MAXIMUM_NOZZLE_COUNT:
                raise IncompatibleNozzleConfiguration(
                    f"Partial Nozzle Layouts may not be configured to contain more than {MAXIMUM_NOZZLE_COUNT} channels."
                )

        validated_map_key = None
        for map_key in valid_nozzle_maps.maps.keys():
            if valid_nozzle_maps.maps[map_key] == list(map_store.keys()):
                validated_map_key = map_key
                break

        if validated_map_key is None:
            raise IncompatibleNozzleConfiguration(
                "Attempted Nozzle Configuration does not match any approved map layout for the current pipette."
            )

        return cls(
            starting_nozzle=starting_nozzle,
            map_store=map_store,
            valid_map_key=validated_map_key,
            rows=rows,
            full_instrument_map_store=physical_nozzles,
            full_instrument_rows=physical_rows,
            columns=columns,
            configuration=cls.determine_nozzle_configuration(
                physical_rows, rows, physical_columns, columns
            ),
        )


class IncompatibleNozzleConfiguration(GeneralError):
    """Error raised if nozzle configuration is incompatible with the currently loaded pipette."""

    def __init__(
        self,
        message: Optional[str] = None,
        detail: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[GeneralError]] = None,
    ) -> None:
        """Build a IncompatibleNozzleConfiguration error."""
        super().__init__(
            code=ErrorCodes.API_MISCONFIGURATION,
            message=message,
            detail=detail,
            wrapping=wrapping,
        )


class NozzleConfigurationManager:
    def __init__(
        self, nozzle_map: NozzleMap, valid_nozzle_maps: ValidNozzleMaps
    ) -> None:
        self._physical_nozzle_map = nozzle_map
        self._current_nozzle_configuration = nozzle_map
        self._valid_nozzle_maps = valid_nozzle_maps

    @classmethod
    def build_from_config(
        cls,
        pipette_geometry: PipetteGeometryDefinition,
        valid_nozzle_maps: ValidNozzleMaps,
    ) -> "NozzleConfigurationManager":
        sorted_nozzle_map = OrderedDict(
            (
                (k, Point(*pipette_geometry.nozzle_map[k]))
                for k in _nozzle_names_by_row(pipette_geometry.ordered_rows)
            )
        )
        sorted_rows = OrderedDict(
            (entry.key, entry.ordered_nozzles)
            for entry in pipette_geometry.ordered_rows
        )
        sorted_cols = OrderedDict(
            (entry.key, entry.ordered_nozzles)
            for entry in pipette_geometry.ordered_columns
        )
        back_left = next(iter(sorted_rows.values()))[0]
        front_right = next(reversed(list(sorted_rows.values())))[-1]
        starting_nozzle_config = NozzleMap.build(
            physical_nozzles=sorted_nozzle_map,
            physical_rows=sorted_rows,
            physical_columns=sorted_cols,
            starting_nozzle=back_left,
            back_left_nozzle=back_left,
            front_right_nozzle=front_right,
            valid_nozzle_maps=valid_nozzle_maps,
        )
        return cls(starting_nozzle_config, valid_nozzle_maps)

    @property
    def starting_nozzle_offset(self) -> Point:
        return self._current_nozzle_configuration.starting_nozzle_offset

    @property
    def current_configuration(self) -> NozzleMap:
        return self._current_nozzle_configuration

    def reset_to_default_configuration(self) -> None:
        self._current_nozzle_configuration = self._physical_nozzle_map

    def update_nozzle_configuration(
        self,
        back_left_nozzle: str,
        front_right_nozzle: str,
        starting_nozzle: Optional[str] = None,
    ) -> None:
        self._current_nozzle_configuration = NozzleMap.build(
            # these casts are because of pydantic in the protocol engine (see above)
            physical_nozzles=cast(
                "OrderedDict[str, Point]", self._physical_nozzle_map.map_store
            ),
            physical_rows=cast(
                "OrderedDict[str, List[str]]", self._physical_nozzle_map.rows
            ),
            physical_columns=cast(
                "OrderedDict[str, List[str]]", self._physical_nozzle_map.columns
            ),
            starting_nozzle=starting_nozzle or back_left_nozzle,
            back_left_nozzle=back_left_nozzle,
            front_right_nozzle=front_right_nozzle,
            valid_nozzle_maps=self._valid_nozzle_maps,
        )

    def get_tip_count(self) -> int:
        return self._current_nozzle_configuration.tip_count

    def critical_point_with_tip_length(
        self,
        cp_override: Optional[CriticalPoint],
        tip_length: float = 0.0,
    ) -> Point:
        if cp_override == CriticalPoint.INSTRUMENT_XY_CENTER:
            current_nozzle = (
                self._current_nozzle_configuration.instrument_xy_center_offset
            )
        elif cp_override == CriticalPoint.XY_CENTER:
            current_nozzle = self._current_nozzle_configuration.xy_center_offset
        elif cp_override == CriticalPoint.Y_CENTER:
            current_nozzle = self._current_nozzle_configuration.y_center_offset
        elif cp_override == CriticalPoint.FRONT_NOZZLE:
            current_nozzle = self._current_nozzle_configuration.front_nozzle_offset
        else:
            current_nozzle = self.starting_nozzle_offset
        return current_nozzle - Point(0, 0, tip_length)
