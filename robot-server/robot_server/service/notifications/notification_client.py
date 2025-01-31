"""An interface for managing interactions with the notification broker and relevant lifecycle utilities."""
import contextlib
import random
import logging
import paho.mqtt.client as mqtt
from fastapi import Depends
from typing import Annotated, Any, Dict, Generator, Optional
from enum import Enum


from .topics import TopicName
from ..json_api import NotifyRefetchBody, NotifyUnsubscribeBody
from server_utils.fastapi_utils.app_state import (
    AppState,
    AppStateAccessor,
    get_app_state,
)

log: logging.Logger = logging.getLogger(__name__)


class MQTT_QOS(Enum):
    """MQTT Quality of Service.

    Represents the level of delivery
    guarantee for a specific message.
    """

    QOS_0 = 0
    QOS_1 = 1
    QOS_2 = 2


class NotificationClient:
    """Methods for managing interactions with the MQTT broker.

    Args:
        host: Address of the MQTT broker.
        port: Port used to communicate with the broker.
        keepalive: Interval for transmitting a keepalive packet.
        protocol_version: MQTT protocol version.
        default_qos: Default quality of service. QOS 1 is "at least once".
        retain_message: Whether the broker should hold a copy of the message for new clients.
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 1883,
        keepalive: int = 60,
        protocol_version: int = mqtt.MQTTv5,
        default_qos: MQTT_QOS = MQTT_QOS.QOS_1,
        retain_message: bool = False,
    ) -> None:
        """Returns a configured MQTT client."""
        self._host = host
        self._port = port
        self._keepalive = keepalive
        self._default_qos = default_qos.value
        self._retain_message = retain_message
        # MQTT is somewhat particular about the client_id format and will connect erratically
        # if an unexpected string is supplied. This clientId is derived from the paho-mqtt library.
        self._client_id: str = f"robot-server-{random.randint(0, 1000000)}"
        self._client: mqtt.Client = mqtt.Client(
            client_id=self._client_id, protocol=protocol_version
        )
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect

    def connect(self) -> None:
        """Connect the client to the MQTT broker."""
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect

        self._client.connect(
            host=self._host, port=self._port, keepalive=self._keepalive
        )
        self._client.loop_start()

    def disconnect(self) -> None:
        """Disconnect the client from the MQTT broker."""
        self._client.loop_stop()
        self._client.disconnect()

    def publish_advise_refetch(
        self,
        topic: TopicName,
    ) -> None:
        """Publish a refetch message on a specific topic to the MQTT broker.

        Args:
            topic: The topic to publish the message on.
        """
        message = NotifyRefetchBody.model_construct()
        payload = message.model_dump_json()
        self._client.publish(
            topic=topic,
            payload=payload,
            qos=self._default_qos,
            retain=self._retain_message,
        )

    def publish_advise_unsubscribe(
        self,
        topic: TopicName,
    ) -> None:
        """Publish an unsubscribe message on a specific topic to the MQTT broker.

        Args:
            topic: The topic to publish the message on.
        """
        message = NotifyUnsubscribeBody.model_construct()
        payload = message.model_dump_json()
        self._client.publish(
            topic=topic,
            payload=payload,
            qos=self._default_qos,
            retain=self._retain_message,
        )

    def _on_connect(
        self,
        client: mqtt.Client,
        userdata: Any,
        flags: Dict[str, Any],
        rc: int,
        properties: Optional[mqtt.Properties] = None,
    ) -> None:
        """Callback invoked when the client is successfully connected to the MQTT broker.

        Args:
            client: The MQTT client object.
            userdata: User-defined data associated with the client.
            flags: Response flags from the broker.
            rc: Reason code for the connection result.
            properties: Connection properties, if any.
        """
        if rc == 0:
            log.info("Successfully connected to MQTT broker.")
        else:
            log.error(f"Failed to connect to MQTT broker with reason code: {rc}")

    def _on_disconnect(
        self,
        client: mqtt.Client,
        userdata: Any,
        rc: int,
        properties: Optional[mqtt.Properties] = None,
    ) -> None:
        """Callback invoked when the client is disconnected from the MQTT broker.

        Args:
            client: The MQTT client object.
            userdata: User-defined data associated with the client.
            rc: Reason code for the disconnection result.
            properties: Disconnection properties, if any.
        """
        if rc == 0:
            log.info("Successfully disconnected from MQTT broker.")
        else:
            log.error(f"Failed to disconnect from MQTT broker with reason code: {rc}")


_notification_client_accessor: AppStateAccessor[NotificationClient] = AppStateAccessor[
    NotificationClient
]("notification_client")


@contextlib.contextmanager
def set_up_notification_client(app_state: AppState) -> Generator[None, None, None]:
    """Set up the server's singleton `NotificationClient`.

    When this context manager is entered, the `NotificationClient` is initialized
    and placed on `app_state` for later retrieval by endpoints via
    `get_notification_client()`.

    When this context manager is exited, the `NotificationClient` is cleaned up.
    """
    notification_client: NotificationClient = NotificationClient()
    _notification_client_accessor.set_on(app_state, notification_client)

    try:
        notification_client.connect()
    except Exception:
        log.warning(
            "Could not successfully connect to MQTT broker. Is this a dev server?",
            exc_info=True,
        )

    try:
        yield
    finally:
        notification_client.disconnect()


def get_notification_client(
    app_state: Annotated[AppState, Depends(get_app_state)],
) -> NotificationClient:
    """Intended to be used by endpoint functions as a FastAPI dependency."""
    notification_client = _notification_client_accessor.get_from(app_state)
    assert (
        notification_client is not None
    ), "Forgot to initialize notification client as part of server startup?"
    return notification_client
