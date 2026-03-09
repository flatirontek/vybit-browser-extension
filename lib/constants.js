/**
 * Vybit Chrome Extension — Constants
 */

const CLIENT_ID = 'b2namn3a5ye38bwy';

// Server URLs
const VYBIT_APP_URL = 'https://app.vybit.net';
const VYBIT_SOUND_LIB_URL = 'https://vybit.net/sounds';

// OAuth2 endpoints (relative to VYBIT_APP_URL)
const TOKEN_ENDPOINT = VYBIT_APP_URL + '/service/token';
const TOKEN_VALIDATE_ENDPOINT = VYBIT_APP_URL + '/service/test';

// Timing constants (milliseconds)
const HEARTBEAT_INTERVAL = 20000;
const RECONNECT_DELAY_MIN = 1000;
const RECONNECT_DELAY_MAX = 30000;

// Sound cache
const SOUND_CACHE_MAX = 50;

// Storage keys
const STORAGE_KEY_TOKEN = 'accessToken';
const STORAGE_KEY_AUTHENTICATED_AT = 'authenticatedAt';
const STORAGE_KEY_VOLUME = 'volume';
