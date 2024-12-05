"""
This was initially generated by datamodel-codegen from the labware schema in
shared-data. It's been modified by hand to be more friendly.
"""

from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING, Dict, List, Optional, Union
from math import sqrt, asin
from numpy import pi, trapz
from functools import cached_property

from pydantic import (
    BaseModel,
    Extra,
    Field,
    conint,
    confloat,
    StrictInt,
    StrictFloat,
)
from typing_extensions import Literal

from .constants import (
    Conical,
    Cuboidal,
    RoundedCuboid,
    SquaredCone,
    Spherical,
    WellShape,
    Circular,
    Rectangular,
)

SAFE_STRING_REGEX = "^[a-z0-9._]+$"


if TYPE_CHECKING:
    _StrictNonNegativeInt = int
    _StrictNonNegativeFloat = float
else:
    _StrictNonNegativeInt = conint(strict=True, ge=0)
    _StrictNonNegativeFloat = confloat(strict=True, ge=0.0)


_Number = Union[StrictInt, StrictFloat]
"""JSON number type, written to preserve lack of decimal point.

For labware definition hashing, which is an older part of the codebase,
this ensures that Pydantic won't change `"someFloatField: 0` to
`"someFloatField": 0.0`, which would hash differently.
"""

_NonNegativeNumber = Union[_StrictNonNegativeInt, _StrictNonNegativeFloat]
"""Non-negative JSON number type, written to preserve lack of decimal point."""


class CornerOffsetFromSlot(BaseModel):
    """
    Distance from left-front-bottom corner of slot to left-front-bottom corner
     of labware bounding box. Used for labware that spans multiple slots. For
      labware that does not span multiple slots, x/y/z should all be zero.
    """

    x: _Number
    y: _Number
    z: _Number


class OverlapOffset(BaseModel):
    """
    Overlap dimensions of labware with another labware/module that it can be stacked on top of.
    """

    x: _Number
    y: _Number
    z: _Number


class OffsetVector(BaseModel):
    """
    A generic 3-D offset vector.
    """

    x: _Number
    y: _Number
    z: _Number


class GripperOffsets(BaseModel):
    """
    Offsets used when calculating coordinates for gripping labware during labware movement.
    """

    pickUpOffset: OffsetVector
    dropOffset: OffsetVector


class BrandData(BaseModel):
    brand: str = Field(..., description="Brand/manufacturer name")
    brandId: Optional[List[str]] = Field(
        None,
        description="An array of manufacture numbers pertaining to a given labware",
    )
    links: Optional[List[str]] = Field(
        None, description="URLs for manufacturer page(s)"
    )


class DisplayCategory(str, Enum):
    tipRack = "tipRack"
    tubeRack = "tubeRack"
    reservoir = "reservoir"
    trash = "trash"
    wellPlate = "wellPlate"
    aluminumBlock = "aluminumBlock"
    adapter = "adapter"
    other = "other"
    lid = "lid"


class LabwareRole(str, Enum):
    labware = "labware"
    fixture = "fixture"
    adapter = "adapter"
    maintenance = "maintenance"
    lid = "lid"


class Metadata(BaseModel):
    """
    Properties used for search and display
    """

    displayName: str = Field(..., description="Easy to remember name of labware")
    displayCategory: DisplayCategory = Field(
        ..., description="Label(s) used in UI to categorize labware"
    )
    displayVolumeUnits: Literal["µL", "mL", "L"] = Field(
        ..., description="Volume units for display"
    )
    tags: Optional[List[str]] = Field(
        None, description="List of descriptions for a given labware"
    )


class Parameters(BaseModel):
    """
    Internal describers used to determine pipette movement to labware
    """

    format: Literal[
        "96Standard", "384Standard", "trough", "irregular", "trash"
    ] = Field(
        ..., description="Property to determine compatibility with multichannel pipette"
    )
    quirks: Optional[List[str]] = Field(
        None,
        description="Property to classify a specific behavior this labware "
        "should have",
    )
    isTiprack: bool = Field(
        ..., description="Flag marking whether a labware is a tiprack or not"
    )
    tipLength: Optional[_NonNegativeNumber] = Field(
        None,
        description="Required if labware is tiprack, specifies length of tip"
        " from drawing or as measured with calipers",
    )
    tipOverlap: Optional[_NonNegativeNumber] = Field(
        None,
        description="Required if labware is tiprack, specifies the length of "
        "the area of the tip that overlaps the nozzle of the pipette",
    )
    loadName: str = Field(
        ...,
        description="Name used to reference a labware definition",
        regex=SAFE_STRING_REGEX,
    )
    isMagneticModuleCompatible: bool = Field(
        ...,
        description="Flag marking whether a labware is compatible by default "
        "with the Magnetic Module",
    )
    magneticModuleEngageHeight: Optional[_NonNegativeNumber] = Field(
        None, description="Distance to move magnetic module magnets to engage"
    )
    isDeckSlotCompatible: Optional[bool] = Field(
        True,
        description="Optional flag marking whether a labware is compatible by with"
        " being placed or loaded in a base deck slot, defaults to true.",
    )


