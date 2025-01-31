"""Main FastAPI application."""
import contextlib
from typing import AsyncGenerator, Optional
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from opentrons import __version__

from .errors.exception_handlers import exception_handlers
from .hardware import (
    FrontButtonLightBlinker,
    start_initializing_hardware,
    clean_up_hardware,
)
from .persistence.fastapi_dependencies import (
    start_initializing_persistence,
    clean_up_persistence,
)
from .router import router
from .service.logging import initialize_logging
from .service.task_runner import set_up_task_runner
from .settings import RobotServerSettings, get_settings
from .runs.dependencies import (
    start_light_control_task,
    mark_light_control_startup_finished,
)

from .service.notifications import (
    set_up_notification_client,
    initialize_pe_publisher_notifier,
)


@contextlib.asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """The server's startup and shutdown logic.

    Entering this context manager sets up our custom global objects
    so they'll be ready when we process requests.

    Exiting this context manager cleans everything up.
    """
    async with contextlib.AsyncExitStack() as exit_stack:
        settings = get_settings()
        persistence_directory = _get_persistence_directory(settings)

        initialize_logging()

        await exit_stack.enter_async_context(set_up_task_runner(app.state))

        blinker = FrontButtonLightBlinker()
        exit_stack.push_async_callback(blinker.clean_up)

        start_initializing_hardware(
            app_state=app.state,
            callbacks=[
                # Flex light control:
                (start_light_control_task, True),
                (mark_light_control_startup_finished, False),
                # OT-2 light control:
                (lambda _app_state, hw_api: blinker.start_blinking(hw_api), True),
                (
                    lambda _app_state, _hw_api: blinker.mark_hardware_init_complete(),
                    False,
                ),
            ],
        )
        exit_stack.push_async_callback(clean_up_hardware, app.state)

        start_initializing_persistence(
            app_state=app.state,
            persistence_directory_root=persistence_directory,
            done_callbacks=[
                # For OT-2 light control only. The Flex status bar isn't handled here
                # because it's currently tied to hardware and run status, not to
                # initialization of the persistence layer.
                blinker.mark_persistence_init_complete
            ],
        )
        exit_stack.push_async_callback(clean_up_persistence, app.state)

        exit_stack.enter_context(set_up_notification_client(app.state))
        initialize_pe_publisher_notifier(app.state)

        yield  # Start handling HTTP requests.


app = FastAPI(
    title="Opentrons HTTP API Spec",
    description=(
        "This OpenAPI spec describes the HTTP API for Opentrons "
        "robots. It may be retrieved from a robot on port 31950 at "
        "/openapi. Some schemas used in requests and responses use "
        "the `x-patternProperties` key to mean the JSON Schema "
        "`patternProperties` behavior."
    ),
    version=__version__,
    exception_handlers=exception_handlers,
    # Disable documentation hosting via Swagger UI, normally at /docs.
    # We instead focus on the docs hosted by ReDoc, at /redoc.
    docs_url=None,
    lifespan=_lifespan,
)

# cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=("*"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# main router
router.install_on_app(app)


def _get_persistence_directory(settings: RobotServerSettings) -> Optional[Path]:
    if settings.persistence_directory == "automatically_make_temporary":
        return None
    else:
        return settings.persistence_directory
