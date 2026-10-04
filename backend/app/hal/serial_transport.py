"""
AeroThrust V3 - USB Serial Transport (For Physical STM32 Controller)
"""

import asyncio
from typing import Optional
import serial_asyncio
from app.hal.base import BaseTransport
from app.core.protocol import cobs_decode


class SerialTransport(BaseTransport):
    def __init__(self, port: str, baudrate: int = 115200):
        self.port = port
        self.baudrate = baudrate
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self._rx_buffer = bytearray()

    async def connect(self) -> bool:
        try:
            self.reader, self.writer = await serial_asyncio.open_serial_connection(
                url=self.port, baudrate=self.baudrate
            )
            self._rx_buffer.clear()
            return True
        except Exception:
            self.reader = None
            self.writer = None
            return False

    async def disconnect(self) -> None:
        if self.writer:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass
        self.reader = None
        self.writer = None
        self._rx_buffer.clear()

    async def is_connected(self) -> bool:
        return self.writer is not None and not self.writer.is_closing()

    async def read_frame(self) -> Optional[bytes]:
        if not await self.is_connected() or not self.reader:
            return None

        try:
            chunk = await asyncio.wait_for(self.reader.read(256), timeout=0.05)
            if not chunk:
                return None
            self._rx_buffer.extend(chunk)

            if b"\x00" in self._rx_buffer:
                delimiter_idx = self._rx_buffer.index(b"\x00")
                frame = self._rx_buffer[:delimiter_idx]
                del self._rx_buffer[:delimiter_idx + 1]

                if len(frame) == 0:
                    return None

                return cobs_decode(frame)
        except asyncio.TimeoutError:
            return None
        except Exception:
            await self.disconnect()
            return None

        return None

    async def write_packet(self, data: bytes) -> bool:
        if not await self.is_connected() or not self.writer:
            return False
        try:
            self.writer.write(data)
            await self.writer.drain()
            return True
        except Exception:
            await self.disconnect()
            return False