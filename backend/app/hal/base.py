"""
AeroThrust V3 - Abstract Base Transport
"""

from abc import ABC, abstractmethod
from typing import Optional


class BaseTransport(ABC):
    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection with physical or virtual hardware."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection cleanly."""
        pass

    @abstractmethod
    async def is_connected(self) -> bool:
        """Return True if connection is active."""
        pass

    @abstractmethod
    async def read_frame(self) -> Optional[bytes]:
        """
        Reads incoming bytes until a 0x00 delimiter is found.
        Returns the unencoded (COBS-decoded) payload, or None if no packet is ready.
        """
        pass

    @abstractmethod
    async def write_packet(self, data: bytes) -> bool:
        """Sends framed binary data to the hardware."""
        pass