class Dimensions(BaseModel):
    """
    Outer dimensions of a labware
    """

    yDimension: _NonNegativeNumber = Field(...)
    zDimension: _NonNegativeNumber = Field(...)
    xDimension: _NonNegativeNumber = Field(...)


class WellDefinition(BaseModel):
    class Config:
        extra = Extra.allow

    depth: _NonNegativeNumber = Field(...)
    x: _NonNegativeNumber = Field(
        ...,
        description="x location of center-bottom of well in reference to "
        "left-front-bottom of labware",
    )
    y: _NonNegativeNumber = Field(
        ...,
        description="y location of center-bottom of well in reference to "
        "left-front-bottom of labware",
    )
    z: _NonNegativeNumber = Field(
        ...,
        description="z location of center-bottom of well in reference to "
        "left-front-bottom of labware",
    )
    totalLiquidVolume: _NonNegativeNumber = Field(
        ..., description="Total well, tube, or tip volume in microliters"
    )
    xDimension: Optional[_NonNegativeNumber] = Field(
        None,
        description="x dimension of rectangular wells",
    )
    yDimension: Optional[_NonNegativeNumber] = Field(
        None,
        description="y dimension of rectangular wells",
    )
    diameter: Optional[_NonNegativeNumber] = Field(
        None,
        description="diameter of circular wells",
    )
    shape: Literal["rectangular", "circular"] = Field(
        ...,
        description="If 'rectangular', use xDimension and "
        "yDimension; if 'circular' use diameter",
    )
    geometryDefinitionId: Optional[str] = Field(
        None, description="str id of the well's corresponding" "innerWellGeometry"
    )


class SphericalSegment(BaseModel):
    shape: Spherical = Field(..., description="Denote shape as spherical")
    radiusOfCurvature: _NonNegativeNumber = Field(
        ...,
        description="radius of curvature of bottom subsection of wells",
    )
    topHeight: _NonNegativeNumber = Field(
        ..., description="The depth of a spherical bottom of a well"
    )
    bottomHeight: _NonNegativeNumber = Field(
        ...,
        description="Height of the bottom of the segment, must be 0.0",
    )
    xCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )
    yCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )

    @cached_property
    def count(self) -> int:
        return self.xCount * self.yCount

    class Config:
        keep_untouched = (cached_property,)


class ConicalFrustum(BaseModel):
    shape: Conical = Field(..., description="Denote shape as conical")
    bottomDiameter: _NonNegativeNumber = Field(
        ...,
        description="The diameter at the bottom cross-section of a circular frustum",
    )
    topDiameter: _NonNegativeNumber = Field(
        ..., description="The diameter at the top cross-section of a circular frustum"
    )
    topHeight: _NonNegativeNumber = Field(
        ...,
        description="The height at the top of a bounded subsection of a well, relative to the bottom"
        "of the well",
    )
    bottomHeight: _NonNegativeNumber = Field(
        ...,
        description="The height at the bottom of a bounded subsection of a well, relative to the bottom of the well",
    )
    xCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )
    yCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )

    @cached_property
    def count(self) -> int:
        return self.xCount * self.yCount

    class Config:
        keep_untouched = (cached_property,)


class CuboidalFrustum(BaseModel):
    shape: Cuboidal = Field(..., description="Denote shape as cuboidal")
    bottomXDimension: _NonNegativeNumber = Field(
        ...,
        description="x dimension of the bottom cross-section of a rectangular frustum",
    )
    bottomYDimension: _NonNegativeNumber = Field(
        ...,
        description="y dimension of the bottom cross-section of a rectangular frustum",
    )
    topXDimension: _NonNegativeNumber = Field(
        ...,
        description="x dimension of the top cross-section of a rectangular frustum",
    )
    topYDimension: _NonNegativeNumber = Field(
        ...,
        description="y dimension of the top cross-section of a rectangular frustum",
    )
    topHeight: _NonNegativeNumber = Field(
        ...,
        description="The height at the top of a bounded subsection of a well, relative to the bottom"
        "of the well",
    )
    bottomHeight: _NonNegativeNumber = Field(
        ...,
        description="The height at the bottom of a bounded subsection of a well, relative to the bottom of the well",
    )
    xCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )
    yCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )

    @cached_property
    def count(self) -> int:
        return self.xCount * self.yCount

    class Config:
        keep_untouched = (cached_property,)


