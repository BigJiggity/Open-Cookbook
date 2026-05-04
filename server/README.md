# Server Backends

Open Cookbook uses the same API shape for every backend:

- `GET` returns `{ selectedRecipeId, recipes }`
- `PUT` saves `{ selectedRecipeId, recipes }`

The browser does not persist recipes to local browser cache.

## Backends

- `aws/`: Python Lambda handler that stores the document in DynamoDB.
- `azure/`: Node Azure Functions handler that stores the document in Azure Table Storage.
- `local/`: PHP API that stores the document in MariaDB.
