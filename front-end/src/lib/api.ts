import { OAuthProvider } from './oauth-provider.enum';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY as string;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 128; // bits

/**
 * API Response wrapper interface
 */
interface ApiResponse<T> {
  result: 'success' | 'fail';
  data: T;
}

/**
 * LocalStorage key for access token
 * Token will persist across browser sessions until explicitly cleared
 */
const ACCESS_TOKEN_KEY = 'accessToken';
const OAUTH_INTENT_KEY = 'oauthIntent';

export type OAuthIntent = 'login' | 'link';

/**
 * Set the access token in localStorage
 */
export function setAccessToken(token: string | null): void {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

/**
 * Get the current access token from localStorage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Decode JWT token to get payload
 */
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Import encryption key for Web Crypto API
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  if (!SECRET_KEY) {
    throw new Error(
      'Encryption key is not configured. Please set VITE_ENCRYPTION_KEY environment variable.',
    );
  }

  let keyBuffer: Uint8Array;
  try {
    keyBuffer = base64ToUint8Array(SECRET_KEY);
  } catch {
    throw new Error(
      'Invalid encryption key format. VITE_ENCRYPTION_KEY must be a valid Base64 string.',
    );
  }

  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (256 bits)');
  }

  return await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt plaintext using AES-256-GCM (compatible with backend)
 * @param plaintext - The text to encrypt
 * @returns Encrypted data in format: encrypted:iv:authTag (all base64)
 */
async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encode plaintext to Uint8Array
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // Encrypt using AES-GCM
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: AUTH_TAG_LENGTH,
      },
      key,
      plaintextBytes,
    );

    // Web Crypto API appends authTag to ciphertext, need to split them
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const authTagLength = AUTH_TAG_LENGTH / 8; // convert bits to bytes
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - authTagLength);
    const authTag = encryptedBytes.slice(encryptedBytes.length - authTagLength);

    // Return format: encrypted:iv:authTag (all base64)
    return `${uint8ArrayToBase64(ciphertext)}:${uint8ArrayToBase64(iv)}:${uint8ArrayToBase64(authTag)}`;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Decrypt encrypted data using AES-256-GCM (compatible with backend)
 * @param encryptedData - Encrypted data in format: encrypted:iv:authTag (all base64)
 * @returns Decrypted plaintext
 */
async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Parse encrypted:iv:authTag format
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected: encrypted:iv:authTag');
    }

    const [encryptedBase64, ivBase64, authTagBase64] = parts;

    // Decode from base64
    const ciphertext = base64ToUint8Array(encryptedBase64);
    const iv = base64ToUint8Array(ivBase64);
    const authTag = base64ToUint8Array(authTagBase64);

    // Web Crypto API expects ciphertext + authTag concatenated
    const encryptedWithTag = new Uint8Array(ciphertext.length + authTag.length);
    encryptedWithTag.set(ciphertext, 0);
    encryptedWithTag.set(authTag, ciphertext.length);

    // Decrypt using AES-GCM
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: AUTH_TAG_LENGTH,
      },
      key,
      encryptedWithTag,
    );

    // Decode result to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Get username from access token
 */
export async function getUsernameFromToken(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJWT(token);
  if (!payload?.username) return null;
  try {
    return await decrypt(payload.username);
  } catch {
    return null;
  }
}

/**
 * Clear the access token from localStorage
 */
export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function setOAuthIntent(intent: OAuthIntent): void {
  sessionStorage.setItem(OAUTH_INTENT_KEY, intent);
}

export function consumeOAuthIntent(): OAuthIntent {
  const intent = sessionStorage.getItem(OAUTH_INTENT_KEY);
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
  return intent === 'link' ? 'link' : 'login';
}

export function clearOAuthIntent(): void {
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
}

/**
 * Refresh tokens mutex — prevents concurrent refresh requests
 */
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh access token using the HttpOnly refresh token cookie
 * Returns true on success, false on failure
 */
async function refreshTokens(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 201) {
      const apiResponse: ApiResponse<{ accessToken: string }> = await response.json();
      setAccessToken(apiResponse.data.accessToken);
      return true;
    }

    // Refresh failed (401/403) — clear tokens and redirect
    clearAccessToken();
    window.location.href = '/login';
    return false;
  } catch {
    clearAccessToken();
    window.location.href = '/login';
    return false;
  }
}

