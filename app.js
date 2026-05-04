const config = window.OPEN_COOKBOOK_CONFIG || {};
const apiUrl = config.apiBaseUrl || "/api/cookbook.php";

const state = {
  selectedRecipeId: "",
  recipes: [],
  isLoaded: false
};

const $ = (selector) => document.querySelector(selector);

function emptyRecipe() {
  return {
    id: crypto.randomUUID(),
    name: "New recipe",
    ingredients: [{ amount: "", item: "" }],
    directions: [""],
    notes: "",
    updatedAt: new Date().toISOString()
  };
}

function defaultCookbookState() {
  const recipe = emptyRecipe();
  return {
    selectedRecipeId: recipe.id,
    recipes: [recipe]
  };
}

async function apiRequest(method, body) {
  const response = await fetch(apiUrl, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `API request failed with ${response.status}`);
  }
  return payload;
}

async function loadState() {
  const saved = await apiRequest("GET");
  state.recipes = Array.isArray(saved.recipes) ? saved.recipes : [];
  state.selectedRecipeId = saved.selectedRecipeId || state.recipes[0]?.id || "";

  if (state.recipes.length === 0) {
    const initialState = defaultCookbookState();
    state.recipes = initialState.recipes;
    state.selectedRecipeId = initialState.selectedRecipeId;
    await saveState();
  }

  state.isLoaded = true;
}

async function saveState() {
  await apiRequest("PUT", {
    selectedRecipeId: state.selectedRecipeId,
    recipes: state.recipes
  });
}

