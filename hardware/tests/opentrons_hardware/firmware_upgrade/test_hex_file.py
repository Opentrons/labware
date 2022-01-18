"""Tests for hex file processing."""
from typing import Iterable, List

import pytest
from opentrons_hardware.firmware_upgrade import hex_file


@pytest.mark.parametrize(
    argnames=["line", "expected"],
    argvalues=[
        [
            ":020000040800F2",
            hex_file.HexRecord(
                byte_count=2,
                address=0,
                record_type=hex_file.RecordType.ExtendedLinearAddress,
                data=b"\x08\x00",
                checksum=0xF2,
            ),
        ],
        [
            ":1001C000E9450008E9450008E9450008E945000857",
            hex_file.HexRecord(
                byte_count=16,
                address=0x01C0,
                record_type=hex_file.RecordType.Data,
                data=b"\xE9\x45\x00\x08\xE9\x45\x00\x08\xE9\x45\x00\x08\xE9\x45\x00\x08",
                checksum=0x57,
            ),
        ],
        [
            ":0451A0008943000837",
            hex_file.HexRecord(
                byte_count=4,
                address=0x51A0,
                record_type=hex_file.RecordType.Data,
                data=b"\x89\x43\x00\x08",
                checksum=0x37,
            ),
        ],
        [
            ":040000050800459911",
            hex_file.HexRecord(
                byte_count=4,
                address=0,
                record_type=hex_file.RecordType.StartLinearAddress,
                data=b"\x08\x00\x45\x99",
                checksum=0x11,
            ),
        ],
        [
            ":00000001FF",
            hex_file.HexRecord(
                byte_count=0,
                address=0,
                record_type=hex_file.RecordType.EOF,
                data=b"",
                checksum=0xFF,
            ),
        ],
    ],
)
def test_process_line(line: str, expected: hex_file.HexRecord) -> None:
    """It should process line successfully."""
    assert hex_file.process_line(line) == expected


@pytest.mark.parametrize(
    argnames=["line"],
    argvalues=[
        [
            # Missing :
            "020000040800F2",
        ],
        [
            # No checksum
            ":1001C000E9450008E9450008E9450008E9450008",
        ],
        [
            # Incomplete
            ":04",
        ],
        [
            # Bad record type
            ":040000060800459910",
        ],
        [
            # Wrong byte count
            ":0200000408F2",
        ],
    ],
)
def test_process_bad_line(line: str) -> None:
    """It should fail to process malformed line."""
    with pytest.raises(hex_file.MalformedLineException):
        hex_file.process_line(line)


@pytest.mark.parametrize(
    argnames=["line"],
    argvalues=[
        [
            ":020000040800F1",
        ],
        [
            ":1001C000E9450008E9450008E9450008E945000858",
        ],
        [
            ":0000000100",
        ],
    ],
)
def test_process_bad_checksum(line: str) -> None:
    """It should raise a checksum exception."""
    with pytest.raises(hex_file.ChecksumException):
        hex_file.process_line(line)


@pytest.fixture(scope="session")
def hex_records() -> Iterable[hex_file.HexRecord]:
    """A stream of hex records."""
    return [
        # Data line
        hex_file.HexRecord(byte_count=4, address=0x10,
                           record_type=hex_file.RecordType.Data,
                           data=b"\x00\x01\x02\x03", checksum=0),
        # Linear offset
        hex_file.HexRecord(byte_count=2, address=0,
                           record_type=hex_file.RecordType.ExtendedLinearAddress,
                           data=b"\x80\x00", checksum=0),
        # Data line
        hex_file.HexRecord(byte_count=4, address=0x0,
                           record_type=hex_file.RecordType.Data,
                           data=b"\x04\x05\x06\x07", checksum=0),
        # Data line that is not contiguous with prior record
        hex_file.HexRecord(byte_count=4, address=0x0,
                           record_type=hex_file.RecordType.Data,
                           data=b"\x08\x09\x0a\x0b", checksum=0),
        hex_file.HexRecord(byte_count=4, address=0x4,
                           record_type=hex_file.RecordType.Data,
                           data=b"\x0c\x0d\x0e\x0f", checksum=0),
        # Segment offset
        hex_file.HexRecord(byte_count=2, address=0,
                           record_type=hex_file.RecordType.ExtendedSegmentAddress,
                           data=b"\xab\xcd", checksum=0),
        # Data line
        hex_file.HexRecord(byte_count=4, address=0,
                           record_type=hex_file.RecordType.Data,
                           data=b"\x10\x11\x12\x13", checksum=0),
        # Start execution address
        hex_file.HexRecord(byte_count=4, address=0x100,
                           record_type=hex_file.RecordType.StartLinearAddress,
                           data=b"\x80\x90\xa0\xb0", checksum=0),
    ]


@pytest.mark.parametrize(
    argnames=["size", "expected"],
    argvalues=[
        [20, [
            hex_file.Chunk(address=0x10, data=[0, 1, 2, 3]),
            hex_file.Chunk(address=0x80000000, data=[4, 5, 6, 7]),
            hex_file.Chunk(address=0x80000000, data=[8, 9, 10, 11]),
            hex_file.Chunk(address=0x80000004, data=[12, 13, 14, 15]),
            hex_file.Chunk(address=0x800abcd4, data=[16, 17, 18, 19]),
         ]],
        [2, [
            hex_file.Chunk(address=0x10, data=[0, 1]),
            hex_file.Chunk(address=0x12, data=[2, 3]),
            hex_file.Chunk(address=0x80000000, data=[4, 5]),
            hex_file.Chunk(address=0x80000002, data=[6, 7]),
            hex_file.Chunk(address=0x80000004, data=[8, 9]),
            hex_file.Chunk(address=0x80000006, data=[10, 11]),
            hex_file.Chunk(address=0x80000004, data=[12, 13]),
            hex_file.Chunk(address=0x80000006, data=[14, 15]),
            hex_file.Chunk(address=0x800abcd4, data=[16, 17]),
            hex_file.Chunk(address=0x800abcd6, data=[18, 19]),
         ]],
        [3, [
            hex_file.Chunk(address=0x10, data=[0, 1, 2]),
            hex_file.Chunk(address=0x13, data=[3]),
            hex_file.Chunk(address=0x80000000, data=[4, 5, 6]),
            hex_file.Chunk(address=0x80000003, data=[7, 8, 9]),
            hex_file.Chunk(address=0x80000006, data=[10, 11]),
            hex_file.Chunk(address=0x80000004, data=[12, 13, 14]),
            hex_file.Chunk(address=0x80000007, data=[15]),
            hex_file.Chunk(address=0x800abcd4, data=[16, 17, 18]),
            hex_file.Chunk(address=0x800abcd7, data=[19]),
         ]],
    ]
)
def test_build_records(hex_records: Iterable[hex_file.HexRecord], size: int, expected: List[hex_file.Chunk]) -> None:
    """It should read n sized chunks from a stream of HexRecord objects."""
    subject = hex_file.HexRecordProcessor(records=hex_records)

    data = list(subject.process(size)) == expected
    assert data.start_address == 0x8090a0b0
