// js/data.js

/**
 * Path to the single source of truth for portfolio content.
 * @constant {string}
 */
const portfolioDataUrl = './data/portfolio.json';

/**
 * Fetches the portfolio JSON data.
 * Bypasses browser caching if the admin session is active to ensure live updates.
 * 
 * @returns {Promise<Object|null>} The parsed portfolio data object, or null on failure.
 */
async function fetchPortfolioData() {
    // Check sessionStorage for the admin authentication flag
    const isAdminAuthenticated = sessionStorage.getItem('adminAuth') === '1';
    let requestUrl = portfolioDataUrl;

    // Append a timestamp to bust the cache if the admin is logged in
    if (isAdminAuthenticated) {
        const cacheBusterTimestamp = Date.now();
        requestUrl = `${portfolioDataUrl}?t=${cacheBusterTimestamp}`;
    }

    try {
        const response = await fetch(requestUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const portfolioData = await response.json();
        return portfolioData;
    } catch (fetchError) {
        console.error('Failed to load portfolio data:', fetchError);
        return null;
    }
}
