import jwt
import structlog
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, SecurityScopes

from api.models.user import User
from api.settings import Settings

settings: Settings = Settings()
logger = structlog.stdlib.get_logger(settings.logger_name)


class UnauthenticatedException(HTTPException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail="This request was not authorized correctly.")


class VerifyToken:
    """Does all the token verification using PyJWT"""

    def __init__(self) -> None:
        self.config = Settings()

        # This gets the JWKS from a given URL and does processing so you can
        # use any of the keys available
        jwks_url = f"https://{self.config.auth0_domain}/.well-known/jwks.json"
        self.jwks_client = jwt.PyJWKClient(jwks_url)

    async def verify(
        self, security_scopes: SecurityScopes, credentials: HTTPAuthorizationCredentials = Security(HTTPBearer())  # noqa: B008
    ) -> User:
        if credentials is None:
            raise UnauthenticatedException()

        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(credentials.credentials).key
        except jwt.PyJWKClientError as error:
            logger.error("Client Error", extra={"credentials": credentials}, exc_info=True)
            raise UnauthenticatedException() from error
        except jwt.exceptions.DecodeError as error:
            logger.error("Decode Error", extra={"credentials": credentials}, exc_info=True)
            raise UnauthenticatedException() from error

        try:
            payload = jwt.decode(
                credentials.credentials,
                signing_key,
                algorithms=[self.config.auth0_algorithms],
                audience=self.config.auth0_api_audience,
                issuer=self.config.auth0_issuer,
            )
            user = User(**payload)
            logger.info("User object", extra={"user": user})
            return user
        except jwt.ExpiredSignatureError:
            logger.error("Expired Signature", extra={"credentials": credentials}, exc_info=True)
            # Handle token expiration, e.g., refresh token, re-authenticate, etc.
        except jwt.PyJWTError:
            logger.error("General JWT Error", extra={"credentials": credentials}, exc_info=True)
            # Handle other JWT errors
        raise UnauthenticatedException()
