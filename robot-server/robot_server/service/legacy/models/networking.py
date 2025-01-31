import typing
from enum import Enum

from pydantic import (
    field_validator,
    model_validator,
    ConfigDict,
    BaseModel,
    Field,
    SecretStr,
)
from opentrons.system import wifi


class ConnectivityStatus(str, Enum):
    full = "full"
    limited = "limited"
    none = "none"
    portal = "portal"
    unknown = "unknown"


class ConnectionType(str, Enum):
    wifi = "wifi"
    ethernet = "ethernet"


class InterfaceStatus(BaseModel):
    """Status for an interface"""

    ipAddress: typing.Optional[str] = Field(
        None,
        description="The interface IP address with CIDR subnet appended "
        "(e.g. 10.0.0.1/24)",
    )
    macAddress: typing.Optional[str] = Field(
        None,
        description="The MAC address of this interface (at least when "
        "connected to this network - it may change due to "
        "NetworkManager's privacy functionality when "
        "disconnected or connected to a different network)",
    )
    gatewayAddress: typing.Optional[str] = Field(
        None, description="The address of the configured gateway"
    )
    state: str = Field(
        ...,
        description="The state of the connection. (i.e. connected, "
        "disconnected, connection failed)",
    )
    type: ConnectionType = Field(..., description="What kind of interface this is")


class NetworkingStatus(BaseModel):
    status: ConnectivityStatus = Field(
        ConnectivityStatus.none, description="Overall connectivity of the robot"
    )
    interfaces: typing.Dict[str, InterfaceStatus] = Field(
        {},
        description="Per-interface networking status. Properties are "
        "named for network interfaces",
    )
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "full",
                "interfaces": {
                    "wlan0": {
                        "ipAddress": "192.168.43.97/24",
                        "macAddress": "B8:27:EB:6C:95:CF",
                        "gatewayAddress": "192.168.43.161",
                        "state": "connected",
                        "type": "wifi",
                    },
                    "eth0": {
                        "ipAddress": "169.254.229.173/16",
                        "macAddress": "B8:27:EB:39:C0:9A",
                        "gatewayAddress": None,
                        "state": "connected",
                        "type": "ethernet",
                    },
                },
            }
        }
    )


class NetworkingSecurityType(str, Enum):
    """Top-level type of network security"""

    wpa_eap = "wpa-eap"
    wpa_psk = "wpa-psk"
    none = "none"
    unsupported = "unsupported"


class WifiNetwork(BaseModel):
    """Identifier of a wifi network"""

    ssid: str = Field(..., description="The network's SSID")


class WifiNetworkFull(WifiNetwork):
    """A visible Network"""

    signal: int = Field(
        ...,
        description="A unitless signal strength; a higher number is a better signal",
    )
    active: bool = Field(..., description="Whether there is a connection active")
    security: str = Field(
        ..., description="The raw NetworkManager output about the Wi-Fi security"
    )
    securityType: NetworkingSecurityType


class WifiNetworks(BaseModel):
    """The list of networks"""

    list: typing.List[WifiNetworkFull]
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "list": [
                    {
                        "ssid": "linksys",
                        "signal": 50,
                        "active": False,
                        "security": "WPA2 802.1X",
                        "securityType": "wpa-eap",
                    }
                ]
            }
        }
    )


