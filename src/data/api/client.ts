import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  fn: () => Promise<any>;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshQueue: QueuedRequest[] = [];
  private onSessionExpired: (() => void) | null = null;
  private onNetworkStateChange: ((isOnline: boolean) => void) | null = null;
  private activePausesUntil = 0; // Epoch ms for rate limiting (429)
  
  // Repoint this to your local server IP, production server URL, or assessment secure proxy!
  private BASE_URL = 'https://nyumban-assessment-0000d50c027d.herokuapp.com';
  private ASSESSMENT_KEY = 'nyk_franciswetaka_fd92755aed47';

  public async initialize(): Promise<void> {
    try {
      this.accessToken = await AsyncStorage.getItem('nyumban_access_token');
      this.refreshToken = await AsyncStorage.getItem('nyumban_refresh_token');
    } catch (e) {
      console.error('[API Client] Storage error on init', e);
    }
  }

  public async setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    try {
      await AsyncStorage.setItem('nyumban_access_token', accessToken);
      await AsyncStorage.setItem('nyumban_refresh_token', refreshToken);
    } catch (e) {
      console.error('[API Client] Storage write error', e);
    }
  }

  public async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    try {
      await AsyncStorage.removeItem('nyumban_access_token');
      await AsyncStorage.removeItem('nyumban_refresh_token');
    } catch (e) {
      console.error('[API Client] Storage deletion error', e);
    }
  }

  public registerSessionExpiredHandler(handler: () => void) {
    this.onSessionExpired = handler;
  }

  public registerNetworkStateChangeHandler(handler: (isOnline: boolean) => void) {
    this.onNetworkStateChange = handler;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Main request method with automatic retry, 429 backing-off, and token refreshing
   */
  public async request(
    path: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<any> {
    // 1. Check rate-limit pause
    const now = Date.now();
    if (now < this.activePausesUntil) {
      const waitTime = this.activePausesUntil - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // 2. Attach Authorization and Assessment headers
    const headers = new Headers(options.headers || {});
    headers.set('X-Assessment-Key', this.ASSESSMENT_KEY);
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    
    // Set default Content-Type if not multipart/form-data
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const fullUrl = path.startsWith('http') ? path : `${this.BASE_URL}${path}`;
    const fetchOptions = { ...options, headers };

    try {
      const response = await fetch(fullUrl, fetchOptions);

      // 3. Handle Rate Limiting (429)
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 5;
        console.warn(`[API] Rate limited (429). Retrying after ${retryAfterSeconds}s.`);
        this.activePausesUntil = Date.now() + retryAfterSeconds * 1000;
        
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, retryAfterSeconds * 1000));
        return this.request(path, options, retryCount);
      }

      // 4. Handle Auth Expiration (401)
      if (response.status === 401 && this.refreshToken && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
        return this.handle401(path, options);
      }

      // 5. Handle Random 500s or Photo upload 503s with Automatic Jittered Retries
      if ((response.status === 500 || response.status === 503) && retryCount < 3) {
        const isGet = (options.method || 'GET').toUpperCase() === 'GET';
        const hasIdempotency = headers.has('Idempotency-Key');
        
        if (isGet || hasIdempotency || path.includes('/photos')) {
          const delay = Math.pow(2, retryCount) * 400 + Math.random() * 200;
          console.warn(`[API] Server error (${response.status}) on ${path}. Retrying ${retryCount + 1}/3 after ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request(path, options, retryCount + 1);
        }
      }

      // 6. Return response if ok
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return response;
      }

      // 7. Extract structural errors
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { error: response.statusText || 'Unknown Error' };
      }

      const errorResponse = {
        status: response.status,
        data: errorBody,
        headers: response.headers,
      };
      throw errorResponse;

    } catch (error: any) {
      // Catch native fetch network errors
      if (error instanceof Error && (error.message.includes('Network') || error.message.includes('fetch'))) {
        if (this.onNetworkStateChange) {
          this.onNetworkStateChange(false);
        }
        throw { status: 0, data: { error: 'Network disconnected. Queued offline.' } };
      }
      throw error;
    }
  }

  /**
   * Handle session refreshing concurrently with lock protection
   */
  private async handle401(path: string, options: RequestInit): Promise<any> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({
          resolve,
          reject,
          fn: () => this.request(path, options),
        });
      });
    }

    this.isRefreshing = true;
    console.log('[API] Access token expired, attempting silent rotation refresh...');

    try {
      const response = await fetch(`${this.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Assessment-Key': this.ASSESSMENT_KEY
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        console.error('[API] Refresh token expired. Invalidate session.');
        await this.clearTokens();
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
        
        this.refreshQueue.forEach(item => item.reject({ status: 401, data: { error: 'Session expired' } }));
        this.refreshQueue = [];
        this.isRefreshing = false;
        throw { status: 401, data: { error: 'Session expired' } };
      }

      const data = await response.json();
      console.log('[API] Token rotation success. Replaying queued requests...');
      await this.setTokens(data.access_token, data.refreshToken);
      this.isRefreshing = false;

      this.refreshQueue.forEach(async (item) => {
        try {
          const res = await item.fn();
          item.resolve(res);
        } catch (err) {
          item.reject(err);
        }
      });
      this.refreshQueue = [];

      return this.request(path, options);

    } catch (err) {
      this.isRefreshing = false;
      throw err;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
