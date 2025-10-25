document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT: REPLACE WITH YOUR TMDB API KEY ---
    const apiKey = 'e7accc22bd3a23600b93d1b0a216cf49'; 
    // ------------------------------------------------

    let currentGenreId = null;
    let movieCache = {};

    const suggesterPage = document.getElementById('suggester-page');
    const suggestionPage = document.getElementById('suggestion-page');
    const root = document.documentElement;
    const genreGrid = document.getElementById('genre-grid');
    const moviePoster = document.getElementById('movie-poster');
    const movieTitle = document.getElementById('movie-title');
    const movieRating = document.getElementById('movie-rating');
    const movieOverview = document.getElementById('movie-overview');
    const movieRuntime = document.getElementById('movie-runtime');
    const tryAgainBtn = document.getElementById('try-again-btn');
    const backBtn = document.getElementById('back-btn');

    const colorThief = new ColorThief();

    const genres = [
        { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' },
        { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' },
        { id: 18, name: 'Drama' }, { id: 10751, name: 'Family' },
        { id: 14, name: 'Fantasy' }, { id: 36, name: 'History' },
        { id: 27, name: 'Horror' }, { id: 9648, name: 'Mystery' },
        { id: 10749, name: 'Romance' }, { id: 878, name: 'Sci-Fi' },
        { id: 53, name: 'Thriller' }
    ];

    function renderGenreButtons() {
        genreGrid.innerHTML = '';
        genres.forEach(genre => {
            const card = document.createElement('div');
            card.className = 'genre-card';
            card.textContent = genre.name;
            card.addEventListener('click', () => handleGenreSelection(genre.id));
            genreGrid.appendChild(card);
        });
    }

    async function handleGenreSelection(genreId) {
        if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY') {
            alert('Please add your TMDb API key to script.js');
            return;
        }
        
        currentGenreId = genreId;
        
        try {
            const movies = await fetchMoviesByGenre(genreId);
            if (movies && movies.length > 0) {
                const randomMovieSummary = movies[Math.floor(Math.random() * movies.length)];
                const fullMovieDetails = await fetchMovieDetails(randomMovieSummary.id);
                displaySuggestion(fullMovieDetails);
                switchToPage(suggestionPage);
            } else {
                alert('Could not find a movie for this genre. Please try another.');
            }
        } catch (error) {
            console.error('Error handling genre selection:', error);
            alert('An error occurred. Please check the console for details.');
        }
    }
    
    tryAgainBtn.addEventListener('click', () => {
        if (currentGenreId) handleGenreSelection(currentGenreId);
    });

    backBtn.addEventListener('click', () => {
        resetTheme();
        switchToPage(suggesterPage);
    });

    async function fetchMoviesByGenre(genreId) {
        if (movieCache[genreId]) return movieCache[genreId];
        
        const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=200&language=en-US&page=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        const data = await response.json();
        movieCache[genreId] = data.results;
        return data.results;
    }

    async function fetchMovieDetails(movieId) {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=en-US`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API request for details failed: ${response.status}`);
        return await response.json();
    }
    
    function adjustTitleFontSize(element) {
        const container = element.parentElement;
        let fontSize = 200;

        element.style.fontSize = fontSize + 'px';

        while ((element.scrollWidth > container.clientWidth || element.scrollHeight > container.clientHeight) && fontSize > 10) {
            fontSize--;
            element.style.fontSize = fontSize + 'px';
        }
        
        // --- CLIPPING FIX ---
        // Apply a final safety buffer to prevent any clipping
        element.style.fontSize = (fontSize - 2) + 'px';
    }

    function displaySuggestion(movie) {
        const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
        moviePoster.src = posterUrl;
        
        moviePoster.onload = () => {
            try {
                const palette = colorThief.getPalette(moviePoster, 2);
                applyDynamicTheme(palette);
            } catch (e) {
                console.error("ColorThief error:", e);
                resetTheme(); 
            }
        };
        
        movieTitle.textContent = movie.title;
        adjustTitleFontSize(movieTitle);

        movieRating.textContent = movie.vote_average.toFixed(1);
        movieOverview.textContent = movie.overview;
        movieRuntime.textContent = movie.runtime;
    }
    
    function applyDynamicTheme(palette) {
        const primaryColor = palette[0];
        const accentColor = palette[1];

        const toRgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        const isDark = (c) => (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) < 128;

        const primaryRgb = toRgb(primaryColor);
        const accentRgb = toRgb(accentColor);
        
        root.style.setProperty('--dynamic-bg', primaryRgb);
        root.style.setProperty('--dynamic-accent', accentRgb);
        root.style.setProperty('--dynamic-card-bg', isDark(primaryColor) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--dynamic-primary-text', isDark(primaryColor) ? '#ffffff' : '#212121');
        
        // Intelligent text color for accent backgrounds
        root.style.setProperty('--dynamic-accent-text', isDark(accentColor) ? '#ffffff' : '#212121');
    }

    function resetTheme() {
        root.style.setProperty('--dynamic-bg', 'var(--background-color)');
        root.style.setProperty('--dynamic-card-bg', 'var(--card-color)');
        root.style.setProperty('--dynamic-primary-text', 'var(--text-color)');
        root.style.setProperty('--dynamic-secondary-text', 'rgba(255, 255, 255, 0.7)');
        root.style.setProperty('--dynamic-accent', 'var(--primary-color)');
        root.style.setProperty('--dynamic-accent-text', 'var(--text-color)');
    }
    
    function switchToPage(pageToShow) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        pageToShow.classList.add('active');

        document.body.style.backgroundColor = pageToShow === suggestionPage 
            ? 'var(--dynamic-bg)' 
            : 'var(--background-color)'; 
    }

    renderGenreButtons();
    suggesterPage.classList.add('active');
});