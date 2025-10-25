document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT: REPLACE WITH YOUR TMDB API KEY ---
    const apiKey = 'e7accc22bd3a23600b93d1b0a216cf49';
    // ------------------------------------------------

    // App State
    let lastUsedFetcher = null;
    let animationFrameId = null;

    // Page Elements
    const pages = document.querySelectorAll('.page');
    const landingPage = document.getElementById('landing-page');
    const suggesterPage = document.getElementById('suggester-page');
    const questionsPage = document.getElementById('questions-page');
    const suggestionPage = document.getElementById('suggestion-page');
    const root = document.documentElement;

    // Interactive Elements
    const startBtn = document.getElementById('start-btn');
    const genreGrid = document.getElementById('genre-grid');
    const helpBtn = document.getElementById('help-me-choose-btn');
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
        { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' },
        { id: 27, name: 'Horror' }, { id: 878, name: 'Sci-Fi' },
        { id: 53, name: 'Thriller' }, { id: 10749, name: 'Romance' }
    ];

    const questions = [
        { key: 'mood', text: 'What’s your mood?', answers: [
            { text: 'Bright & Uplifting', value: 'with_genres=35|12' },
            { text: 'Intense & Thoughtful', value: 'with_genres=18|53|9648' },
            { text: 'Exciting & Fast-Paced', value: 'with_genres=28|878' },
            { text: 'Heartfelt & Emotional', value: 'with_genres=10749|10751' }
        ]},
        { key: 'era', text: 'Classic or Modern?', answers: [
            { text: 'Timeless Classic (pre-2000s)', value: `primary_release_date.lte=1999-12-31` },
            { text: 'Modern Must-See (2000s-Now)', value: `primary_release_date.gte=2000-01-01` }
        ]},
        { key: 'acclaim', text: 'Top Rated or Any Gem?', answers: [
            { text: 'Critically Acclaimed', value: 'vote_average.gte=7.5' },
            { text: 'Anything Goes', value: 'vote_average.gte=0' }
        ]},
        { key: 'style', text: 'Animation or Live Action?', answers: [
            { text: 'Animation', value: 'with_genres=16' },
            { text: 'Live Action', value: 'without_genres=16' }
        ]},
        { key: 'origin', text: 'Where from?', answers: [
            { text: 'Hollywood Blockbuster', value: 'with_origin_country=US' },
            { text: 'International Flavor', value: '' }
        ]},
        { key: 'pacing', text: 'Quick watch or an epic journey?', answers: [
            { text: 'Short & Sweet (< 100min)', value: 'with_runtime.lte=100' },
            { text: 'An Epic Tale (> 150min)', value: 'with_runtime.gte=150' },
            { text: 'Standard Length', value: 'with_runtime.gte=100&with_runtime.lte=150' }
        ]}
    ];
    let currentQuestionIndex = 0;
    let questionnaireAnswers = {};
    
    // --- Optimized Landing Page Canvas Animation ---
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    const createParticles = () => {
        particles = [];
        const colors = ["#d0bcff", "#ccc2dc", "#4a4458", "#381e72"];
        for (let i = 0; i < 15; i++) { // Fewer particles for better performance
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.2, // Slower movement
                vy: (Math.random() - 0.5) * 0.2,
                radius: Math.random() * 100 + 50, // Slightly larger
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    };
    const animateCanvas = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x - p.radius < 0 || p.x + p.radius > canvas.width) p.vx *= -1;
            if (p.y - p.radius < 0 || p.y + p.radius > canvas.height) p.vy *= -1;
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.filter = 'blur(120px)'; // Increase blur for softer shapes
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        animationFrameId = requestAnimationFrame(animateCanvas);
    };
    const stopAnimation = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };
    window.addEventListener('resize', () => { resizeCanvas(); createParticles(); });
    
    // --- Navigation ---
    const switchToPage = (pageToShow) => {
        // --- ANIMATION CONTROL ---
        if (pageToShow === landingPage) {
            if (!animationFrameId) animateCanvas(); // Start animation if not running
        } else {
            stopAnimation(); // Stop animation on any other page
        }
        
        pages.forEach(p => p.classList.remove('active'));
        pageToShow.classList.add('active');
        document.body.style.backgroundColor = pageToShow === suggestionPage ? 'var(--dynamic-bg)' : 'var(--background-color)';
    };
    startBtn.addEventListener('click', () => switchToPage(suggesterPage));
    helpBtn.addEventListener('click', () => {
        currentQuestionIndex = 0; questionnaireAnswers = {};
        displayQuestion(); switchToPage(questionsPage);
    });
    backBtn.addEventListener('click', () => switchToPage(suggesterPage));
    tryAgainBtn.addEventListener('click', () => { if (lastUsedFetcher) lastUsedFetcher(); });

    // --- Questionnaire Logic ---
    const displayQuestion = () => {
        const question = questions[currentQuestionIndex];
        document.getElementById('question-text').textContent = question.text;
        const answersGrid = document.getElementById('answers-grid');
        answersGrid.innerHTML = '';
        question.answers.forEach(answer => {
            const card = document.createElement('div');
            card.className = 'genre-card';
            card.textContent = answer.text;
            card.addEventListener('click', () => handleAnswer(question.key, answer.value));
            answersGrid.appendChild(card);
        });
    };
    const handleAnswer = (key, value) => {
        if (value) questionnaireAnswers[key] = value;
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            displayQuestion();
        } else {
            handleQuestionnaireSelection();
        }
    };

    // --- API & Suggestion Logic ---
    const handleGenreSelection = (genreId) => {
        lastUsedFetcher = () => handleGenreSelection(genreId);
        fetchFromApi(`with_genres=${genreId}`).then(processMovieResults);
    };
    const handleQuestionnaireSelection = () => {
        lastUsedFetcher = handleQuestionnaireSelection;
        const query = Object.values(questionnaireAnswers).join('&');
        fetchFromApi(query).then(processMovieResults);
    };
    const processMovieResults = (movies) => {
        if (movies && movies.length > 0) {
            const randomMovie = movies[Math.floor(Math.random() * movies.length)];
            fetchMovieDetails(randomMovie.id).then(displaySuggestion);
            switchToPage(suggestionPage);
        } else {
            alert('No movies found with these criteria. Please try again!');
            switchToPage(suggesterPage);
        }
    };
    const fetchFromApi = async (queryString) => {
        if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY') { alert('Please add your TMDb API key to script.js'); return null; }
        try {
            const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&vote_count.gte=200&language=en-US&${queryString}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            const data = await response.json();
            return data.results;
        } catch (error) { console.error('Error fetching movies:', error); return null; }
    };
    const fetchMovieDetails = async (movieId) => {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=en-US`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Details request failed: ${response.status}`);
        return await response.json();
    };
    
    // --- UI Display & Helpers ---
    const adjustTitleFontSize = (element) => {
        const container = element.parentElement;
        let fontSize = 200;
        element.style.fontSize = fontSize + 'px';
        while ((element.scrollWidth > container.clientWidth || element.scrollHeight > container.clientHeight) && fontSize > 10) {
            fontSize--;
            element.style.fontSize = fontSize + 'px';
        }
        element.style.fontSize = (fontSize * 0.95) + 'px'; // Safety buffer
    };
    const displaySuggestion = (movie) => {
        moviePoster.src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
        moviePoster.onload = () => {
            try {
                const palette = colorThief.getPalette(moviePoster, 2);
                applyDynamicTheme(palette);
            } catch (e) { console.error("ColorThief error:", e); resetTheme(); }
        };
        movieTitle.textContent = movie.title;
        adjustTitleFontSize(movieTitle);
        movieRating.textContent = movie.vote_average.toFixed(1);
        movieOverview.textContent = movie.overview;
        movieRuntime.textContent = movie.runtime;
    };
    const applyDynamicTheme = (palette) => {
        const primaryColor = palette[0], accentColor = palette[1];
        const toRgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        const isDark = (c) => (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) < 128;
        root.style.setProperty('--dynamic-bg', toRgb(primaryColor));
        root.style.setProperty('--dynamic-accent', toRgb(accentColor));
        root.style.setProperty('--dynamic-card-bg', isDark(primaryColor) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--dynamic-primary-text', isDark(primaryColor) ? '#fff' : '#1c1b1f');
        root.style.setProperty('--dynamic-accent-text', isDark(accentColor) ? '#fff' : '#1c1b1f');
    };
    const resetTheme = () => {
        root.style.setProperty('--dynamic-bg', 'var(--background-color)');
        root.style.setProperty('--dynamic-card-bg', 'var(--card-color)');
        root.style.setProperty('--dynamic-primary-text', 'var(--text-color)');
        root.style.setProperty('--dynamic-accent-text', 'var(--primary-text)');
    };
    
    // --- Initial Setup ---
    genres.forEach(genre => {
        const card = document.createElement('div');
        card.className = 'genre-card';
        card.textContent = genre.name;
        card.addEventListener('click', () => handleGenreSelection(genre.id));
        genreGrid.appendChild(card);
    });
    
    // Initial page setup
    resizeCanvas();
    createParticles();
    animateCanvas();
});