function selectedRecipe() {
  return state.recipes.find((recipe) => recipe.id === state.selectedRecipeId) || state.recipes[0] || null;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function recipeMatchesSearch(recipe, query) {
  if (!query) return true;
  const searchable = [
    recipe.name,
    recipe.notes,
    ...(recipe.ingredients || []).flatMap((ingredient) => [ingredient.amount, ingredient.item]),
    ...(recipe.directions || [])
  ].join(" ");
  return normalize(searchable).includes(query);
}

function renderRecipeList() {
  const query = normalize($("#recipe-search").value);
  const recipes = state.recipes
    .filter((recipe) => recipeMatchesSearch(recipe, query))
    .sort((left, right) => normalize(left.name).localeCompare(normalize(right.name)));

  $("#recipe-list").innerHTML = recipes.length
    ? recipes
        .map(
          (recipe) => `
            <button type="button" data-recipe-id="${recipe.id}" class="${recipe.id === state.selectedRecipeId ? "active" : ""}">
              ${escapeHtml(recipe.name || "Untitled recipe")}
            </button>
          `
        )
        .join("")
    : "<p>No recipes match this search.</p>";
}

function ingredientRow(ingredient, index) {
  const template = $("#ingredient-template").content.cloneNode(true);
  const row = template.querySelector(".row");
  row.dataset.index = index;
  row.querySelector('[data-field="amount"]').value = ingredient.amount || "";
  row.querySelector('[data-field="item"]').value = ingredient.item || "";
  return row;
}

function directionRow(text, index) {
  const template = $("#direction-template").content.cloneNode(true);
  const row = template.querySelector(".row");
  row.dataset.index = index;
  row.querySelector('[data-field="text"]').value = text || "";
  return row;
}

function renderEditor() {
  const recipe = selectedRecipe();
  if (!recipe) return;

  $("#recipe-name").value = recipe.name || "";
  $("#recipe-notes").value = recipe.notes || "";
  $("#ingredients").replaceChildren(...(recipe.ingredients || []).map(ingredientRow));
  $("#directions").replaceChildren(...(recipe.directions || []).map(directionRow));
}

function render() {
  $("#cookbook-title").textContent = config.cookbookTitle || "Open Cookbook";
  document.title = config.cookbookTitle || "Open Cookbook";
  renderRecipeList();
  renderEditor();
}

async function updateSelectedRecipe(patch) {
  const id = selectedRecipe()?.id;
  if (!id) return;

  state.recipes = state.recipes.map((recipe) =>
    recipe.id === id ? { ...recipe, ...patch, updatedAt: new Date().toISOString() } : recipe
  );
  await saveState();
  renderRecipeList();
}

function collectIngredients() {
  return Array.from($("#ingredients").querySelectorAll(".row"))
    .map((row) => ({
      amount: row.querySelector('[data-field="amount"]').value,
      item: row.querySelector('[data-field="item"]').value
    }))
    .filter((ingredient) => ingredient.amount.trim() || ingredient.item.trim());
}

function collectDirections() {
  return Array.from($("#directions").querySelectorAll(".row"))
    .map((row) => row.querySelector('[data-field="text"]').value)
    .filter((step) => step.trim());
}

function showStatus(message) {
  $("#status").textContent = message;
  window.setTimeout(() => {
    if ($("#status").textContent === message) $("#status").textContent = "";
  }, 3000);
}

async function addRecipe() {
  const recipe = emptyRecipe();
  state.recipes.unshift(recipe);
  state.selectedRecipeId = recipe.id;
  await saveState();
  render();
}

async function deleteRecipe() {
  const recipe = selectedRecipe();
  if (!recipe) return;
  const confirmed = window.confirm(`Delete "${recipe.name || "Untitled recipe"}"?`);
  if (!confirmed) return;

  state.recipes = state.recipes.filter((currentRecipe) => currentRecipe.id !== recipe.id);
  if (state.recipes.length === 0) {
    state.recipes = [emptyRecipe()];
  }
  state.selectedRecipeId = state.recipes[0].id;
  await saveState();
  render();
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    cookbookTitle: config.cookbookTitle || "Open Cookbook",
    recipes: state.recipes
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "open-cookbook-backup.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importJson(file) {
  if (!file) return;
  const payload = JSON.parse(await file.text());
  const recipes = Array.isArray(payload.recipes) ? payload.recipes : [];
  if (recipes.length === 0) {
    showStatus("No recipes found in the selected file.");
    return;
  }
  state.recipes = recipes;
  state.selectedRecipeId = recipes[0].id;
  await saveState();
  render();
  showStatus("Recipes imported.");
}

$("#new-recipe").addEventListener("click", () => addRecipe().catch((error) => showStatus(error.message)));
$("#delete-recipe").addEventListener("click", () => deleteRecipe().catch((error) => showStatus(error.message)));
$("#recipe-search").addEventListener("input", renderRecipeList);
$("#print-cookbook").addEventListener("click", () => window.print());
$("#print-recipe").addEventListener("click", () => window.print());
$("#export-json").addEventListener("click", exportJson);
$("#import-json").addEventListener("change", (event) => {
  importJson(event.target.files[0]).catch(() => showStatus("Import failed. Choose a valid backup JSON file."));
  event.target.value = "";
});

$("#recipe-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-recipe-id]");
  if (!button) return;
  state.selectedRecipeId = button.dataset.recipeId;
  await saveState();
  render();
});

$("#recipe-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const ingredients = collectIngredients();
  const directions = collectDirections();
  await updateSelectedRecipe({
    name: $("#recipe-name").value.trim() || "Untitled recipe",
    ingredients: ingredients.length ? ingredients : [{ amount: "", item: "" }],
    directions: directions.length ? directions : [""],
    notes: $("#recipe-notes").value
  });
  renderEditor();
  showStatus("Recipe saved.");
});

$("#add-ingredient").addEventListener("click", () => {
  $("#ingredients").append(ingredientRow({ amount: "", item: "" }, $("#ingredients").children.length));
});

$("#add-step").addEventListener("click", () => {
  $("#directions").append(directionRow("", $("#directions").children.length));
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-row");
  if (!button) return;
  const row = button.closest(".row");
  row.remove();
});

loadState()
  .then(render)
  .catch((error) => {
    showStatus(`Storage backend unavailable: ${error.message}`);
    $("#recipe-list").innerHTML = "<p>Storage backend unavailable.</p>";
  });
