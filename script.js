document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const guessInput = document.getElementById('guess-input');
    const suggestionsBox = document.getElementById('suggestions-box');
    const submitButton = document.getElementById('submit-guess');
    const gridBody = document.getElementById('grid-body');
    const modal = document.getElementById('game-over-modal');
    const modalMessage = document.getElementById('game-over-message');
    const playAgainButton = document.getElementById('play-again-button');
    const winnerPokemonImage = document.getElementById('winner-pokemon-image');
    const themeSwitcher = document.getElementById('theme-switcher');
    
    // --- Game State ---
    let secretPokemon = null;
    let isGameOver = false;
    let guessedNames = new Set();
    let currentTheme = 'default';

    // --- UPDATED HELPER FUNCTION FOR IMAGES ---
    // This function returns the correct image URL based on the current theme.
    const getPokemonImageUrl = (id) => {
        const paddedId = String(id).padStart(3, '0');
        if (currentTheme === 'pokedex') {
            // Use 8-bit sprites from the official sprite repository
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
        } else {
            // Use high-res official artwork
            return `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${paddedId}.png`;
        }
    };

    // --- THEME SWITCHING LOGIC ---
    function applyTheme(theme) {
        currentTheme = theme; // Update the global theme variable
        if (theme === 'pokedex') {
            document.body.classList.add('theme-pokedex');
        } else {
            document.body.classList.remove('theme-pokedex');
        }
        localStorage.setItem('pokedle_theme', theme);
        redrawGridWithNewImages(); // Redraw the grid to update sprites
    }

    // NEW: Function to redraw the grid when the theme changes
    function redrawGridWithNewImages() {
        gridBody.innerHTML = ''; // Clear the existing grid
        const reversedGuesses = Array.from(guessedNames).reverse();
        reversedGuesses.forEach(name => {
            const pokemon = ALL_POKEMON_DATA.find(p => p.name === name);
            if (pokemon) {
                displayGuessRow(pokemon);
            }
        });
    }

    function toggleTheme() {
        const newTheme = currentTheme === 'default' ? 'pokedex' : 'default';
        applyTheme(newTheme);
    }

    themeSwitcher.addEventListener('click', toggleTheme);

    // --- Game Initialization ---
    function initGame() {
        // Load saved theme on startup
        const savedTheme = localStorage.getItem('pokedle_theme') || 'default';
        applyTheme(savedTheme);

        secretPokemon = ALL_POKEMON_DATA[Math.floor(Math.random() * ALL_POKEMON_DATA.length)];
        console.log("Secret Pokémon:", secretPokemon.name);
        isGameOver = false;
        guessedNames.clear();
        gridBody.innerHTML = '';
        guessInput.value = '';
        guessInput.disabled = false;
        submitButton.disabled = false;
        modal.classList.add('modal-hidden');
    }

    // --- Autocomplete Suggestions ---
    function updateSuggestions() {
        const query = guessInput.value.toLowerCase();
        suggestionsBox.innerHTML = '';
        const filteredPokemon = ALL_POKEMON_DATA.filter(p => {
            const hasNotBeenGuessed = !guessedNames.has(p.name);
            const matchesQuery = p.name.toLowerCase().startsWith(query);
            return hasNotBeenGuessed && (query.length === 0 || matchesQuery);
        });

        filteredPokemon.forEach(pokemon => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <img src="${getPokemonImageUrl(pokemon.id)}" alt="${pokemon.name}">
                <span>${pokemon.name}</span>
            `;
            div.addEventListener('click', () => {
                guessInput.value = pokemon.name;
                suggestionsBox.innerHTML = '';
            });
            suggestionsBox.appendChild(div);
        });
    }

    guessInput.addEventListener('focus', updateSuggestions);
    guessInput.addEventListener('input', updateSuggestions);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            suggestionsBox.innerHTML = '';
        }
    });

    // --- Guess Handling ---
    function handleGuess() {
        if (isGameOver) return;
        const guessName = guessInput.value.toUpperCase();
        const guessedPokemon = ALL_POKEMON_DATA.find(p => p.name === guessName);

        if (!guessedPokemon) {
            alert("Pokémon not found! Please choose from the list.");
            return;
        }
        if (guessedNames.has(guessName)) {
            alert("You've already guessed that Pokémon!");
            return;
        }

        guessedNames.add(guessName);
        displayGuessRow(guessedPokemon);

        if (guessedPokemon.name === secretPokemon.name) {
            endGame(true);
        }

        guessInput.value = '';
        suggestionsBox.innerHTML = '';
        guessInput.blur();
    }

    submitButton.addEventListener('click', handleGuess);
    guessInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleGuess();
    });

    // --- Display and Comparison Logic ---
    const createCell = (value, className = '') => {
        const cell = document.createElement('div');
        cell.className = `grid-cell ${className}`;
        cell.innerHTML = value;
        return cell;
    };

    function displayGuessRow(guessedPokemon) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        const pokemonCellContent = `
            <img src="${getPokemonImageUrl(guessedPokemon.id)}" alt="${guessedPokemon.name}">
            <span>${guessedPokemon.name}</span>
        `;
        row.appendChild(createCell(pokemonCellContent, 'pokemon-cell'));
        row.appendChild(createCell(guessedPokemon.generation, guessedPokemon.generation === secretPokemon.generation ? 'correct' : 'incorrect'));
        const [type1Cell, type2Cell] = compareTypes(guessedPokemon, secretPokemon);
        row.appendChild(type1Cell);
        row.appendChild(type2Cell);
        row.appendChild(compareAttribute(guessedPokemon.height, secretPokemon.height, 'm'));
        row.appendChild(compareAttribute(guessedPokemon.weight, secretPokemon.weight, 'kg'));
        row.appendChild(compareAttribute(guessedPokemon.evolutionStage, secretPokemon.evolutionStage, ''));
        gridBody.prepend(row);
    }

    function compareTypes(guessed, secret) {
        const secretTypes = [secret.type1, secret.type2].filter(Boolean);
        const createTypeCell = (type, status) => createCell(type || '---', status);
        let t1_status = 'incorrect';
        if (guessed.type1 === secret.type1) t1_status = 'correct';
        else if (secretTypes.includes(guessed.type1)) t1_status = 'partial';
        let t2_status = 'incorrect';
        if (guessed.type2 === secret.type2) t2_status = 'correct';
        else if (secretTypes.includes(guessed.type2)) t2_status = 'partial';
        return [createTypeCell(guessed.type1, t1_status), createTypeCell(guessed.type2, t2_status)];
    }

    function compareAttribute(guessedValue, secretValue, unit) {
        let status = 'incorrect';
        let arrow = '';
        if (guessedValue === secretValue) {
            status = 'correct';
        } else if (guessedValue < secretValue) {
            arrow = '<span>⬆️</span>';
        } else {
            arrow = '<span>⬇️</span>';
        }
        return createCell(`${guessedValue}${unit} ${arrow}`, status);
    }
    
    // --- End Game Logic ---
    function endGame(isWin) {
        isGameOver = true;
        guessInput.disabled = true;
        submitButton.disabled = true;
        setTimeout(() => {
            if (isWin) {
                winnerPokemonImage.src = getPokemonImageUrl(secretPokemon.id);
                winnerPokemonImage.alt = secretPokemon.name;
                modalMessage.innerHTML = `Gotcha! You caught <strong>${secretPokemon.name}</strong>!`;
            }
            modal.classList.remove('modal-hidden');
        }, 1000);
    }

    playAgainButton.addEventListener('click', initGame);

    initGame();
});