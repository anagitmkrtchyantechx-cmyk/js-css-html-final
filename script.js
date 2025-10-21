const API_KEY = '21909f03a0c296b71ea309b75d5c088a';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const movieGrid = document.getElementById('movie-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
const sortBySelect = document.getElementById('sort-by');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const genreTagsContainer = document.getElementById('genre-tags-container');
const voteSlider = document.getElementById("min-user-votes");
const runtimeMin = document.getElementById("min-runtime");
const runtimeMax = document.getElementById("max-runtime");

let currentPage = 1;
let currentSortBy = sortBySelect.value;
let selectedGenres = [];

async function fetchPopularMovies(page, sortBy, filters = {}) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    language: 'en-US',
    page: page,
    sort_by: sortBy,
    ...filters
  });
  try {
    const response = await fetch(`${BASE_URL}/discover/movie?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Could not fetch popular movies:", error);
    return { results: [], total_pages: 0 };
  }
}

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

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.classList.add('movie-card');
  const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'placeholder.png';
  const releaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'TBA';
  const rating = Math.round(movie.vote_average * 10);
  let ratingClass = 'low';
  if (rating >= 70) ratingClass = 'high';
  else if (rating >= 40) ratingClass = 'medium';
  card.innerHTML = `
    <img src="${posterPath}" alt="${movie.title} Poster" onerror="this.onerror=null;this.src='https://via.placeholder.com/180x270?text=No+Poster'">
    <div class="movie-info">
      <div class="rating-circle ${ratingClass}">${rating}%</div>
      <h4>${movie.title}</h4>
      <p>${releaseDate}</p>
    </div>
  `;
  movieGrid.appendChild(card);
}

function renderGenres(genres) {
  genres.forEach(genre => {
    const tag = document.createElement('span');
    tag.classList.add('genre-tag');
    tag.dataset.genreId = genre.id;
    tag.textContent = genre.name;
    tag.addEventListener('click', toggleGenreFilter, updateSearchButtonState());
    genreTagsContainer.appendChild(tag);
  });
}

function toggleGenreFilter(event) {
  const tag = event.target;
  const genreId = tag.dataset.genreId;
  const index = selectedGenres.indexOf(genreId);
  if (index > -1) {
    selectedGenres.splice(index, 1);
    tag.classList.remove('active');
  } else {
    selectedGenres.push(genreId);
    tag.classList.add('active');
  }
}

function getFilterParams() {
  const filters = {};
  if (selectedGenres.length > 0) filters.with_genres = selectedGenres.join(',');
  const searchAllReleases = document.getElementById('search-all-releases').checked;
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;
  if (!searchAllReleases) {
    if (dateFrom) filters['primary_release_date.gte'] = dateFrom;
    if (dateTo) filters['primary_release_date.lte'] = dateTo;
  } else {
    if (dateFrom) filters['primary_release_date.gte'] = dateFrom;
    if (dateTo) filters['primary_release_date.lte'] = dateTo;
  }
  const minVotes = document.getElementById('min-user-votes').value;
  if (minVotes > 0) filters['vote_count.gte'] = minVotes;
  const minRuntime = document.getElementById('min-runtime').value;
  const maxRuntime = document.getElementById('max-runtime').value;
  if (minRuntime > 0) filters['with_runtime.gte'] = minRuntime;
  if (maxRuntime < 360) filters['with_runtime.lte'] = maxRuntime;
  return filters;
}

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

async function init() {
  const genres = await fetchGenres();
  renderGenres(genres);
  await loadMovies(true);

  loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    loadMovies(false);
    updateSearchButtonState();
  });

  sortBySelect.addEventListener('change', (e) => {
    currentSortBy = e.target.value;
    loadMovies(true);
    updateSearchButtonState();
  });

  applyFiltersBtn.addEventListener('click', () => {
    loadMovies(true);
    updateSearchButtonState();
  });

  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const searchAllCheckbox = document.getElementById('search-all-releases');
  dateFromInput?.addEventListener('input', updateSearchButtonState);
  dateToInput?.addEventListener('input', updateSearchButtonState);
  searchAllCheckbox?.addEventListener('change', updateSearchButtonState);

  const minVotesRange = document.getElementById('min-user-votes');
  const minVotesOutput = document.getElementById('min-votes-value');
  minVotesRange.addEventListener('input', () => {
    minVotesOutput.textContent = minVotesRange.value;
    updateSearchButtonState();
  });

  const minRuntimeRange = document.getElementById('min-runtime');
  const maxRuntimeRange = document.getElementById('max-runtime');
  const runtimeOutput = document.getElementById('runtime-value');
  const updateRuntimeOutput = () => {
    runtimeOutput.textContent = `${minRuntimeRange.value} - ${maxRuntimeRange.value} min`;
    updateSearchButtonState();
  };
  minRuntimeRange.addEventListener('input', updateRuntimeOutput);
  maxRuntimeRange.addEventListener('input', updateRuntimeOutput);
}


document.addEventListener("DOMContentLoaded", () => {
  const panels = document.querySelectorAll(".filter_panel .name");
  panels.forEach((header) => {
    header.addEventListener("click", () => {
      const panel = header.parentElement;
      panel.classList.toggle("open");
      updateSearchButtonState();
    });
  });
  document.querySelector(".sort-panel")?.classList.remove("open");
  document.getElementById("filterPanel")?.classList.add("open");
  voteSlider?.addEventListener("input", () => {
    document.getElementById("min-votes-value").textContent = voteSlider.value;
    updateSearchButtonState();
  });
  const updateRuntime = () => {
    document.getElementById("runtime-value").textContent = `${runtimeMin.value} - ${runtimeMax.value} min`;
  };
  runtimeMin?.addEventListener("input", updateRuntime, updateSearchButtonState());
  runtimeMax?.addEventListener("input", updateRuntime, updateSearchButtonState());
});

function updateSearchButtonState() {
  const filterShowSelect = document.getElementById("filter-show-select");
  const minVotes = document.getElementById("min-user-votes").value;
  const minRuntime = document.getElementById("min-runtime").value;
  const maxRuntime = document.getElementById("max-runtime").value;
  const searchAllReleases = document.getElementById('search-all-releases').checked;
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;

  let isActive = false;

  if (filterShowSelect && filterShowSelect.value !== "all") isActive = true;
  if (selectedGenres.length > 0) isActive = true;
  if (minVotes > 0) isActive = true;
  if (minRuntime > 0 || maxRuntime < 360) isActive = true;
  if (!searchAllReleases && (dateFrom || dateTo)) isActive = true;

  const btn = document.getElementById("apply-filters-btn");
  if (isActive) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }
}


function renderGenres(genres) {
  genres.forEach(genre => {
    const tag = document.createElement('span');
    tag.classList.add('genre-tag');
    tag.dataset.genreId = genre.id;
    tag.textContent = genre.name;
    tag.addEventListener('click', (e) => {
      toggleGenreFilter(e);
      updateSearchButtonState();
    });
    genreTagsContainer.appendChild(tag);
  });
}

voteSlider?.addEventListener("input", () => {
  document.getElementById("min-votes-value").textContent = voteSlider.value;
  updateSearchButtonState();
});

runtimeMin?.addEventListener("input", () => {
  document.getElementById("runtime-value").textContent = `${runtimeMin.value} - ${runtimeMax.value} min`;
  updateSearchButtonState();
});

runtimeMax?.addEventListener("input", () => {
  document.getElementById("runtime-value").textContent = `${runtimeMin.value} - ${runtimeMax.value} min`;
  updateSearchButtonState();
});

document.addEventListener("DOMContentLoaded", () => {
  const searchAllCheckbox = document.getElementById("search-all-releases");
  const releaseTypes = document.querySelector(".release-types");

  // Initial visibility
  if (searchAllCheckbox.checked) {
    releaseTypes.classList.add("hidden");
  }

  searchAllCheckbox.addEventListener("change", () => {
    if (searchAllCheckbox.checked) {
      releaseTypes.classList.add("hidden");
    } else {
      releaseTypes.classList.remove("hidden");
    }
  });
});

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.classList.add('movie-card');

  const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'placeholder.png';
  const releaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'TBA';
  
  const rating = Math.round(movie.vote_average * 10);

  let circleColor;
  if (rating >= 70) circleColor = 'var(--tmdb-green)';
  else if (rating >= 40) circleColor = 'yellow';
  else circleColor = 'red';

  const ratingCircle = `
    <div class="rating-circle" 
      style="--progress:${rating}; --circle-color:${circleColor}">
      <span>${rating}%</span>
    </div>
  `;

  card.innerHTML = `
    <img src="${posterPath}" alt="${movie.title} Poster" 
      onerror="this.onerror=null;this.src='https://via.placeholder.com/180x270?text=No+Poster'">
    <div class="movie-info">
      ${ratingCircle}
      <h4>${movie.title}</h4>
      <p>${releaseDate}</p>
    </div>
  `;

  movieGrid.appendChild(card);
}


init();