# A squared cone is the intersection of a cube and a cone that both
# share a central axis, and is a transitional shape between a cone and pyramid
"""
module RectangularPrismToCone(bottom_shape, diameter, x, y, z) {
    circle_radius = diameter/2;
    r1 = sqrt(x*x + y*y)/2;
    r2 = circle_radius/2;
    top_r = bottom_shape == "square" ? r1 : r2;
    bottom_r = bottom_shape == "square" ? r2 : r1;
    intersection() {
        cylinder(z,top_r,bottom_r,$fn=100);
        translate([0,0,z/2])cube([x, y, z], center=true);
    }
}
"""


class SquaredConeSegment(BaseModel):
    shape: SquaredCone = Field(
        ..., description="Denote shape as a squared conical segment"
    )
    bottomCrossSection: WellShape = Field(
        ...,
        description="Denote if the shape is going from circular to rectangular or vise versa",
    )
    circleDiameter: _NonNegativeNumber = Field(
        ...,
        description="diameter of the circular face of a truncated circular segment",
    )

    rectangleXDimension: _NonNegativeNumber = Field(
        ...,
        description="x dimension of the rectangular face of a truncated circular segment",
    )
    rectangleYDimension: _NonNegativeNumber = Field(
        ...,
        description="y dimension of the rectangular face of a truncated circular segment",
    )
    topHeight: _NonNegativeNumber = Field(
        ...,
        description="The height at the top of a bounded subsection of a well, relative to the bottom"
        "of the well",
    )
    bottomHeight: _NonNegativeNumber = Field(
        ...,
        description="The height at the bottom of a bounded subsection of a well, relative to the bottom of the well",
    )
    xCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )
    yCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )

    @staticmethod
    def _area_trap_points(
        total_frustum_height: float,
        circle_diameter: float,
        rectangle_x: float,
        rectangle_y: float,
        dx: float,
    ) -> List[float]:
        """Grab a bunch of data points of area at given heights."""

        def _area_arcs(r: float, c: float, d: float) -> float:
            """Return the area of all 4 arc segments."""
            theata_y = asin(c / r)
            theata_x = asin(d / r)
            theata_arc = (pi / 2) - theata_y - theata_x
            # area of all 4 arcs is 4 * pi*r^2*(theata/2pi)
            return 2 * r**2 * theata_arc

        def _area(r: float) -> float:
            """Return the area of a given r_y."""
            # distance from the center of y axis of the rectangle to where the arc intercepts that side
            c: float = (
                sqrt(r**2 - (rectangle_y / 2) ** 2) if (rectangle_y / 2) < r else 0
            )
            # distance from the center of x axis of the rectangle to where the arc intercepts that side
            d: float = (
                sqrt(r**2 - (rectangle_x / 2) ** 2) if (rectangle_x / 2) < r else 0
            )
            arc_area = _area_arcs(r, c, d)
            y_triangles: float = rectangle_y * c
            x_triangles: float = rectangle_x * d
            return arc_area + y_triangles + x_triangles

        r_0 = circle_diameter / 2
        r_h = sqrt(rectangle_x**2 + rectangle_y**2) / 2

        num_steps = int(total_frustum_height / dx)
        points = [0.0]
        for i in range(num_steps + 1):
            r_y = (i * dx / total_frustum_height) * (r_h - r_0) + r_0
            points.append(_area(r_y))
        return points

    @cached_property
    def height_to_volume_table(self) -> Dict[float, float]:
        """Return a lookup table of heights to volumes."""
        # the accuracy of this method is approximately +- 10*dx so for dx of 0.001 we have a +- 0.01 ul
        dx = 0.001
        total_height = self.topHeight - self.bottomHeight
        points = SquaredConeSegment._area_trap_points(
            total_height,
            self.circleDiameter,
            self.rectangleXDimension,
            self.rectangleYDimension,
            dx,
        )
        if self.bottomCrossSection is Rectangular:
            # The points function assumes the circle is at the bottom but if its flipped we just reverse the points
            points.reverse()
        elif self.bottomCrossSection is not Circular:
            raise NotImplementedError(
                "If you see this error a new well shape has been added without updating this code"
            )
        y = 0.0
        table: Dict[float, float] = {}
        # fill in the table
        while y < total_height:
            table[y] = trapz(points[0 : int(y / dx)], dx=dx)
            y = y + dx

        # we always want to include the volume at the max height
        table[total_height] = trapz(points, dx=dx)
        return table

    @cached_property
    def volume_to_height_table(self) -> Dict[float, float]:
        return dict((v, k) for k, v in self.height_to_volume_table.items())

    @cached_property
    def count(self) -> int:
        return self.xCount * self.yCount

    class Config:
        keep_untouched = (cached_property,)


