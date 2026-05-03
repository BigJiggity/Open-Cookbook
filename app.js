const config = window.OPEN_COOKBOOK_CONFIG || {};
const storageKey = config.storageKey || "open-cookbook:data:v1";

const state = {
  selectedRecipeId: "",
  recipes: []
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

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    state.recipes = Array.isArray(saved.recipes) ? saved.recipes : [];
    state.selectedRecipeId = saved.selectedRecipeId || state.recipes[0]?.id || "";
  } catch {
    state.recipes = [];
    state.selectedRecipeId = "";
  }

  if (state.recipes.length === 0) {
    const recipe = emptyRecipe();
    state.recipes = [recipe];
    state.selectedRecipeId = recipe.id;
    saveState();
  }
}

function saveState() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      selectedRecipeId: state.selectedRecipeId,
      recipes: state.recipes
    })
  );
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

function updateSelectedRecipe(patch) {
  const id = selectedRecipe()?.id;
  if (!id) return;

  state.recipes = state.recipes.map((recipe) =>
    recipe.id === id ? { ...recipe, ...patch, updatedAt: new Date().toISOString() } : recipe
  );
  saveState();
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
  }, 2400);
}

function addRecipe() {
  const recipe = emptyRecipe();
  state.recipes.unshift(recipe);
  state.selectedRecipeId = recipe.id;
  saveState();
  render();
}

function deleteRecipe() {
  const recipe = selectedRecipe();
  if (!recipe) return;
  const confirmed = window.confirm(`Delete "${recipe.name || "Untitled recipe"}"?`);
  if (!confirmed) return;

  state.recipes = state.recipes.filter((currentRecipe) => currentRecipe.id !== recipe.id);
  if (state.recipes.length === 0) {
    state.recipes = [emptyRecipe()];
  }
  state.selectedRecipeId = state.recipes[0].id;
  saveState();
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
  saveState();
  render();
  showStatus("Recipes imported.");
}

$("#new-recipe").addEventListener("click", addRecipe);
$("#delete-recipe").addEventListener("click", deleteRecipe);
$("#recipe-search").addEventListener("input", renderRecipeList);
$("#print-cookbook").addEventListener("click", () => window.print());
$("#print-recipe").addEventListener("click", () => window.print());
$("#export-json").addEventListener("click", exportJson);
$("#import-json").addEventListener("change", (event) => {
  importJson(event.target.files[0]).catch(() => showStatus("Import failed. Choose a valid backup JSON file."));
  event.target.value = "";
});

$("#recipe-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-recipe-id]");
  if (!button) return;
  state.selectedRecipeId = button.dataset.recipeId;
  saveState();
  render();
});

$("#recipe-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const ingredients = collectIngredients();
  const directions = collectDirections();
  updateSelectedRecipe({
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

loadState();
render();