class WifiConfiguration(BaseModel):
    ssid: str = Field(
        ...,
        description="The SSID to connect to. If this isn't an SSID that "
        "is being broadcast by a network, you "
        "should also set `hidden` to `true`.",
    )
    hidden: typing.Optional[bool] = Field(
        False,
        description="`true` if the network is hidden (not broadcasting an SSID). "
        "`false` (default if key is not "
        "present) otherwise.",
    )
    securityType: typing.Optional[NetworkingSecurityType] = None

    psk: typing.Optional[SecretStr] = Field(
        None,
        description="If this is a PSK-secured network (`securityType` is "
        '`"wpa-psk"`), the PSK',
    )
    eapConfig: typing.Optional[typing.Dict[str, str]] = Field(
        None,
        description="All options required to configure EAP access to the"
        " Wi-Fi. All options should match one of the cases "
        "described in `/wifi/eap-options`; for instance, "
        "configuring for peap/mschapv2 should have "
        '`"peap/mschapv2"` as the `eapType`; it should have '
        '`"identity"` and `"password"` props, both of which '
        "are identified as mandatory in `/wifi/eap-options`; "
        'and it may also have `"anonymousIdentity"` and '
        '`"caCert"` properties, both of which are identified'
        " as present but not required.",
        json_schema_extra={"required": ["eapType"]},
    )

    @field_validator("eapConfig")
    @classmethod
    def eap_config_validate(cls, v):
        """Custom validator for the eapConfig field"""
        if v is not None:
            if not v.get("eapType"):
                raise ValueError("eapType must be defined")
            try:
                wifi.eap_check_config(v)
            except wifi.ConfigureArgsError as e:
                raise ValueError(str(e))

        return v

    @model_validator(mode="before")
    @classmethod
    def validate_configuration(cls, values):
        """Validate the configuration"""
        security_type = values.get("securityType")
        psk = values.get("psk")
        eapconfig = values.get("eapConfig")
        if not security_type:
            # security type is not specified. Try to to deduce from the
            # remainder of the payload.
            if psk and eapconfig:
                raise ValueError("Cannot deduce security type: psk and eap both passed")
            security_type = NetworkingSecurityType.none
            if psk:
                security_type = NetworkingSecurityType.wpa_psk
            elif eapconfig:
                security_type = NetworkingSecurityType.wpa_eap
            values["securityType"] = security_type
        elif security_type == NetworkingSecurityType.wpa_psk and not psk:
            raise ValueError("If securityType is wpa-psk, psk must be specified")
        elif security_type == NetworkingSecurityType.wpa_eap and not eapconfig:
            raise ValueError("If securityType is wpa-eap, eapConfig must be specified")
        return values

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"ssid": "linksys"},
                {
                    "ssid": "linksys",
                    "securityType": "wpa-psk",
                    "psk": "psksrock",
                },
                {
                    "ssid": "cantseeme",
                    "securityType": "wpa-psk",
                    "psk": "letmein",
                    "hidden": True,
                },
                {
                    "ssid": "Eduroam",
                    "securityType": "wpa-eap",
                    "eapConfig": {
                        "eapType": "peap/mschapv2",
                        "identity": "scientist@biology.org",
                        "password": "leeuwenhoek",
                    },
                },
            ]
        }
    )


class WifiConfigurationResponse(BaseModel):
    """
    The OT-2 successfully connected to the specified network using the
    specified parameters
    """

    message: str = Field(..., description="A human-readable success message")
    ssid: str = Field(..., description="The SSID configured")


class WifiKeyFile(BaseModel):
    """Wifi Key File"""

    uri: str = Field(
        ...,
        description="A URI for the key (mostly for use with DELETE "
        "/wifi/keys/{key_id})",
    )
    id: str = Field(
        ...,
        description="A contents hash of the key used to specify the key "
        "in POST /wifi/configure (and also to determine the"
        " key URI)",
    )
    name: str = Field(..., description="The original filename of the key")


class AddWifiKeyFileResponse(WifiKeyFile):
    """Response to add wifi key file"""

    message: typing.Optional[str] = None


class WifiKeyFiles(BaseModel):
    """The list of key files"""

    wifi_keys: typing.List[WifiKeyFile] = Field(
        [], alias="keys", description="A list of keys in the system"
    )
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "keys": [
                    {
                        "uri": "/wifi/keys/abda234a234",
                        "id": "abda234a234",
                        "name": "client.pem",
                    }
                ]
            }
        }
    )


class EapConfigOptionType(str, Enum):
    string = "string"
    password = "password"
    file = "file"


class EapConfigOption(BaseModel):
    """An object describing the name and format of an EAP config option"""

    name: str = Field(..., description="The name of the config option")
    displayName: str = Field(
        ..., description="A human-readable and nicely formatted name for " "the option"
    )
    required: bool = Field(
        ...,
        description="Whether the option is required for this EAP variant"
        " or optional",
    )
    type: EapConfigOptionType = Field(
        ...,
        description="The type of the value. If string, a non-sensitive "
        "string like a username. If password, a sensitive "
        "string like a passphrase for a keyfile or a "
        "password. If file, upload the file with POST "
        "/wifi/keys and pass the hash.",
    )


class EapVariant(BaseModel):
    """An object describing an EAP variant"""

    name: str = Field(..., description="The identifier for the EAP variant")
    displayName: str = Field(
        ..., description="A human-readable formatted name for the EAP " "variant"
    )
    options: typing.List[EapConfigOption] = Field(
        ...,
        description="A list of objects describing configuration options "
        "for the EAP variant",
    )


class EapOptions(BaseModel):
    """An object describing all supported EAP variants and their parameters"""

    options: typing.List[EapVariant]
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "options": [
                    {
                        "name": "peap/mschapv2",
                        "displayName": "PEAP/MS-CHAP v2",
                        "options": [
                            {
                                "name": "identity",
                                "displayName": "Username",
                                "required": True,
                                "type": "string",
                            },
                            {
                                "name": "anonymousIdentity",
                                "displayName": "Anonymous Identity",
                                "required": False,
                                "type": "string",
                            },
                            {
                                "name": "caCert",
                                "displayName": "CA Certificate File",
                                "required": False,
                                "type": "file",
                            },
                            {
                                "name": "password",
                                "displayName": "password",
                                "required": True,
                                "type": "password",
                            },
                        ],
                    }
                ]
            }
        }
    )