"""
module filitedCuboidSquare(bottom_shape, diameter, width, length, height, steps) {
    module _slice(depth, x, y, r) {
        echo("called with: ", depth, x, y, r);
        circle_centers = [
            [(x/2)-r, (y/2)-r, 0],
            [(-x/2)+r, (y/2)-r, 0],
            [(x/2)-r, (-y/2)+r, 0],
            [(-x/2)+r, (-y/2)+r, 0]

        ];
        translate([0,0,depth/2])cube([x-2*r,y,depth], center=true);
        translate([0,0,depth/2])cube([x,y-2*r,depth], center=true);
        for (center = circle_centers) {
            translate(center) cylinder(depth, r, r, $fn=100);
        }
    }
    for (slice_height = [0:height/steps:height]) {
        r = (diameter) * (slice_height/height);
        translate([0,0,slice_height]) {
             _slice(height/steps , width, length, r/2);
        }
    }
}
module filitedCuboidForce(bottom_shape, diameter, width, length, height, steps) {
    module single_cone(r,x,y,z) {
        r = diameter/2;
        circle_face = [[ for (i = [0:1: steps]) i ]];
        theta = 360/steps;
        circle_points = [for (step = [0:1:steps]) [r*cos(theta*step), r*sin(theta*step), z]];
        final_points = [[x,y,0]];
        all_points = concat(circle_points, final_points);
        triangles = [for (step = [0:1:steps-1]) [step, step+1, steps+1]];
        faces = concat(circle_face, triangles);
        polyhedron(all_points, faces);
    }
    module square_section(r, x, y, z) {
        points = [
            [x,y,0],
            [-x,y,0],
            [-x,-y,0],
            [x,-y,0],
            [r,0,z],
            [0,r,z],
            [-r,0,z],
            [0,-r,z],
        ];
        faces = [
            [0,1,2,3],
            [4,5,6,7],
            [4, 0, 3],
            [5, 0, 1],
            [6, 1, 2],
            [7, 2, 3],
        ];
        polyhedron(points, faces);
    }
    circle_height = bottom_shape == "square" ? height : -height;
    translate_height = bottom_shape == "square" ? 0 : height;
    translate ([0,0, translate_height]) {
        union() {
            single_cone(diameter/2, width/2, length/2, circle_height);
            single_cone(diameter/2, -width/2, length/2, circle_height);
            single_cone(diameter/2, width/2, -length/2, circle_height);
            single_cone(diameter/2, -width/2, -length/2, circle_height);
            square_section(diameter/2, width/2, length/2, circle_height);
        }
    }
}

module filitedCuboid(bottom_shape, diameter, width, length, height) {
    if (width == length && width == diameter) {
        filitedCuboidSquare(bottom_shape, diameter, width, length, height, 100);
    }
    else {
        filitedCuboidForce(bottom_shape, diameter, width, length, height, 100);
    }
}"""


class RoundedCuboidSegment(BaseModel):
    shape: RoundedCuboid = Field(
        ..., description="Denote shape as a rounded cuboidal segment"
    )
    bottomCrossSection: WellShape = Field(
        ...,
        description="Denote if the shape is going from circular to rectangular or vise versa",
    )
    circleDiameter: _NonNegativeNumber = Field(
        ...,
        description="diameter of the circular face of a rounded rectangular segment",
    )
    rectangleXDimension: _NonNegativeNumber = Field(
        ...,
        description="x dimension of the rectangular face of a rounded rectangular segment",
    )
    rectangleYDimension: _NonNegativeNumber = Field(
        ...,
        description="y dimension of the rectangular face of a rounded rectangular segment",
    )
    topHeight: _NonNegativeNumber = Field(
        ...,
        description="The height at the top of a bounded subsection of a well, relative to the bottom"
        "of the well",
    )
    bottomHeight: _NonNegativeNumber = Field(
        ...,
        description="The height at the bottom of a bounded subsection of a well, relative to the bottom of the well",
    )
    xCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )
    yCount: _StrictNonNegativeInt = Field(
        default=1,
        description="Number of instances of this shape in the stackup, used for wells that have multiple sub-wells",
    )

    @cached_property
    def count(self) -> int:
        return self.xCount * self.yCount

    class Config:
        keep_untouched = (cached_property,)


