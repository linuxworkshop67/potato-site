// Keep the theme choice between visits when the browser allows local storage.
const themeButton = document.querySelector('#theme-toggle');
const page = document.body;

function setTheme(theme) {
  const isDark = theme === 'dark';
  page.dataset.theme = isDark ? 'dark' : 'light';
  document.documentElement.dataset.theme = page.dataset.theme;
  themeButton.setAttribute('aria-pressed', String(isDark));
  themeButton.textContent = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

let savedTheme = null;
try {
  savedTheme = localStorage.getItem('potato-site-theme');
} catch {
  // The page still works if storage is disabled by the browser.
}
setTheme(savedTheme === 'dark' ? 'dark' : 'light');

themeButton.addEventListener('click', () => {
  const nextTheme = page.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  try {
    localStorage.setItem('potato-site-theme', nextTheme);
  } catch {
    // Theme switching remains available for this visit without storage.
  }
});

const nutritionForm = document.querySelector('#nutrition-form');
const foodSelect = document.querySelector('#potato-type');
const gramsInput = document.querySelector('#potato-grams');
const message = document.querySelector('#nutrition-message');
const results = document.querySelector('#nutrition-results');
const resultsDescription = document.querySelector('#results-description');
const resultsBody = document.querySelector('#nutrition-results-body');
let nutritionFoods = [];

// Show friendly nutrient names and units instead of raw dataset field names.
const nutrientLabels = {
  energy_kcal: ['Calories', 'kcal'],
  water_g: ['Water', 'g'],
  carbohydrates_g: ['Carbohydrates', 'g'],
  sugars_g: ['Sugars', 'g'],
  fiber_g: ['Dietary fiber', 'g'],
  protein_g: ['Protein', 'g'],
  fat_g: ['Fat', 'g'],
  vitamin_c_mg: ['Vitamin C', 'mg'],
  vitamin_b6_mg: ['Vitamin B6', 'mg'],
  potassium_mg: ['Potassium', 'mg'],
  magnesium_mg: ['Magnesium', 'mg'],
  phosphorus_mg: ['Phosphorus', 'mg'],
  iron_mg: ['Iron', 'mg'],
  sodium_mg: ['Sodium', 'mg']
};

function showError(text) {
  message.textContent = text;
  message.classList.add('is-error');
}

// Read the supplied JSON file so estimates always come from the provided data.
fetch('potato_nutrition_dataset.json')
  .then((response) => {
    if (!response.ok) throw new Error('Could not load the nutrition data file.');
    return response.json();
  })
  .then((dataset) => {
    if (!Array.isArray(dataset.foods) || dataset.foods.length === 0) {
      throw new Error('The nutrition data file does not contain any food entries.');
    }
    nutritionFoods = dataset.foods;

    // Build the menu from the dataset, so its options stay in sync with the data.
    foodSelect.replaceChildren(...nutritionFoods.map((food) => {
      const option = document.createElement('option');
      option.value = food.id;
      option.textContent = food.name;
      return option;
    }));
    foodSelect.value = 'potato_boiled_skin';
    message.textContent = 'Enter a serving weight to see an estimate.';
  })
  .catch(() => {
    showError('Nutrition data could not be loaded. Open this page through a local web server and try again.');
    foodSelect.disabled = true;
    gramsInput.disabled = true;
    nutritionForm.querySelector('button[type="submit"]').disabled = true;
  });

nutritionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  message.classList.remove('is-error');

  // Reject blank, non-number, zero, negative, and unusually large amounts.
  const grams = gramsInput.valueAsNumber;
  if (gramsInput.value.trim() === '' || !Number.isFinite(grams)) {
    results.hidden = true;
    showError('Enter the amount in grams to calculate nutrition.');
    gramsInput.focus();
    return;
  }
  if (grams < 1 || grams > 10000) {
    results.hidden = true;
    showError('Enter an amount from 1 to 10,000 grams.');
    gramsInput.focus();
    return;
  }

  const food = nutritionFoods.find((item) => item.id === foodSelect.value);
  if (!food || !food.nutrients_per_100g) {
    results.hidden = true;
    showError('Choose a valid potato preparation.');
    foodSelect.focus();
    return;
  }

  // Each dataset amount is per 100 g, so multiply by this serving's scale.
  const servingScale = grams / 100;
  resultsBody.replaceChildren();
  Object.entries(food.nutrients_per_100g).forEach(([key, amountPer100g]) => {
    const labelAndUnit = nutrientLabels[key];
    if (!labelAndUnit || !Number.isFinite(amountPer100g)) return;

    const row = document.createElement('tr');
    const nameCell = document.createElement('th');
    const amountCell = document.createElement('td');
    nameCell.scope = 'row';
    nameCell.textContent = labelAndUnit[0];
    amountCell.textContent = `${(amountPer100g * servingScale).toLocaleString(undefined, {
      maximumFractionDigits: 2
    })} ${labelAndUnit[1]}`;
    row.append(nameCell, amountCell);
    resultsBody.append(row);
  });

  resultsDescription.textContent = `Estimated amounts for ${grams.toLocaleString()} g of ${food.name.toLowerCase()}.`;
  results.hidden = false;
  message.textContent = 'Nutrition estimate updated.';
});
