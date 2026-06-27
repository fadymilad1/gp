import json
import re
from urllib.parse import parse_qs, urlparse

import requests
from django.conf import settings

SPREADSHEET_ID_PATTERN = re.compile(r'/spreadsheets/d/([a-zA-Z0-9-_]+)')
DRIVE_FILE_ID_PATTERN = re.compile(r'/file/d/([a-zA-Z0-9-_]+)')
OPEN_ID_PATTERN = re.compile(r'[?&]id=([a-zA-Z0-9-_]+)')

SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SHEET_EXPORT_HEADERS = [
    'Product Name',
    'Category',
    'Price',
    'Stock Quantity',
    'Description',
    'Image',
]


class GoogleSheetAccessError(Exception):
    """Raised when a Google Sheet cannot be fetched or parsed."""


class GoogleSheetWriteError(GoogleSheetAccessError):
    """Raised when Medify cannot write back to a Google Sheet."""


def extract_spreadsheet_id(url: str) -> str | None:
    cleaned = (url or '').strip()
    if not cleaned:
        return None

    match = SPREADSHEET_ID_PATTERN.search(cleaned)
    if match:
        return match.group(1)

    match = DRIVE_FILE_ID_PATTERN.search(cleaned)
    if match:
        return match.group(1)

    match = OPEN_ID_PATTERN.search(cleaned)
    if match:
        return match.group(1)

    return None


def extract_gid(url: str) -> str:
    cleaned = (url or '').strip()
    if not cleaned:
        return '0'

    hash_match = re.search(r'#gid=(\d+)', cleaned)
    if hash_match:
        return hash_match.group(1)

    parsed = urlparse(cleaned)
    query_gid = parse_qs(parsed.query).get('gid', [])
    if query_gid and query_gid[0].isdigit():
        return query_gid[0]

    return '0'


def build_google_sheet_csv_export_url(url: str) -> str:
    spreadsheet_id = extract_spreadsheet_id(url)
    if not spreadsheet_id:
        raise GoogleSheetAccessError(
            'Could not find a Google Sheet ID in that URL. Paste a Google Sheets or Drive share link.'
        )

    gid = extract_gid(url)
    return f'https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv&gid={gid}'


