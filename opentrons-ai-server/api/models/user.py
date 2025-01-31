from typing import List, Optional, Union

from pydantic import BaseModel, Field


class User(BaseModel):
    aud: Union[str, List[str]] = Field(..., description="Audience URL(s)")
    azp: str = Field(..., description="Authorized party ID")
    exp: int = Field(..., description="Expiration timestamp")
    iat: int = Field(..., description="Issued-at timestamp")
    iss: str = Field(..., description="Issuer URL")
    scope: Optional[str] = Field(None, description="Space-separated scopes")
    sub: str = Field(..., description="Subject identifier for the token")

    class Config:
        extra = "allow"  # Allows additional fields not specified in the model
