import { app } from "@azure/functions";
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";

function tableClient() {
  const account = process.env.STORAGE_ACCOUNT_NAME;
  const key = process.env.STORAGE_ACCOUNT_KEY;
  const tableName = process.env.TABLE_NAME || "cookbook";
  const credential = new AzureNamedKeyCredential(account, key);
  return new TableClient(`https://${account}.table.core.windows.net`, tableName, credential);
}

function emptyDocument() {
  return { selectedRecipeId: "", recipes: [] };
}

app.http("cookbook", {
  methods: ["GET", "PUT", "OPTIONS"],
  authLevel: "anonymous",
  route: "cookbook",
  handler: async (request) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return { status: 204, headers };
    }

    const client = tableClient();
    await client.createTable().catch(() => {});

    if (request.method === "GET") {
      try {
        const entity = await client.getEntity("cookbook", "default");
        return { status: 200, headers, jsonBody: JSON.parse(entity.documentJson) };
      } catch {
        return { status: 200, headers, jsonBody: emptyDocument() };
      }
    }

    if (request.method === "PUT") {
      const payload = await request.json();
      if (!Array.isArray(payload.recipes)) {
        return { status: 400, headers, jsonBody: { message: "Invalid cookbook payload." } };
      }
      await client.upsertEntity({
        partitionKey: "cookbook",
        rowKey: "default",
        documentJson: JSON.stringify({
          selectedRecipeId: payload.selectedRecipeId || "",
          recipes: payload.recipes
        }),
        updatedAt: new Date().toISOString()
      });
      return { status: 200, headers, jsonBody: { ok: true } };
    }

    return { status: 405, headers, jsonBody: { message: "Method not allowed." } };
  }
});