def fetch_google_sheet_csv(url: str, timeout: int = 30) -> str:
    export_url = build_google_sheet_csv_export_url(url)

    try:
        response = requests.get(
            export_url,
            timeout=timeout,
            allow_redirects=True,
            headers={'User-Agent': 'MedifyProductImport/1.0'},
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise GoogleSheetAccessError(
            'Could not download the Google Sheet. Check the URL and your internet connection.'
        ) from exc

    content_type = (response.headers.get('Content-Type') or '').lower()
    text = response.text or ''

    if not text.strip():
        raise GoogleSheetAccessError('The Google Sheet appears to be empty.')

    if 'text/html' in content_type and 'product name' not in text.lower():
        raise GoogleSheetAccessError(
            'Could not access the sheet. Share it as "Anyone with the link can view" or "Anyone with the link can edit".'
        )

    return text


def google_sheets_write_configured() -> bool:
    return bool(settings.GOOGLE_SERVICE_ACCOUNT_FILE or settings.GOOGLE_SERVICE_ACCOUNT_JSON)


def get_service_account_email() -> str | None:
    if not google_sheets_write_configured():
        return None

    try:
        if settings.GOOGLE_SERVICE_ACCOUNT_JSON:
            info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
        else:
            with open(settings.GOOGLE_SERVICE_ACCOUNT_FILE, encoding='utf-8') as handle:
                info = json.load(handle)
        email = info.get('client_email')
        return str(email).strip() if email else None
    except Exception:
        return None


def get_google_sheets_service():
    if not google_sheets_write_configured():
        raise GoogleSheetWriteError(
            'Google Sheets write access is not configured on the server. '
            'Ask your administrator to set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_SERVICE_ACCOUNT_JSON.'
        )

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise GoogleSheetWriteError(
            'Google Sheets libraries are not installed on the server.'
        ) from exc

    if settings.GOOGLE_SERVICE_ACCOUNT_JSON:
        try:
            info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
        except json.JSONDecodeError as exc:
            raise GoogleSheetWriteError('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.') from exc
        credentials = service_account.Credentials.from_service_account_info(info, scopes=SHEETS_SCOPES)
    else:
        credentials = service_account.Credentials.from_service_account_file(
            settings.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes=SHEETS_SCOPES,
        )

    return build('sheets', 'v4', credentials=credentials)


def resolve_worksheet_title(spreadsheet_id: str, gid: str, service) -> str:
    try:
        metadata = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    except Exception as exc:
        raise GoogleSheetWriteError(
            'Could not open the Google Sheet for writing. '
            'Share the sheet with the Medify service account email as Editor.'
        ) from exc

    for sheet in metadata.get('sheets', []):
        properties = sheet.get('properties', {})
        if str(properties.get('sheetId')) == str(gid):
            return properties.get('title') or 'Sheet1'

    sheets = metadata.get('sheets', [])
    if sheets:
        return sheets[0]['properties'].get('title') or 'Sheet1'

    return 'Sheet1'


def products_to_sheet_rows(products) -> list[list[str]]:
    rows = [SHEET_EXPORT_HEADERS]
    for product in products:
        image_value = product.image_url or ''
        if not image_value and getattr(product, 'image', None):
            try:
                image_value = product.image.url
            except Exception:
                image_value = ''

        rows.append([
            product.name,
            product.category,
            str(product.price),
            str(product.stock),
            product.description or '',
            image_value,
        ])
    return rows


def pharmacy_sheet_push_available(pharmacy) -> bool:
    if not pharmacy:
        return False
    if pharmacy.google_sheet_webhook_url:
        return True
    return google_sheets_write_configured()


def push_products_via_webhook(webhook_url: str, rows: list[list[str]]) -> None:
    cleaned_url = (webhook_url or '').strip()
    if not cleaned_url:
        raise GoogleSheetWriteError('Google Sheet webhook URL is missing.')

    try:
        response = requests.post(
            cleaned_url,
            json={'rows': rows},
            timeout=60,
            headers={'Content-Type': 'application/json'},
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise GoogleSheetWriteError(
            'Could not push to your Google Sheet. Install the Medify Apps Script in your sheet, '
            'deploy it as a web app with access set to Anyone, then paste the deployment URL.'
        ) from exc

    try:
        payload = response.json()
    except ValueError:
        return

    if isinstance(payload, dict) and payload.get('ok') is False:
        raise GoogleSheetWriteError(payload.get('error') or 'Google Sheet webhook returned an error.')


def push_products_to_connected_sheet(pharmacy, products) -> None:
    rows = products_to_sheet_rows(products)

    if pharmacy.google_sheet_webhook_url:
        push_products_via_webhook(pharmacy.google_sheet_webhook_url, rows)
        return

    if not pharmacy.google_sheet_url:
        raise GoogleSheetWriteError('No Google Sheet URL is connected.')

    push_products_to_google_sheet(pharmacy.google_sheet_url, rows)


def push_products_to_google_sheet(sheet_url: str, rows: list[list[str]]) -> None:
    spreadsheet_id = extract_spreadsheet_id(sheet_url)
    if not spreadsheet_id:
        raise GoogleSheetWriteError('Could not find a Google Sheet ID in the connected URL.')

    gid = extract_gid(sheet_url)
    service = get_google_sheets_service()
    worksheet_title = resolve_worksheet_title(spreadsheet_id, gid, service)
    sheet_range = f"'{worksheet_title}'!A:Z"

    try:
        service.spreadsheets().values().clear(
            spreadsheetId=spreadsheet_id,
            range=sheet_range,
        ).execute()
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"'{worksheet_title}'!A1",
            valueInputOption='RAW',
            body={'values': rows},
        ).execute()
    except Exception as exc:
        raise GoogleSheetWriteError(
            'Could not write products to Google Sheet. '
            'Share the sheet with the Medify service account email as Editor.'
        ) from exc
