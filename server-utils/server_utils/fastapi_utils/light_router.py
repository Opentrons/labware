"""See the `LightRouter` class."""

from __future__ import annotations

import dataclasses
import enum
import typing
import typing_extensions

import fastapi


_FASTAPI_ROUTE_METHOD_NAMES = {
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
}

if typing.TYPE_CHECKING:
    # This is some chicanery so that @router.get(...), @router.post(...), etc. give us
    # type-checking and autocomplete that exactly match the regular FastAPI version.
    # These methods have a lot of parameters with complicated types and it would be
    # a bear to manually keep them in sync with FastAPI.

    _P = typing.ParamSpec("_P")
    _ReturnT = typing.TypeVar("_ReturnT")

    # `_CallableLike(FastAPI.foo)` produces a callable with the same signature
    # as `FastAPI.foo()`.
    class _CallableLike(typing.Generic[_P, _ReturnT]):
        def __init__(
            self,
            method_to_mimic: typing.Callable[
                typing.Concatenate[
                    fastapi.FastAPI,  # The `self` parameter, which we throw away.
                    _P,  # The actual args and kwargs, which we preserve.
                ],
                _ReturnT,
            ],
        ) -> None:
            raise NotImplementedError("This is only for type-checking, not runtime.")

        def __call__(self, *args: _P.args, **kwargs: _P.kwargs) -> _ReturnT:
            raise NotImplementedError("This is only for type-checking, not runtime.")

    class _FastAPIRouteMethods:
        get: typing.Final = _CallableLike(fastapi.FastAPI.get)
        put: typing.Final = _CallableLike(fastapi.FastAPI.put)
        post: typing.Final = _CallableLike(fastapi.FastAPI.post)
        delete: typing.Final = _CallableLike(fastapi.FastAPI.delete)
        options: typing.Final = _CallableLike(fastapi.FastAPI.options)
        head: typing.Final = _CallableLike(fastapi.FastAPI.head)
        patch: typing.Final = _CallableLike(fastapi.FastAPI.patch)
        trace: typing.Final = _CallableLike(fastapi.FastAPI.trace)

else:

    class _FastAPIRouteMethods:
        pass


class LightRouter(_FastAPIRouteMethods):
    """A lightweight drop-in replacement for `fastapi.APIRouter`.

    Use it like `fastapi.APIRouter`:

        foo_router = LightRouter()

        @router.get("/foo/{id}")
        def get_health(id: str) -> Response:
            ...

        bar_router = ...

        root_router = LightRouter()
        root_router.include_router(foo_router)
        root_router.include_router(bar_router)

        app = fastapi.FastAPI()
        root_router.install_on_app(app)

    Rationale:

    With FastAPI's standard `FastAPI` and `APIRouter` classes, the `.include_router()`
    method has a lot of overhead, accounting for something like 30-40% of
    robot-server's startup time, which is multiple minutes long at the time of writing.
    (https://github.com/pydantic/pydantic/issues/6768#issuecomment-1644532429)

    We could avoid the overhead by adding endpoints directly to the top-level FastAPI
    app, "flat," instead of using `.include_router()`. But that would be bad for code
    organization; we want to keep our tree of sub-routers. So this class reimplements
    the important parts of `fastapi.APIRouter`, so we can keep our router tree, but
    in a lighter-weight way.

    When you call `@router.get()` or `router.include_router()` on this class, it appends
    to a lightweight internal structure and completely avoids slow calls into FastAPI.
    Later on, when you do `router.install_on_app()`, everything in the tree is added to
    the FastAPI app.
    """

    def __init__(self) -> None:
        self._routes: list[_Endpoint | _IncludedRouter] = []

    def __getattr__(self, name: str) -> object:
        """Supply the optimized version of `@router.get()`, `@router.post()`, etc.

        See the FastAPI docs for usage details.
        """
        if name in _FASTAPI_ROUTE_METHOD_NAMES:
            return _EndpointCaptor(method_name=name, on_capture=self._routes.append)
        else:
            raise AttributeError(name=name)

    def include_router(
        self,
        router: LightRouter | fastapi.APIRouter,
        **kwargs: typing_extensions.Unpack[_RouterIncludeKwargs],
    ) -> None:
        """The optimized version of `fastapi.APIRouter.include_router()`.

        See the FastAPI docs for argument details.
        """  # noqa: D402
        self._routes.append(_IncludedRouter(router=router, inclusion_kwargs=kwargs))

    def install_on_app(
        self,
        app: fastapi.FastAPI,
        **kwargs: typing_extensions.Unpack[_RouterIncludeKwargs],
    ) -> None:
        """The optimized version of `fastapi.FastAPI.include_router()`.

        See the FastAPI docs for argument details..
        """
        for route in self._routes:
            if isinstance(route, _IncludedRouter):
                router = route.router
                combined_kwargs = _merge_kwargs(kwargs, route.inclusion_kwargs)
                if isinstance(router, fastapi.APIRouter):
                    app.include_router(router, **combined_kwargs)
                elif isinstance(route.router, LightRouter):
                    router.install_on_app(app, **combined_kwargs)
            else:
                typing_extensions.assert_type(route, _Endpoint)
                combined_kwargs = _merge_kwargs(
                    kwargs,
                    route.kwargs,  # type: ignore[arg-type]
                )
                fastapi_method = getattr(app, route.method_name)
                fastapi_decorator = fastapi_method(*route.args, **combined_kwargs)
                fastapi_decorator(route.function)


