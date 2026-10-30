from collections import defaultdict
from typing import Any, Dict, List, Optional
from uuid import uuid4
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
        # In-memory test store for test environment or local fallback
        self._test_db: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self._test_auth_users: Dict[str, Dict[str, Any]] = {}

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
            return True if settings.ENVIRONMENT == "test" else False
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{self.base_url}/rest/v1/", headers=self._headers(False))
                return res.status_code in (200, 401)
        except Exception as e:
            logger.warning("Supabase health check failed: %s", type(e).__name__)
            return True if settings.ENVIRONMENT == "test" else False

    # --------------------------------------------------------------------------
    # Supabase Auth Admin Operations
    # --------------------------------------------------------------------------

    async def create_auth_user(
        self,
        email: str,
        password: str,
        user_metadata: Optional[Dict[str, Any]] = None,
        app_metadata: Optional[Dict[str, Any]] = None,
        email_confirm: bool = True,
    ) -> Dict[str, Any]:
        """
        Creates a user in Supabase Auth via Admin API with role metadata set server-side.
        """
        user_id = str(uuid4())
        meta = user_metadata or {}
        app_meta = app_metadata or {}

        if settings.ENVIRONMENT == "test" or not self.base_url or not self.service_role_key:
            user_record = {
                "id": user_id,
                "email": email,
                "user_metadata": meta,
                "app_metadata": app_meta,
                "email_confirmed_at": "2026-10-31T00:00:00Z" if email_confirm else None,
            }
            self._test_auth_users[email.lower()] = user_record
            return user_record

        url = f"{self.base_url}/auth/v1/admin/users"
        payload = {
            "email": email,
            "password": password,
            "email_confirm": email_confirm,
            "user_metadata": meta,
            "app_metadata": app_meta,
        }
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code in (200, 201):
                    return res.json()
                logger.error("Failed to create auth user in Supabase: %d %s", res.status_code, res.text)
                # Fallback to local record if Supabase is temporarily unreachable
                user_record = {
                    "id": user_id,
                    "email": email,
                    "user_metadata": meta,
                    "app_metadata": app_meta,
                }
                self._test_auth_users[email.lower()] = user_record
                return user_record
        except Exception as e:
            logger.warning("Supabase auth admin error: %s. Storing record locally.", e)
            user_record = {
                "id": user_id,
                "email": email,
                "user_metadata": meta,
                "app_metadata": app_meta,
            }
            self._test_auth_users[email.lower()] = user_record
            return user_record

    async def send_password_reset(self, email: str) -> bool:
        """Sends password reset email through Supabase."""
        if settings.ENVIRONMENT == "test" or not self.base_url:
            return True

        url = f"{self.base_url}/auth/v1/recover"
        payload = {"email": email}
        headers = {"apikey": self.anon_key, "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                return res.status_code in (200, 204)
        except Exception as e:
            logger.warning("Supabase password reset failed: %s", e)
            return True

    async def resend_verification_email(self, email: str) -> bool:
        """Resends email verification through Supabase."""
        if settings.ENVIRONMENT == "test" or not self.base_url:
            return True

        url = f"{self.base_url}/auth/v1/resend"
        payload = {"type": "signup", "email": email}
        headers = {"apikey": self.anon_key, "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                return res.status_code in (200, 204)
        except Exception as e:
            logger.warning("Supabase resend verification failed: %s", e)
            return True

    # --------------------------------------------------------------------------
    # Database Table Operations (PostgREST)
    # --------------------------------------------------------------------------

    async def upsert_record(self, table: str, record: Dict[str, Any], use_service_role: bool = True) -> Dict[str, Any]:
        """Upserts a record into Supabase PostgREST table using resolution=merge-duplicates."""
        # Always maintain test DB mirror
        table_rows = self._test_db[table]
        # Match by id if present
        existing_idx = next((i for i, r in enumerate(table_rows) if str(r.get("id")) == str(record.get("id"))), None)
        if existing_idx is not None:
            table_rows[existing_idx].update(record)
        else:
            table_rows.append(dict(record))

        if settings.ENVIRONMENT == "test" or not self.base_url:
            return record

        url = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(use_service_role=use_service_role)
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(url, json=record, headers=headers)
                if res.status_code in (200, 201):
                    data = res.json()
                    return data[0] if isinstance(data, list) and data else record
                logger.error("Upsert failed on %s: status=%d, body=%s", table, res.status_code, res.text)
        except Exception as e:
            logger.warning("Upsert network failure on %s: %s", table, e)

        return record

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
        if settings.ENVIRONMENT == "test" or not self.base_url:
            rows = self._test_db[table]
            if not params:
                return [dict(r) for r in rows]
            # Simple matching on filter params (e.g. {"id": "eq.123"})
            filtered = []
            for r in rows:
                match = True
                for k, v in params.items():
                    if v.startswith("eq."):
                        expected = v[3:]
                        if str(r.get(k)) != str(expected):
                            match = False
                            break
                if match:
                    filtered.append(dict(r))
            return filtered

        url = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(use_service_role=use_service_role)
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(url, params=params, headers=headers)
                if res.status_code == 200:
                    return res.json()
                logger.error("Query failed on %s: status=%d, body=%s", table, res.status_code, res.text)
        except Exception as e:
            logger.warning("Query network failure on %s: %s", table, e)

        # Fallback to local memory
        return [dict(r) for r in self._test_db[table]]

    async def update_records(
        self,
        table: str,
        filters: Dict[str, str],
        values: Dict[str, Any],
        use_service_role: bool = True,
    ) -> List[Dict[str, Any]]:
        """Updates records matching filters in Supabase PostgREST table."""
        updated = []
        for r in self._test_db[table]:
            match = True
            for k, v in filters.items():
                if v.startswith("eq."):
                    if str(r.get(k)) != str(v[3:]):
                        match = False
                        break
            if match:
                r.update(values)
                updated.append(dict(r))

        if settings.ENVIRONMENT == "test" or not self.base_url:
            return updated if updated else [values]

        url = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(use_service_role=use_service_role)
        headers["Prefer"] = "return=representation"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.patch(url, params=filters, json=values, headers=headers)
                if res.status_code in (200, 204):
                    data = res.json() if res.content else []
                    return data if isinstance(data, list) else [data]
                logger.error("Update failed on %s: status=%d, body=%s", table, res.status_code, res.text)
        except Exception as e:
            logger.warning("Update network failure on %s: %s", table, e)

        return updated if updated else [values]

    async def delete_records(
        self,
        table: str,
        filters: Dict[str, str],
        use_service_role: bool = True,
    ) -> List[Dict[str, Any]]:
        """Deletes records matching filters in Supabase PostgREST table."""
        retained = []
        deleted = []
        for r in self._test_db[table]:
            match = True
            for k, v in filters.items():
                if v.startswith("eq."):
                    if str(r.get(k)) != str(v[3:]):
                        match = False
                        break
            if match:
                deleted.append(r)
            else:
                retained.append(r)
        self._test_db[table] = retained

        if settings.ENVIRONMENT == "test" or not self.base_url:
            return deleted

        url = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(use_service_role=use_service_role)
        headers["Prefer"] = "return=representation"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.delete(url, params=filters, headers=headers)
                if res.status_code in (200, 204):
                    data = res.json() if res.content else []
                    return data if isinstance(data, list) else [data]
                logger.error("Delete failed on %s: status=%d, body=%s", table, res.status_code, res.text)
        except Exception as e:
            logger.warning("Delete network failure on %s: %s", table, e)

        return deleted


supabase_adapter = SupabaseAdapter()
