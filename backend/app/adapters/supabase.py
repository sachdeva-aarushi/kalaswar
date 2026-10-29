from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger


class SupabaseAdapter:
    def __init__(
        self,
        base_url: Optional[str] = None,
        anon_key: Optional[str] = None,
        service_role_key: Optional[str] = None,
    ):
        self.base_url = (base_url or settings.SUPABASE_URL).rstrip("/")
        self.anon_key = anon_key or settings.SUPABASE_KEY
        self.service_role_key = service_role_key or settings.SUPABASE_SERVICE_ROLE_KEY

    def _headers(self, use_service_role: bool = True) -> Dict[str, str]:
        key = self.service_role_key if use_service_role and self.service_role_key else self.anon_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def check_health(self) -> bool:
        if not self.base_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{self.base_url}/rest/v1/", headers=self._headers(False))
                return res.status_code in (200, 401)  # 200 or 401 means endpoint responded
        except Exception as e:
            logger.warning("Supabase health check failed: %s", type(e).__name__)
            return False

    async def upsert_record(self, table: str, record: Dict[str, Any], use_service_role: bool = True) -> Dict[str, Any]:
        """Upserts a record into Supabase PostgREST table using resolution=merge-duplicates."""
        if not self.base_url:
            return record

        url = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(use_service_role=use_service_role)
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.post(url, json=record, headers=headers)
            if res.status_code not in (200, 201):
                logger.error("Upsert failed on %s: status=%d, body=%s", table, res.status_code, res.text)
                res.raise_for_status()
            data = res.json()
            return data[0] if isinstance(data, list) and data else record

    async def insert_record(self, table: str, record: Dict[str, Any], use_service_role: bool = True) -> Dict[str, Any]:
        """Inserts or upserts a record into Supabase PostgREST table."""
        return await self.upsert_record(table, record, use_service_role=use_service_role)



    async def query_records(
        self,
        table: str,
        params: Optional[Dict[str, str]] = None,
        use_service_role: bool = True,
    ) -> List[Dict[str, Any]]:
        """Queries records from Supabase PostgREST table."""
        if not self.base_url:
            return []

        url = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(use_service_role=use_service_role)
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(url, params=params, headers=headers)
            if res.status_code != 200:
                logger.error("Query failed on %s: status=%d, body=%s", table, res.status_code, res.text)
                res.raise_for_status()
            return res.json()


    async def update_records(
        self,
        table: str,
        filters: Dict[str, str],
        values: Dict[str, Any],
        use_service_role: bool = True,
    ) -> List[Dict[str, Any]]:
        """Updates records matching filters in Supabase PostgREST table."""
        if not self.base_url:
            return [values]

        url = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(use_service_role=use_service_role)
        headers["Prefer"] = "return=representation"
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.patch(url, params=filters, json=values, headers=headers)
            if res.status_code not in (200, 204):
                logger.error("Update failed on %s: status=%d, body=%s", table, res.status_code, res.text)
                res.raise_for_status()
            data = res.json() if res.content else []
            return data if isinstance(data, list) else [data]

    async def delete_records(
        self,
        table: str,
        filters: Dict[str, str],
        use_service_role: bool = True,
    ) -> List[Dict[str, Any]]:
        """Deletes records matching filters in Supabase PostgREST table."""
        if not self.base_url:
            return []

        url = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(use_service_role=use_service_role)
        headers["Prefer"] = "return=representation"
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.delete(url, params=filters, headers=headers)
            if res.status_code not in (200, 204):
                logger.error("Delete failed on %s: status=%d, body=%s", table, res.status_code, res.text)
                res.raise_for_status()
            data = res.json() if res.content else []
            return data if isinstance(data, list) else [data]


supabase_adapter = SupabaseAdapter()
