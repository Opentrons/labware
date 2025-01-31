"""LoadLiquidClass stores the liquid class settings used for a transfer into the Protocol Engine."""
from __future__ import annotations

from typing import Optional, Type, TYPE_CHECKING, Any

from typing_extensions import Literal
from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors import LiquidClassDoesNotExistError
from ..errors.error_occurrence import ErrorOccurrence
from ..errors.exceptions import LiquidClassRedefinitionError
from ..state.update_types import LiquidClassLoadedUpdate, StateUpdate
from ..types import LiquidClassRecord

if TYPE_CHECKING:
    from ..state.state import StateView
    from ..resources import ModelUtils

LoadLiquidClassCommandType = Literal["loadLiquidClass"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class LoadLiquidClassParams(BaseModel):
    """The liquid class transfer properties to store."""

    liquidClassId: str | SkipJsonSchema[None] = Field(
        None,
        description="Unique identifier for the liquid class to store. "
        "If you do not supply a liquidClassId, we will generate one.",
        json_schema_extra=_remove_default,
    )
    liquidClassRecord: LiquidClassRecord = Field(
        ...,
        description="The liquid class to store.",
    )


class LoadLiquidClassResult(BaseModel):
    """Result from execution of LoadLiquidClass command."""

    liquidClassId: str = Field(
        ...,
        description="The ID for the liquid class that was loaded, either the one you "
        "supplied or the one we generated.",
    )


class LoadLiquidClassImplementation(
    AbstractCommandImpl[LoadLiquidClassParams, SuccessData[LoadLiquidClassResult]]
):
    """Load Liquid Class command implementation."""

    def __init__(
        self, state_view: StateView, model_utils: ModelUtils, **kwargs: object
    ) -> None:
        self._state_view = state_view
        self._model_utils = model_utils

    async def execute(
        self, params: LoadLiquidClassParams
    ) -> SuccessData[LoadLiquidClassResult]:
        """Store the liquid class in the Protocol Engine."""
        liquid_class_id: Optional[str]
        already_loaded = False

        if params.liquidClassId:
            liquid_class_id = params.liquidClassId
            if self._liquid_class_id_already_loaded(
                liquid_class_id, params.liquidClassRecord
            ):
                already_loaded = True
        else:
            liquid_class_id = (
                self._state_view.liquid_classes.get_id_for_liquid_class_record(
                    params.liquidClassRecord
                )  # if liquidClassRecord was already loaded, reuse the existing ID
            )
            if liquid_class_id:
                already_loaded = True
            else:
                liquid_class_id = self._model_utils.generate_id()

        if already_loaded:
            state_update = StateUpdate()  # liquid class already loaded, do nothing
        else:
            state_update = StateUpdate(
                liquid_class_loaded=LiquidClassLoadedUpdate(
                    liquid_class_id=liquid_class_id,
                    liquid_class_record=params.liquidClassRecord,
                )
            )

        return SuccessData(
            public=LoadLiquidClassResult(liquidClassId=liquid_class_id),
            state_update=state_update,
        )

    def _liquid_class_id_already_loaded(
        self, liquid_class_id: str, liquid_class_record: LiquidClassRecord
    ) -> bool:
        """Check if the liquid_class_id has already been loaded.

        If it has, make sure that liquid_class_record matches the previously loaded definition.
        """
        try:
            existing_liquid_class_record = self._state_view.liquid_classes.get(
                liquid_class_id
            )
        except LiquidClassDoesNotExistError:
            return False

        if liquid_class_record != existing_liquid_class_record:
            raise LiquidClassRedefinitionError(
                f"Liquid class {liquid_class_id} conflicts with previously loaded definition."
            )
        return True


class LoadLiquidClass(
    BaseCommand[LoadLiquidClassParams, LoadLiquidClassResult, ErrorOccurrence]
):
    """Load Liquid Class command resource model."""

    commandType: LoadLiquidClassCommandType = "loadLiquidClass"
    params: LoadLiquidClassParams
    result: Optional[LoadLiquidClassResult] = None

    _ImplementationCls: Type[
        LoadLiquidClassImplementation
    ] = LoadLiquidClassImplementation


class LoadLiquidClassCreate(BaseCommandCreate[LoadLiquidClassParams]):
    """Load Liquid Class command creation request."""

    commandType: LoadLiquidClassCommandType = "loadLiquidClass"
    params: LoadLiquidClassParams

    _CommandCls: Type[LoadLiquidClass] = LoadLiquidClass
