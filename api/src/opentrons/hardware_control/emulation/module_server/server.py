"""Server notifying of module connections."""
import asyncio
import logging
from typing import Dict, Set

from opentrons.hardware_control.emulation.module_server.models import (
    ModuleConnection,
    Message,
)
from opentrons.hardware_control.emulation.proxy import ProxyListener
from opentrons.hardware_control.emulation.settings import ModuleServerSettings
from typing_extensions import Final

log = logging.getLogger(__name__)

MessageDelimiter: Final = b"\n"


class ModuleStatusServer(ProxyListener):
    """The module status server is the emulator equivalent of inotify. A client
    can know when an emulated module connects or disconnects.

    Clients connect and read JSON messages (See models module).
    """

    def __init__(self, settings: ModuleServerSettings) -> None:
        """Constructor

        Args:
            settings: app settings
        """
        self._settings = settings
        self._connections: Dict[str, ModuleConnection] = {}
        self._clients: Set[asyncio.StreamWriter] = set()

    def on_server_connected(
        self, server_type: str, client_uri: str, identifier: str
    ) -> None:
        """Called when a new module has connected.

        Args:
            server_type: the type of module
            client_uri: the url string for a driver to connect to
            identifier: unique id for connection

        Returns: None

        """
        log.info(f"On connected {server_type} {client_uri} {identifier}")
        connection = ModuleConnection(
            module_type=server_type, url=client_uri, identifier=identifier
        )
        self._connections[identifier] = connection
        for c in self._clients:
            c.write(
                Message(status="connected", connections=[connection])
                .model_dump_json()
                .encode()
            )
            c.write(b"\n")

    def on_server_disconnected(self, identifier: str) -> None:
        """Called when a module has disconnected.

        Args:
            identifier: unique id for the connection

        Returns: None
        """
        log.info(f"On disconnected {identifier}")
        try:
            connection = self._connections[identifier]
            del self._connections[identifier]
            for c in self._clients:
                c.write(
                    Message(status="disconnected", connections=[connection])
                    .model_dump_json()
                    .encode()
                )
                c.write(MessageDelimiter)
        except KeyError:
            log.exception("Failed to find identifier")

    async def run(self) -> None:
        """Run the server."""
        server = await asyncio.start_server(
            self._handle_connection, host=self._settings.host, port=self._settings.port
        )
        await server.serve_forever()

    async def _handle_connection(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        """Handle a client connection to the server."""
        log.info("Client connected to module server.")

        # A client connected. Send a dump of all connected modules.
        m = Message(status="dump", connections=list(self._connections.values()))

        writer.write(m.model_dump_json().encode())
        writer.write(MessageDelimiter)

        self._clients.add(writer)

        while True:
            if b"" == await reader.read():
                self._clients.remove(writer)
                break

        log.info("Client disconnected from module server.")
