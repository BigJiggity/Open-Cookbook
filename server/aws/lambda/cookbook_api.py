import json
import os
from datetime import datetime, timezone

import boto3

TABLE_NAME = os.environ["TABLE_NAME"]
DOCUMENT_ID = os.environ.get("COOKBOOK_DOCUMENT_ID", "default")
TABLE = boto3.resource("dynamodb").Table(TABLE_NAME)


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def handler(event, _context):
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod")
    if method == "OPTIONS":
        return response(204, {})

    if method == "GET":
        item = TABLE.get_item(Key={"document_id": DOCUMENT_ID}).get("Item")
        return response(200, item.get("document", {"selectedRecipeId": "", "recipes": []}) if item else {"selectedRecipeId": "", "recipes": []})

    if method == "PUT":
        payload = json.loads(event.get("body") or "{}")
        if not isinstance(payload.get("recipes"), list):
            return response(400, {"message": "Invalid cookbook payload."})

        document = {
            "selectedRecipeId": payload.get("selectedRecipeId", ""),
            "recipes": payload["recipes"],
        }
        TABLE.put_item(
            Item={
                "document_id": DOCUMENT_ID,
                "document": document,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return response(200, {"ok": True})

    return response(405, {"message": "Method not allowed."})
