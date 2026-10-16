import asyncio
import logging
import os

import httpx

API_BASE = "https://api.bolna.ai"
log = logging.getLogger("asli.bolna")


class BolnaError(RuntimeError):
    pass


class Bolna:
    def __init__(self, api_key: str | None = None, from_number: str | None = None, transport: httpx.AsyncBaseTransport | None = None):
        self.from_number = from_number if from_number is not None else os.getenv("BOLNA_FROM_NUMBER")
        self.client = httpx.AsyncClient(
            base_url=API_BASE,
            timeout=httpx.Timeout(10.0),
            headers={"Authorization": f"Bearer {api_key or os.getenv('BOLNA_API_KEY', '')}"},
            transport=transport,
        )

    async def aclose(self) -> None:
        await self.client.aclose()

    async def place_call(self, agent_id: str, phone: str, user_data: dict) -> str:
        body = {"agent_id": agent_id, "recipient_phone_number": phone, "user_data": user_data}
        if self.from_number:
            body["from_phone_number"] = self.from_number
        res = await self.client.post("/call", json=body)
        if res.is_error:
            raise BolnaError(f"place_call {res.status_code}: {res.text[:300]}")
        data = res.json()
        run_id = data.get("execution_id") or data.get("run_id")
        if not run_id:
            raise BolnaError(f"place_call returned no execution_id: {data}")
        return run_id

    async def fire_event(self, run_id: str, event: str, properties: dict | None = None) -> None:
        body = {"event": event, "properties": properties or {}}
        last = None
        for attempt in range(3):
            try:
                res = await self.client.post(f"/v1/call/{run_id}/events", json=body)
                if res.status_code < 500:
                    if res.is_error:
                        raise BolnaError(f"fire_event {event} {res.status_code}: {res.text[:300]}")
                    return
                last = BolnaError(f"fire_event {event} {res.status_code}")
            except httpx.TransportError as exc:
                last = exc
            await asyncio.sleep(0.4 * (attempt + 1))
        raise BolnaError(f"fire_event {event} failed after retries: {last}")