/**
 * Make an authenticated API request with automatic token refresh
 * On 401 EXPIRED TOKEN, automatically refreshes tokens and retries the request
 */
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Add authorization header if access token exists
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle expired access token
  if (response.status === 401) {
    const cloned = response.clone();
    let errorMessage = '';
    try {
      const body = await cloned.json();
      errorMessage = body?.data || body?.message || '';
    } catch {
      // ignore parse errors
    }

    if (errorMessage === 'EXPIRED TOKEN') {
      // Use mutex to prevent concurrent refresh requests
      if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry original request with new access token
        const retryHeaders = new Headers(options.headers);
        const newToken = getAccessToken();
        if (newToken) {
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
        }
        return fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        });
      }
    }

    // Non-expired 401 — clear token
    clearAccessToken();
  }

  return response;
}

/**
 * Send verification code to the user's email
 * @param username - User's email address
 * @returns Object containing isNewUser flag
 */
export async function sendVerificationCode(username: string): Promise<{ isNewUser: boolean }> {
  const encryptedUsername = await encrypt(username);
  const response = await fetch(`${API_BASE_URL}/api/auth/send-verification-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ encryptedUsername }),
  });

  const apiResponse: ApiResponse<{ message: string; isNewUser: boolean }> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to send verification code',
    );
  }

  return { isNewUser: apiResponse.data.isNewUser };
}

/**
 * Login with verification code
 * @param username - User's email address
 * @param code - Verification code
 * @returns Access token
 */
export async function login(username: string, code: string): Promise<string> {
  const encryptedUsername = await encrypt(username);
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include', // Include cookies for refresh token
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ encryptedUsername, code }),
  });

  const apiResponse: ApiResponse<{ accessToken: string }> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to login');
  }

  // Store access token in localStorage
  const { accessToken } = apiResponse.data;

  setAccessToken(accessToken);
  return accessToken;
}

/**
 * Logout and clear tokens
 */
export async function logout(): Promise<void> {
  // Call backend logout endpoint to remove refresh token from Redis and cookie
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Include access token in Authorization header for authentication
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  } catch (error) {
    // Ignore errors during logout
    console.error('Logout error:', error);
  } finally {
    // Always clear access token from localStorage
    clearAccessToken();
  }
}

/**
 * Check if user is authenticated
 * Returns true if access token exists in localStorage
 * Note: Token will be automatically refreshed by backend guard on actual API calls
 */
export function checkAuth(): boolean {
  return getAccessToken() !== null;
}

/**
 * Check if username exists in the database
 * @param username - Username to check
 * @returns Whether the username exists
 */
export async function checkUsernameExists(username: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/users/exists/${encodeURIComponent(username)}`);

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to check username',
    );
  }

  const apiResponse: ApiResponse<{ exists: boolean }> = await response.json();
  return apiResponse.data.exists;
}

/**
 * Deactivate the current user account
 */
export async function deactivateAccount(): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/deactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to deactivate user',
    );
  }
}

/**
 * Delete the current user
 */
export async function deleteUser(): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to delete user',
    );
  }

  // Clear access token after successful deletion
  clearAccessToken();
}

/**
 * Relay Email interfaces
 */
export interface RelayEmail {
  id: string;
  relayEmail: string;
  primaryEmail: string;
  description: string | null;
  isActive: boolean;
  forwardCount: string;
  lastForwardedAt: string | null;
  createdAt: string;
}

export interface CreateRelayEmailResponse {
  relayEmail: string;
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

/**
 * Get all relay emails for the current user
 */
export async function getRelayEmails(): Promise<RelayEmail[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/relay-emails`);

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to fetch relay emails',
    );
  }

  const apiResponse: ApiResponse<RelayEmail[]> = await response.json();
  return apiResponse.data;
}

/**
 * Create a new relay email
 */
export async function createRelayEmail(): Promise<CreateRelayEmailResponse> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/relay-emails/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to create relay email',
    );
  }

  const apiResponse: ApiResponse<CreateRelayEmailResponse> = await response.json();
  return apiResponse.data;
}

/**
 * Create a custom relay email (admin only)
 * @param customUsername - Custom username for the relay email
 */
export async function createCustomRelayEmail(
  customUsername: string,
): Promise<CreateRelayEmailResponse> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/relay-emails/custom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customUsername }),
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string'
        ? apiResponse.data
        : 'Failed to create custom relay email',
    );
  }

  const apiResponse: ApiResponse<CreateRelayEmailResponse> = await response.json();
  return apiResponse.data;
}

/**
 * Update relay email description (memo)
 * @param id - Relay email ID
 * @param description - New description (max 20 characters)
 */
export async function updateRelayEmailDescription(
  id: string,
  description: string,
): Promise<{ relayEmail: string; description: string }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/relay-emails/${id}/description`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to update description',
    );
  }

  const apiResponse: ApiResponse<{ relayEmail: string; description: string }> =
    await response.json();
  return apiResponse.data;
}

