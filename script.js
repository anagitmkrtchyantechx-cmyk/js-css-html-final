const API_KEY = '21909f03a0c296b71ea309b75d5c088a'; // <<< REPLACE WITH YOUR KEY
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const movieGrid = document.getElementById('movie-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
const sortBySelect = document.getElementById('sort-by');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const genreTagsContainer = document.getElementById('genre-tags-container');

let currentPage = 1;
let currentSortBy = sortBySelect.value;
let selectedGenres = [];

// --- API FETCH FUNCTIONS ---

/**
 * Fetches popular movies from TMDB API.
 * @param {number} page - The page number to fetch.
 * @param {string} sortBy - The sorting parameter.
 * @param {object} filters - The filter parameters (e.g., release dates, genres).
 */
async function fetchPopularMovies(page, sortBy, filters = {}) {
    const params = new URLSearchParams({
        api_key: API_KEY,
        language: 'en-US',
        page: page,
        sort_by: sortBy,
        // Add filters to the parameters
        ...filters
    });

    try {
        const response = await fetch(`${BASE_URL}/discover/movie?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not fetch popular movies:", error);
        // Handle error state in UI (e.g., display error message)
        return { results: [], total_pages: 0 };
    }
}

/**
 * Fetches the list of movie genres.
 */
async function fetchGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();
        return data.genres;
    } catch (error) {
        console.error("Could not fetch genres:", error);
        return [];
    }
}


// --- UI RENDERING FUNCTIONS ---

/**
 * Creates and appends a single movie card to the grid.
 * @param {object} movie - The movie object from the API.
 */
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.classList.add('movie-card');

    const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'placeholder.png';
    const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'TBA';
    
    // Calculate rating for the circle
    const rating = Math.round(movie.vote_average * 10);
    let ratingClass = 'low'; // Default
    if (rating >= 70) {
        ratingClass = 'high';
    } else if (rating >= 40) {
        ratingClass = 'medium';
    }

    card.innerHTML = `
        <img src="${posterPath}" alt="${movie.title} Poster" onerror="this.onerror=null;this.src='https://via.placeholder.com/180x270?text=No+Poster'">
        <div class="movie-info">
            <div class="rating-circle ${ratingClass}">
                ${rating}%
            </div>
            <h4>${movie.title}</h4>
            <p>${releaseDate}</p>
        </div>
    `;

    movieGrid.appendChild(card);
}

/**
 * Renders the list of genres as clickable tags.
 * @param {Array<object>} genres - The list of genre objects.
 */
function renderGenres(genres) {
    genres.forEach(genre => {
        const tag = document.createElement('span');
        tag.classList.add('genre-tag');
        tag.dataset.genreId = genre.id;
        tag.textContent = genre.name;
        tag.addEventListener('click', toggleGenreFilter);
        genreTagsContainer.appendChild(tag);
    });
}

// --- LOGIC AND EVENT HANDLERS ---

/**
 * Toggles a genre ID in the selectedGenres array and updates the UI.
 * @param {Event} event - The click event.
 */
function toggleGenreFilter(event) {
    const tag = event.target;
    const genreId = tag.dataset.genreId;
    
    const index = selectedGenres.indexOf(genreId);
    
    if (index > -1) {
        selectedGenres.splice(index, 1); // Remove
        tag.classList.remove('active');
    } else {
        selectedGenres.push(genreId); // Add
        tag.classList.add('active');
    }
}

/**
 * Gathers all current filter settings from the DOM.
 * @returns {object} An object containing the filter parameters for the API.
 */
function getFilterParams() {
    const filters = {};
    
    // Genres
    if (selectedGenres.length > 0) {
        filters.with_genres = selectedGenres.join(',');
    }

    // Release Dates
    const searchAllReleases = document.getElementById('search-all-releases').checked;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;

    // TMDB uses 'primary_release_date' or 'release_date' for discover endpoints
    if (!searchAllReleases) {
        // You'll need to decide which release type to filter by for a full implementation
        // For simplicity, we'll use primary_release_date.gte
        if (dateFrom) filters['primary_release_date.gte'] = dateFrom;
        if (dateTo) filters['primary_release_date.lte'] = dateTo;
    } else {
        // If searching all releases, the filter names are slightly different (e.g., release_date.gte)
        // For simplicity with this endpoint, we might stick to one set or need complex logic.
        // Sticking to primary_release_date as it's common for general discovery.
        if (dateFrom) filters['primary_release_date.gte'] = dateFrom;
        if (dateTo) filters['primary_release_date.lte'] = dateTo;
    }

    // Minimum User Votes
    const minVotes = document.getElementById('min-user-votes').value;
    // The API uses vote_count.gte for this
    if (minVotes > 0) {
        filters['vote_count.gte'] = minVotes;
    }

    // Runtime (min and max)
    const minRuntime = document.getElementById('min-runtime').value;
    const maxRuntime = document.getElementById('max-runtime').value;
    if (minRuntime > 0) {
        filters['with_runtime.gte'] = minRuntime;
    }
    if (maxRuntime < 360) { // Assuming 360 is the max range slider value
        filters['with_runtime.lte'] = maxRuntime;
    }

    return filters;
}

/**
 * Loads and displays movies based on current sort and filter settings.
 * @param {boolean} clearGrid - If true, clears existing movies before loading.
 */
async function loadMovies(clearGrid = false) {
    if (clearGrid) {
        movieGrid.innerHTML = '';
        currentPage = 1;
    }

    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';

    const filters = getFilterParams();
    const data = await fetchPopularMovies(currentPage, currentSortBy, filters);

    data.results.forEach(createMovieCard);

    loadMoreBtn.disabled = false;
    if (currentPage >= data.total_pages) {
        loadMoreBtn.textContent = 'No More Movies';
        loadMoreBtn.disabled = true;
    } else {
        loadMoreBtn.textContent = 'Load More';
    }
}

// --- INITIALIZATION ---

/**
 * Sets up all initial data and event listeners.
 */
async function init() {
    // 1. Fetch and Render Genres
    const genres = await fetchGenres();
    renderGenres(genres);
    
    // 2. Initial Movie Load
    await loadMovies(true);

    // 3. Setup Event Listeners
    
    // Load More Button
    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        loadMovies(false);
    });

    // Sort Dropdown
    sortBySelect.addEventListener('change', (e) => {
        currentSortBy = e.target.value;
        loadMovies(true); // Reload with new sort, clear existing
    });

    // Apply Filters Button
    applyFiltersBtn.addEventListener('click', () => {
        loadMovies(true); // Reload with new filters, clear existing
    });

    // Range Slider Value Updates (UX)
    const minVotesRange = document.getElementById('min-user-votes');
    const minVotesOutput = document.getElementById('min-votes-value');
    minVotesRange.addEventListener('input', () => {
        minVotesOutput.textContent = minVotesRange.value;
    });

    const minRuntimeRange = document.getElementById('min-runtime');
    const maxRuntimeRange = document.getElementById('max-runtime');
    const runtimeOutput = document.getElementById('runtime-value');
    const updateRuntimeOutput = () => {
        runtimeOutput.textContent = `${minRuntimeRange.value} - ${maxRuntimeRange.value} min`;
    };
    minRuntimeRange.addEventListener('input', updateRuntimeOutput);
    maxRuntimeRange.addEventListener('input', updateRuntimeOutput);
}

// Start the application
init();