class Metadata1(BaseModel):
    """
    Metadata specific to a grid of wells in a labware
    """

    displayName: Optional[str] = Field(
        None, description="User-readable name for the well group"
    )
    displayCategory: Optional[DisplayCategory] = Field(
        None, description="Label(s) used in UI to categorize well groups"
    )
    wellBottomShape: Optional[Literal["flat", "u", "v"]] = Field(
        None, description="Bottom shape of the well for UI purposes"
    )


class Group(BaseModel):
    wells: List[str] = Field(
        ..., description="An array of wells that contain the same metadata"
    )
    metadata: Metadata1 = Field(
        ..., description="Metadata specific to a grid of wells in a labware"
    )
    brand: Optional[BrandData] = Field(
        None, description="Brand data for the well group (e.g. for tubes)"
    )


WellSegment = Union[
    ConicalFrustum,
    CuboidalFrustum,
    SquaredConeSegment,
    RoundedCuboidSegment,
    SphericalSegment,
]


class InnerWellGeometry(BaseModel):
    sections: List[WellSegment] = Field(
        ...,
        description="A list of all of the sections of the well that have a contiguous shape",
    )


class LabwareDefinition(BaseModel):
    schemaVersion: Literal[1, 2, 3] = Field(
        ..., description="Which schema version a labware is using"
    )
    version: int = Field(
        ...,
        description="Version of the labware definition itself "
        "(eg myPlate v1/v2/v3). An incrementing integer",
        ge=1.0,
    )
    namespace: str = Field(..., regex=SAFE_STRING_REGEX)
    metadata: Metadata = Field(
        ..., description="Properties used for search and display"
    )
    brand: BrandData = Field(
        ...,
        description="Real-world labware that the definition is modeled "
        "from and/or compatible with",
    )
    parameters: Parameters = Field(
        ...,
        description="Internal describers used to determine pipette movement "
        "to labware",
    )
    ordering: List[List[str]] = Field(
        ...,
        description="Generated array that keeps track of how wells should be "
        "ordered in a labware",
    )
    cornerOffsetFromSlot: CornerOffsetFromSlot = Field(
        ...,
        description="Distance from left-front-bottom corner of slot to "
        "left-front-bottom corner of labware bounding box. Used for "
        "labware that spans multiple slots. For labware that does "
        "not span multiple slots, x/y/z should all be zero.",
    )
    dimensions: Dimensions = Field(..., description="Outer dimensions of a labware")
    wells: Dict[str, WellDefinition] = Field(
        ...,
        description="Unordered object of well objects with position and "
        "dimensional information",
    )
    groups: List[Group] = Field(
        ...,
        description="Logical well groupings for metadata/display purposes; "
        "changes in groups do not affect protocol execution",
    )
    allowedRoles: List[LabwareRole] = Field(
        default_factory=list,
        description="Allowed behaviors and usage of a labware in a protocol.",
    )
    stackingOffsetWithLabware: Dict[str, OverlapOffset] = Field(
        default_factory=dict,
        description="Supported labware that can be stacked upon,"
        " with overlap vector offset between both labware.",
    )
    stackingOffsetWithModule: Dict[str, OverlapOffset] = Field(
        default_factory=dict,
        description="Supported module that can be stacked upon,"
        " with overlap vector offset between labware and module.",
    )
    gripperOffsets: Dict[str, GripperOffsets] = Field(
        default_factory=dict,
        description="Offsets use when calculating coordinates for gripping labware "
        "during labware movement.",
    )
    gripHeightFromLabwareBottom: Optional[float] = Field(
        default_factory=None,
        description="The Z-height, from labware bottom, where the gripper should grip the labware.",
    )
    gripForce: Optional[float] = Field(
        default_factory=None,
        description="Force, in Newtons, with which the gripper should grip the labware.",
    )
    innerLabwareGeometry: Optional[Dict[str, InnerWellGeometry]] = Field(
        None,
        description="A dictionary holding all unique inner well geometries in a labware.",
    )
    stackLimit: Optional[int] = Field(
        1,
        description="The limit representing the maximum stack size for a given labware,"
        " defaults to 1 when unspecified indicating a single labware with no labware below it."
    )
    compatibleParentLabware: Optional[List[str]] = Field(
        None,
        description="List of parent Labware on which a labware may be loaded, primarily the labware which owns a lid.",
    )