/**
 * Update relay email active status
 * @param id - Relay email ID
 * @param isActive - New active status
 */
export async function updateRelayEmailActiveStatus(
  id: string,
  isActive: boolean,
): Promise<{ relayEmail: string; isActive: boolean }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/relay-emails/${id}/active`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to update active status',
    );
  }

  const apiResponse: ApiResponse<{ relayEmail: string; isActive: boolean }> = await response.json();
  return apiResponse.data;
}

/**
 * User info interface
 */
export interface UserInfo {
  username: string;
  subscriptionTier: string;
  createdAt: string;
  ghOauth: boolean;
  aaplOauth: boolean;
  googOauth: boolean;
}

/**
 * Get current user info
 */
export async function getUserInfo(): Promise<UserInfo> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/me`);

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to fetch user info',
    );
  }

  const apiResponse: ApiResponse<UserInfo> = await response.json();
  return apiResponse.data;
}

/**
 * Request username (email) change
 * Sends verification code to the new email address
 * @param newEmail - New email address
 */
export async function requestUsernameChange(newEmail: string): Promise<void> {
  const encryptedNewUsername = await encrypt(newEmail);
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/change-username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ encryptedNewUsername }),
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to request username change',
    );
  }
}

/**
 * Verify username change with verification code
 * @param code - 6-digit verification code
 */
export async function verifyUsernameChange(code: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/verify-username-change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to verify username change',
    );
  }

  // Clear access token after successful username change
  clearAccessToken();
}

/**
 * Admin dashboard stats interface
 */
export interface AdminDashboardStats {
  users: {
    total: number;
    last28Days: number;
    last7Days: number;
  };
  relayEmails: {
    total: number;
    last28Days: number;
    last7Days: number;
  };
  forwardCount: {
    total: number;
    last28Days: number;
    last7Days: number;
  };
}

/**
 * Get admin dashboard stats
 */
export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/dashboard`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied');
    }
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to fetch admin dashboard',
    );
  }

  const apiResponse: ApiResponse<AdminDashboardStats> = await response.json();
  return apiResponse.data;
}

/**
 * Get GitHub OAuth authorization URL from backend
 */
export async function getOAuthGithubUrl(redirectUri: string): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/oauth/github/url?redirectUri=${encodeURIComponent(redirectUri)}`,
  );

  const apiResponse: ApiResponse<{ url: string }> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to get GitHub OAuth URL',
    );
  }

  return apiResponse.data.url;
}

/**
 * Get Google OAuth authorization URL from backend
 */
export async function getOAuthGoogleUrl(redirectUri: string): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/oauth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`,
  );

  const apiResponse: ApiResponse<{ url: string }> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to get Google OAuth URL',
    );
  }

  return apiResponse.data.url;
}

/**
 * OAuth login with GitHub
 */
export async function oauthLoginGithub(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/oauth/github`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });

  const apiResponse: ApiResponse<{ accessToken: string }> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'GitHub login failed',
    );
  }

  return apiResponse.data;
}

/**
 * OAuth login with Google
 */
export async function oauthLoginGoogle(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/oauth/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });

  const apiResponse: ApiResponse<{ accessToken: string }> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Google login failed',
    );
  }

  return apiResponse.data;
}

async function oauthLink(
  provider: OAuthProvider.GITHUB | OAuthProvider.GOOGLE,
  code: string,
  redirectUri: string,
): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/oauth/${provider}/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to link OAuth',
    );
  }
}

/**
 * OAuth link with GitHub
 */
export async function oauthLinkGithub(code: string, redirectUri: string): Promise<void> {
  await oauthLink(OAuthProvider.GITHUB, code, redirectUri);
}

/**
 * OAuth link with Google
 */
export async function oauthLinkGoogle(code: string, redirectUri: string): Promise<void> {
  await oauthLink(OAuthProvider.GOOGLE, code, redirectUri);
}

/**
 * OAuth login with Apple
 */
export async function oauthLoginApple(idToken: string): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/oauth/apple`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const apiResponse: ApiResponse<{ accessToken: string }> = await response.json();

  if (!response.ok || apiResponse.result === 'fail') {
    throw new Error(typeof apiResponse.data === 'string' ? apiResponse.data : 'Apple login failed');
  }

  return apiResponse.data;
}

/**
 * Unlink OAuth provider from current account
 */
export async function unlinkOAuth(provider: OAuthProvider): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/oauth/unlink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });

  if (!response.ok) {
    const apiResponse: ApiResponse<any> = await response.json();
    throw new Error(
      typeof apiResponse.data === 'string' ? apiResponse.data : 'Failed to unlink OAuth',
    );
  }
}
