from __future__ import annotations
from anyio import to_thread
from typing import (
    Any,
    Dict,
    Generic,
    List,
    Optional,
    TypeVar,
    Sequence,
    ParamSpec,
    Callable,
)
from typing_extensions import get_args, override
from pydantic import Field, BaseModel
from fastapi.responses import JSONResponse
from fastapi.dependencies.utils import get_typed_return_annotation
from .resource_links import ResourceLinks as DeprecatedResourceLinks


class ResourceModel(BaseModel):
    """A model representing an identifiable resource of the server."""

    id: str = Field(..., description="Unique identifier of the resource.")


ResponseDataT = TypeVar("ResponseDataT")
ResponseLinksT = TypeVar("ResponseLinksT")


DESCRIPTION_DATA = "The document’s primary data"

DESCRIPTION_LINKS = "A links object related to the primary data."


class BaseResponseBody(BaseModel):
    """Base model for HTTP responses.

    This model contains configuration and overrides to ensure returned
    JSON responses adhere to the server's generated OpenAPI Spec.
    """

    @override
    def model_dump(self, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        """Always exclude `None` when serializing to an object.

        With Pydantic v1, the OpenAPI spec described `Optional`(i.e., possibly
        `None`-valued) fields as omittable, but not nullable. This did not match
        Pydantic's actual serialization behavior, which serialized Python `None` to
        JSON `null` by default. This method override fixed the mismatch by making
        Pydantic omit the field from serialization instead.

        With Pydantic v2, the OpenAPI spec does describe `Optional` fields as nullable,
        matching Pydantic's serialization behavior. We therefore no longer need this
        override to make them match. However, removing this override and changing
        serialization behavior at this point would risk breaking things on the client.
        """
        kwargs["exclude_none"] = True
        return super().model_dump(*args, **kwargs)

    @override
    def dict(self, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        """See notes in `model_dump()`."""
        kwargs["exclude_none"] = True
        return super().dict(*args, **kwargs)

    @override
    def model_dump_json(self, *args: Any, **kwargs: Any) -> str:
        """See notes in `.model_dump()`."""
        kwargs["exclude_none"] = True
        return super().model_dump_json(*args, **kwargs)

    @override
    def json(self, *args: Any, **kwargs: Any) -> str:
        """See notes in `.model_dump()`."""
        kwargs["exclude_none"] = True
        return super().model_dump_json(*args, **kwargs)


class SimpleBody(BaseResponseBody, Generic[ResponseDataT]):
    """A response that returns a single resource."""

    data: ResponseDataT = Field(..., description=DESCRIPTION_DATA)


class Body(BaseResponseBody, Generic[ResponseDataT, ResponseLinksT]):
    """A response that returns a single resource and stateful links."""

    data: ResponseDataT = Field(..., description=DESCRIPTION_DATA)
    links: ResponseLinksT = Field(..., description=DESCRIPTION_LINKS)


class SimpleEmptyBody(BaseResponseBody):
    """A response that returns no data and no links."""


class EmptyBody(BaseResponseBody, Generic[ResponseLinksT]):
    """A response that returns no data except stateful links."""

    links: ResponseLinksT = Field(..., description=DESCRIPTION_LINKS)


class MultiBodyMeta(BaseModel):
    cursor: int = Field(
        ...,
        description=(
            "The index of the response's cursor in the overall collection"
            " the response represents."
        ),
    )
    totalLength: int = Field(
        ...,
        description="Total number of items in the overall collection.",
    )


class SimpleMultiBody(BaseResponseBody, Generic[ResponseDataT]):
    """A response that returns multiple resources."""

    data: Sequence[ResponseDataT] = Field(..., description=DESCRIPTION_DATA)
    # note: the type of data is the protocol Sequence even though this is an actual
    # object. this is normally something you shouldn't do - the type should be described -
    # but it's done here because the type definition of the constructor and the construct()
    # non-validating classmethod is taken from the type of this member, and there we really
    # want the arguments to be Sequence so they can accept narrower subtypes. For instance,
    # if you define a function as returning SimpleMultiBody[Union[A, B]], you should really
    # be able to do return SimpleMultiBody.model_construct([A(), A(), A()]) or even
    # SimpleMultiBody[Union[A, B]].model_construct([A(), A(), A()]). However, because construct's
    # params are defined based on the dataclass fields, the only way to get the arguments
    # to be covariant is to make data the covariant Sequence protocol.
    meta: MultiBodyMeta = Field(
        ...,
        description="Metadata about the collection response.",
    )


class MultiBody(BaseResponseBody, Generic[ResponseDataT, ResponseLinksT]):
    """A response that returns multiple resources and stateful links."""

    data: List[ResponseDataT] = Field(..., description=DESCRIPTION_DATA)
    links: ResponseLinksT = Field(..., description=DESCRIPTION_LINKS)
    meta: MultiBodyMeta = Field(
        ...,
        description="Metadata about the collection response.",
    )


ResponseBodyT = TypeVar("ResponseBodyT", bound=BaseResponseBody)

RouteMethodSig = ParamSpec("RouteMethodSig")
DecoratedEndpoint = TypeVar("DecoratedEndpoint", bound=Callable[..., Any])
RouteMethodReturn = TypeVar(
    "RouteMethodReturn", bound=Callable[[DecoratedEndpoint], DecoratedEndpoint]
)


class PydanticResponse(JSONResponse, Generic[ResponseBodyT]):
    """A custom JSON response that uses Pydantic for JSON serialization.

    Returning this class from an endpoint function is much more performant
    than returning a plain Pydantic model and letting FastAPI serialize it.
    """

    @classmethod
    def wrap_route(
        cls,
        route_method: Callable[RouteMethodSig, RouteMethodReturn],
        *route_args: RouteMethodSig.args,
        **route_kwargs: RouteMethodSig.kwargs,
    ) -> Callable[[DecoratedEndpoint], DecoratedEndpoint]:
        """Use this classmethod as a decorator to wrap routes that return PydanticResponses.

        The route method (i.e. the .post() method of the router) is the first argument and the rest of the
        arguments are keyword args that are forwarded to the route handler.

        For instance:
        @PydanticResponse.wrap_route(
            some_router.post,
            path='/some/path',
            ...
        )
        def my_some_path_handler(...) -> PydanticResponse[SimpleBody[whatever]]:
            ...

        The reason this exists is that if you do not specify a response_model, pydantic will parse the return
        value annotation and try to stuff it in a pydantic field. Pydantic fields can't handle arbitrary classes,
        like fastapi.JSONResponse; therefore, you get an exception while parsing the file (since this all happens
        in a decorator). The fix for this is to always specify a response_model, even if you're also doing a return
        value annotation and/or responses={} arguments.

        This decorator does that for you! Just take any route handler that returns a PydanticResponse (you still have to
        annotate it as such, and return PydanticResponse.create(...) yourself, this only handles the decorating part) and
        replace its route decoration with this one, passing the erstwhile route decorator in.
        """
        # our outermost function exists to capture the arguments that you want to forward to the route decorator
        assert (
            "response_model" not in route_kwargs
        ), "Do not use PydanticResponse.wrap_route if you are already specifying a response model"

        def decorator(
            endpoint_method: DecoratedEndpoint,
        ) -> DecoratedEndpoint:
            # the return annotation is e.g. PydanticResponse[SimpleBody[Whatever]]
            return_annotation = get_typed_return_annotation(endpoint_method)
            # the first arg of the outermost type is the argument to the generic,
            # in this case SimpleBody[Whatever]
            response_model = get_args(return_annotation)[0]
            # and that's what we want to pass to the route method as response_model, so we do it and get the actual
            # function transformer
            route_decorator = route_method(
                **route_kwargs, response_model=response_model
            )
            # which we then call on the endpoint method to get it registered with the router, and return the results
            return route_decorator(endpoint_method)

        # and finally we return our own function transformer with the route method args closed over
        return decorator

    def __init__(
        self,
        content: ResponseBodyT,
        status_code: int = 200,
    ) -> None:
        """Initialize the response object and render the response body."""
        super().__init__(content, status_code)
        self.content = content

    @classmethod
    async def create(
        cls,
        content: ResponseBodyT,
        status_code: int = 200,
    ) -> PydanticResponse[ResponseBodyT]:
        """Asynchronously create a response object.

        This factory creates the response in a worker thread, thus moving
        JSON rendering off the main thread. This can help resolve blocking
        issues with large responses.
        """
        return await to_thread.run_sync(cls, content, status_code)

    def render(self, content: ResponseBodyT) -> bytes:
        """Render the response body to JSON bytes."""
        return content.model_dump_json().encode(self.charset)


# TODO(mc, 2021-12-09): remove this model
class DeprecatedResponseDataModel(BaseModel):
    """A model representing an identifiable resource of the server.

    .. deprecated::
        Prefer ResourceModel, which requires ID to be specified
    """

    id: str = Field(..., description="Unique identifier for the resource object.")


# TODO(mc, 2021-12-09): remove this model
class DeprecatedResponseModel(BaseModel, Generic[ResponseDataT]):
    """A response that returns a single resource and stateful links.

    This deprecated response model may serialize `Optional` fields to `null`,
    which violates our generated OpenAPI Spec.

    Note:
        Do not use this response model for new endpoints.
    """

    data: ResponseDataT = Field(..., description=DESCRIPTION_DATA)
    links: Optional[DeprecatedResourceLinks] = Field(
        None,
        description=DESCRIPTION_LINKS,
    )


# TODO(mc, 2021-12-09): remove this model
class DeprecatedMultiResponseModel(
    BaseModel,
    Generic[ResponseDataT],
):
    """A response that returns multiple resources and stateful links.

    This deprecated response model may serialize `Optional` fields to `null`,
    which violates our generated OpenAPI Spec.

    Note:
        Do not use this response model for new endpoints.
    """

    data: List[ResponseDataT] = Field(..., description=DESCRIPTION_DATA)
    links: Optional[DeprecatedResourceLinks] = Field(
        None,
        description=DESCRIPTION_LINKS,
    )


class NotifyRefetchBody(BaseResponseBody):
    """A notification response that returns a flag for refetching via HTTP."""

    refetch: bool = True


class NotifyUnsubscribeBody(BaseResponseBody):
    """A notification response.

    Returns flags for unsubscribing from a topic.
    """

    unsubscribe: bool = True
