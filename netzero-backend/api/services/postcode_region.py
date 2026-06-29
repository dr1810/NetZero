import logging
import re
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# Supports standard UK postcode formats with or without embedded space.
UK_POSTCODE_RE = re.compile(
    r"^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$",
    re.IGNORECASE,
)

# Fallback map for known onboarding dataset and offline/test environments.
OUTWARD_TO_REGION_ID = {
    "EC1A": "13",
    "E16": "13",
    "IV1": "1",
    "EH1": "2",
    "G1": "2",
    "M1": "3",
    "NE1": "4",
    "S1": "5",
    "B1": "8",
    "NG1": "9",
    "LL11": "6",
    "CF10": "7",
    "CB1": "10",
    "BS1": "11",
    "SO14": "12",
    "BN1": "14",
}


def normalize_postcode(postcode: str) -> str:
    normalized = (postcode or "").strip().upper()
    normalized = re.sub(r"\s+", "", normalized)
    if len(normalized) > 3:
        normalized = f"{normalized[:-3]} {normalized[-3:]}"
    return normalized


def validate_postcode_format(postcode: str) -> bool:
    return bool(UK_POSTCODE_RE.match((postcode or "").strip().upper()))


def extract_outward_code(postcode: str) -> str:
    normalized = normalize_postcode(postcode)
    return normalized.split(" ")[0]


def fallback_region_id_from_postcode(postcode: str) -> Optional[str]:
    return OUTWARD_TO_REGION_ID.get(extract_outward_code(postcode))


def map_postcode_to_region_id(
    postcode: str,
    timeout: float = 6.0,
    http_client=requests,
) -> Optional[str]:
    outward_code = extract_outward_code(postcode)
    fallback_region_id = OUTWARD_TO_REGION_ID.get(outward_code)
    if fallback_region_id:
        return fallback_region_id

    endpoint = f"https://api.carbonintensity.org.uk/regional/postcode/{outward_code}"

    try:
        response = http_client.get(endpoint, timeout=timeout)
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data") or []
        if data:
            region_id = data[0].get("regionid") or data[0].get("regionId")
            if region_id is not None:
                return str(region_id)
    except requests.RequestException as exc:
        logger.warning(
            "Failed ESO postcode-region lookup for postcode=%s outward=%s: %s",
            postcode,
            outward_code,
            exc,
        )
    except (TypeError, ValueError, KeyError) as exc:
        logger.warning(
            "Malformed ESO postcode response for postcode=%s outward=%s: %s",
            postcode,
            outward_code,
            exc,
        )

    fallback_region_id = fallback_region_id_from_postcode(postcode)
    if fallback_region_id:
        logger.info(
            "Using fallback postcode-region mapping for postcode=%s outward=%s region=%s",
            postcode,
            outward_code,
            fallback_region_id,
        )
    return fallback_region_id