class _RouterIncludeKwargs(typing.TypedDict):
    """The keyword arguments of FastAPI's `.include_router()` method.

    (At least the arguments that we actually use, anyway.)
    """

    # Arguments with defaults should be annotated as `NotRequired`.
    # For example, `foo: str | None = None` becomes `NotRequired[str | None]`.

    tags: typing_extensions.NotRequired[list[str | enum.Enum] | None]
    responses: typing_extensions.NotRequired[
        dict[int | str, dict[str, typing.Any]] | None
    ]
    dependencies: typing_extensions.NotRequired[
        typing.Sequence[
            # FastAPI does not publicly expose the type of the result of a
            # Depends(...) call, so this needs to be Any.
            typing.Any
        ]
        | None
    ]


def _merge_kwargs(
    from_parent: _RouterIncludeKwargs, from_child: _RouterIncludeKwargs
) -> _RouterIncludeKwargs:
    """Merge kwargs from different levels of a FastAPI router tree.

    FastAPI keyword arguments can be specified at multiple levels in the router tree.
    For example, the top-level router, subrouters, and finally the endpoint function
    can each specify their own `tags`. The different levels need to be merged
    carefully and in argument-specific ways if we want to match FastAPI behavior.
    For example, the final `tags` value should be the concatenation of the values
    from all levels.
    """
    merge_result: _RouterIncludeKwargs = {}
    remaining_from_parent = from_parent.copy()
    remaining_from_child = from_child.copy()

    # When we know how to merge a specific argument's values, do so.
    # This takes care to leave the argument unset if it's unset in both parent and
    # child, in order to leave the defaulting up to FastAPI.
    if "tags" in remaining_from_parent or "tags" in remaining_from_child:
        merge_result["tags"] = [
            *(remaining_from_parent.get("tags") or []),
            *(remaining_from_child.get("tags") or []),
        ]
        remaining_from_parent.pop("tags", None)
        remaining_from_child.pop("tags", None)

    # For any argument whose values we don't know how to merge, we can just pass it
    # along opaquely, as long as the parent and child aren't both trying to set it.
    #
    # If the parent and child *are* both trying to set it, then we have a problem.
    # It would likely be wrong to arbitrarily choose one to override the other,
    # so we can only raise an error.
    colliding_keys = set(remaining_from_parent.keys()).intersection(
        remaining_from_child.keys()
    )
    if not colliding_keys:
        merge_result.update(remaining_from_parent)
        merge_result.update(remaining_from_child)
    else:
        a_collisions: dict[object, object] = {
            k: remaining_from_parent[k] for k in colliding_keys  # type: ignore[literal-required]
        }
        b_collisions: dict[object, object] = {
            k: remaining_from_child[k] for k in colliding_keys  # type: ignore[literal-required]
        }
        raise NotImplementedError(
            f"These FastAPI keyword arguments appear at different levels "
            f"in the router tree, and we don't know how to merge their values:\n"
            f"{a_collisions}\n{b_collisions}\n"
            f"Modify {__name__} to handle the merge, or avoid the problem by "
            f"setting the argument at only one level of the router tree."
        )

    return merge_result


@dataclasses.dataclass
class _IncludedRouter:
    router: fastapi.APIRouter | LightRouter
    inclusion_kwargs: _RouterIncludeKwargs


_DecoratedFunctionT = typing.TypeVar(
    "_DecoratedFunctionT", bound=typing.Callable[..., object]
)


class _EndpointCaptor:
    """A callable that pretends to be a FastAPI path operation decorator.

    `method_name` is the FastAPI method to pretend to be, e.g. "get" or "post".

    Supposing you have an `_EndpointCaptor` named `get`, when this whole enchilada
    happens:

        @get("/foo/{id}", description="blah blah")
        def get_some_endpoint(id: str) -> Response:
            ...

    Then information about the whole enchilada is sent to the `on_capture` callback.
    """

    def __init__(
        self,
        method_name: str,
        on_capture: typing.Callable[[_Endpoint], None],
    ) -> None:
        self._method_name = method_name
        self._on_capture = on_capture

    def __call__(
        self, *fastapi_decorator_args: object, **fastapi_decorator_kwargs: object
    ) -> typing.Callable[[_DecoratedFunctionT], _DecoratedFunctionT]:
        def decorate(decorated_function: _DecoratedFunctionT) -> _DecoratedFunctionT:
            self._on_capture(
                _Endpoint(
                    method_name=self._method_name,
                    args=fastapi_decorator_args,
                    kwargs=fastapi_decorator_kwargs,
                    function=decorated_function,
                )
            )
            return decorated_function

        return decorate


@dataclasses.dataclass
class _Endpoint:
    """Information about an endpoint that's been added to a router."""

    method_name: str
    """The name of the method on the FastAPI class, e.g. "get"."""

    args: tuple[object, ...]
    """The positional arguments passed to the FastAPI method, e.g. the URL path."""

    kwargs: dict[str, object]
    """The keyword arguments passed to the FastAPI method, e.g. `description`."""

    function: typing.Callable[..., object]
    """The function actually implementing the logic of the endpoint.

    (The "path operation function", in FastAPI terms.)
    """
