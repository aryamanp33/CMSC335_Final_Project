const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const path = require('path');

dotenv.config();
const app = express();
const PORT = process.argv[2] || process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_CONNECTION_STRING)
	.then(() => console.log('Connected to MongoDB'))
	.catch((err) => console.error('MongoDB connection error:', err));
const recipeSchema = new mongoose.Schema({
  label: String,
  image: String,
  url: String,
  ingredients: [String],
  calories: Number
});
const Recipe = mongoose.model('Recipe', recipeSchema);

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/recipes', (req, res) => {
  res.render('recipes', { recipes: null });
});

app.post('/recipes', async (req, res) => {
  const query = req.body.ingredients;
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(query)}&app_id=${appId}&app_key=${appKey}`;
  try {
    const response = await fetch(url, {
			headers: {
				'Edamam-Account-User': 'apunshi'
			}
		});
    const data = await response.json();  
    const recipes = data.hits.map(hit => hit.recipe);
    res.render('recipes', { recipes });
  } catch (err) {
    console.error('API error:', err);
    res.render('recipes', { recipes: [] });
  }
});

app.post('/save', async (req, res) => {
  const { label, image, url, ingredients, calories } = req.body;
  try {
    const recipe = new Recipe({
      label,
      image,
      url,
      ingredients: JSON.parse(ingredients),
      calories: parseFloat(calories)
    });
    await recipe.save();
    res.redirect('/saved');
  } catch (err) {
    console.error('Error saving:', err);
    res.redirect('/');
  }
});

app.get('/saved', async (req, res) => {
  try {
    const savedRecipes = await Recipe.find({});
    res.render('saved', { recipes: savedRecipes });
  } catch (err) {
    console.error('Error reading database:', err);
    res.render('saved', { recipes: [] });
  }
});

app.post('/delete/:id', async (req, res) => {
  try {
    await Recipe.findByIdAndDelete(req.params.id);
    res.redirect('/saved');
  } catch (err) {
    console.error('Error deleting:', err);
    res.redirect('/saved');
  }
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});