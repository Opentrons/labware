from abc import abstractmethod, ABC
from typing import Optional, Union

from opentrons.types import AxisMapType, Mount, Point
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons.protocol_api._types import PlungerPositionTypes, PipetteActionTypes


class AbstractRobot(ABC):
    @abstractmethod
    def get_pipette_type_from_engine(
        self, mount: Union[Mount, str]
    ) -> Optional[PipetteNameType]:
        ...

    @abstractmethod
    def get_plunger_position_from_volume(
        self, mount: Mount, volume: float, action: PipetteActionTypes, robot_type: str
    ) -> float:
        ...

    @abstractmethod
    def get_plunger_position_from_name(
        self, mount: Mount, position_name: PlungerPositionTypes
    ) -> float:
        ...

    @abstractmethod
    def move_to(self, mount: Mount, destination: Point, speed: Optional[float]) -> None:
        ...

    @abstractmethod
    def move_axes_to(
        self,
        axis_map: AxisMapType,
        critical_point: Optional[AxisMapType],
        speed: Optional[float],
    ) -> None:
        ...

    @abstractmethod
    def move_axes_relative(self, axis_map: AxisMapType, speed: Optional[float]) -> None:
        ...

    @abstractmethod
    def release_grip(self) -> None:
        ...

    @abstractmethod
    def close_gripper(self, force: Optional[float] = None) -> None:
        ...
