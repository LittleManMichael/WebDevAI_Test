// public/js/auth-utils.js

/**
 * Authentication utilities for frontend
 */
const authUtils = {
  /**
   * Check if the user is logged in
   * @returns {boolean} True if the user is logged in
   */
  isLoggedIn: function() {
    return !!localStorage.getItem('auth_token');
  },
  
  /**
   * Get the current user's authentication token
   * @returns {string|null} The authentication token or null if not logged in
   */
  getToken: function() {
    return localStorage.getItem('auth_token');
  },
  
  /**
   * Get the current user's information
   * @returns {Object|null} The user information or null if not logged in
   */
  getCurrentUser: function() {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  },
  
  /**
   * Update the current user's information
   * @param {Object} userInfo - The updated user information
   */
  updateCurrentUser: function(userInfo) {
    localStorage.setItem('user_info', JSON.stringify(userInfo));
  },
  
  /**
   * Log out the current user
   */
  logout: function() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    window.location.href = '/login.html';
  },
  
  /**
   * Check if the current user has admin role
   * @returns {boolean} True if the user is an admin
   */
  isAdmin: function() {
    const userInfo = this.getCurrentUser();
    return userInfo ? userInfo.role === 'admin' : false;
  },
  
  /**
   * Add the authentication token to fetch API options
   * @param {Object} options - The fetch API options
   * @returns {Object} The options with authentication token
   */
  addAuthHeader: function(options = {}) {
    const token = this.getToken();
    if (!token) return options;
    
    // Create headers if they don't exist
    if (!options.headers) {
      options.headers = {};
    }
    
    // Add authorization header
    options.headers.Authorization = `Bearer ${token}`;
    
    return options;
  },
  
  /**
   * Make an authenticated fetch request
   * @param {string} url - The URL to fetch
   * @param {Object} options - The fetch options
   * @returns {Promise} The fetch promise
   */
  authFetch: async function(url, options = {}) {
    // Add authentication header
    const authOptions = this.addAuthHeader(options);
    
    // Make the request
    const response = await fetch(url, authOptions);
    
    // Check if token was refreshed
    const newToken = response.headers.get('X-New-Token');
    if (newToken) {
      localStorage.setItem('auth_token', newToken);
    }
    
    // Check if unauthorized
    if (response.status === 401) {
      // Token might be expired, attempt to logout
      this.logout();
    }
    
    return response;
  },
  
  /**
   * Protect a page from unauthenticated access
   * Should be called at the beginning of each protected page
   */
  requireAuth: function() {
    if (!this.isLoggedIn()) {
      // Redirect to login page with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/login.html?returnUrl=${returnUrl}`;
      return false;
    }
    return true;
  },
  
  /**
   * Require admin role for a page
   * Should be called at the beginning of admin pages
   */
  requireAdmin: function() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      // Redirect to dashboard with error
      window.location.href = '/dashboard.html?error=adminRequired';
      return false;
    }
    return true;
  },
  
  /**
   * Initialize the authentication services for a page
   * - Handles protection of pages
   * - Sets up the navigation user menu
   * - Sets up logout functionality
   * @param {Object} options - Options for initialization
   * @param {boolean} options.requireAuth - Whether authentication is required
   * @param {boolean} options.requireAdmin - Whether admin role is required
   */
  init: function(options = {}) {
    // Check if authentication is required
    if (options.requireAuth) {
      this.requireAuth();
    }
    
    // Check if admin role is required
    if (options.requireAdmin) {
      this.requireAdmin();
    }
    
    // Setup user menu if logged in
    if (this.isLoggedIn()) {
      this.setupUserMenu();
    }
    
    // Add logout event listeners
    document.addEventListener('click', function(event) {
      if (event.target.matches('.logout-btn')) {
        event.preventDefault();
        authUtils.logout();
      }
    });
    
    // Handle return URL after login
    if (window.location.pathname === '/login.html') {
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      
      if (returnUrl) {
        const returnUrlInput = document.createElement('input');
        returnUrlInput.type = 'hidden';
        returnUrlInput.name = 'returnUrl';
        returnUrlInput.value = returnUrl;
        
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
          loginForm.appendChild(returnUrlInput);
        }
      }
    }
  },
  
  /**
   * Setup the user menu in the navigation
   */
  setupUserMenu: function() {
    const userInfo = this.getCurrentUser();
    if (!userInfo) return;
    
    // Find the user menu elements
    const userNameElement = document.querySelector('.user-menu .user-name');
    
    // Update user name if element exists
    if (userNameElement) {
      userNameElement.textContent = userInfo.username || userInfo.firstName || 'User';
    }
    
    // Get or create the user menu dropdown
    let userDropdownElement = document.querySelector('.user-dropdown');
    
    if (!userDropdownElement) {
      // Create the dropdown if it doesn't exist
      userDropdownElement = document.createElement('div');
      userDropdownElement.className = 'user-dropdown';
      userDropdownElement.innerHTML = `
        <ul>
          <li><a href="/profile.html">My Profile</a></li>
          ${this.isAdmin() ? '<li><a href="/admin/dashboard.html">Admin Panel</a></li>' : ''}
          <li><a href="#" class="logout-btn">Logout</a></li>
        </ul>
      `;
      
      // Find the user menu to append to
      const userMenu = document.querySelector('.user-menu');
      if (userMenu) {
        userMenu.appendChild(userDropdownElement);
        
        // Add click event to toggle dropdown
        userMenu.addEventListener('click', function(event) {
          event.stopPropagation();
          userDropdownElement.classList.toggle('visible');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function() {
          userDropdownElement.classList.remove('visible');
        });
      }
    }
  }
};

// If this script is loaded directly in a page, initialize the auth utils
document.addEventListener('DOMContentLoaded', function() {
  authUtils.init();
});
