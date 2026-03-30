from typing import Any, Dict, List

import meilisearch

from app.core.config import get_settings

settings = get_settings()


class SearchService:
    def __init__(self) -> None:
        self.client = meilisearch.Client(settings.meili_url, settings.meili_master_key)

    def _apply_index_settings(self) -> None:
        index = self.client.index(settings.meili_index_name)
        settings_task = index.update_settings(
            {
                # Meilisearch uses BM25-style scoring internally; these ranking rules
                # keep relevance behavior explicit and stable across deployments.
                "rankingRules": ["words", "typo", "proximity", "attribute", "sort", "exactness"],
                "searchableAttributes": [
                    "text",
                    "filename",
                    "reference",
                    "extracted_reference",
                    "supplier",
                    "department",
                    "document_type",
                ],
                "filterableAttributes": [
                    "status",
                    "department",
                    "document_type",
                    "supplier",
                    "document_year",
                ],
                "displayedAttributes": [
                    "id",
                    "filename",
                    "status",
                    "reference",
                    "extracted_reference",
                    "department",
                    "document_type",
                    "supplier",
                    "document_year",
                    "storage_url",
                    "text",
                ],
                "typoTolerance": {
                    "enabled": True,
                    "disableOnWords": [],
                    "disableOnAttributes": ["document_year"],
                },
            }
        )
        self.client.wait_for_task(settings_task.task_uid)

    def ensure_index(self) -> None:
        try:
            self.client.get_index(settings.meili_index_name)
        except Exception:
            task = self.client.create_index(settings.meili_index_name, {"primaryKey": "id"})
            self.client.wait_for_task(task.task_uid)
        self._apply_index_settings()

    def upsert_document(self, payload: Dict[str, Any]) -> None:
        index = self.client.index(settings.meili_index_name)
        task = index.add_documents([payload])
        self.client.wait_for_task(task.task_uid)

    def search(self, query: str) -> List[Dict[str, Any]]:
        index = self.client.index(settings.meili_index_name)
        result = index.search(query, {"limit": 20})
        return result.get("hits", [])
