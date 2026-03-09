/**
 * Vybit Chrome Extension — Sound Playback & Caching
 */

const SoundPlayer = {
  cache: new Map(),
  accessOrder: [],

  getSoundUrl(payload) {
    if (payload.proxyUrl) return payload.proxyUrl;
    if (!payload.soundKey || payload.soundKey === 'none' || !payload.soundType) return null;
    return VYBIT_SOUND_LIB_URL + '/' + payload.soundKey + '.' + payload.soundType;
  },

  evictIfNeeded() {
    while (this.cache.size >= SOUND_CACHE_MAX && this.accessOrder.length > 0) {
      this.cache.delete(this.accessOrder.shift());
    }
  },

  touchCache(url) {
    const idx = this.accessOrder.indexOf(url);
    if (idx !== -1) this.accessOrder.splice(idx, 1);
    this.accessOrder.push(url);
  },

  async play(payload) {
    const url = this.getSoundUrl(payload);
    if (!url) return;

    try {
      let audio;
      if (this.cache.has(url)) {
        audio = this.cache.get(url);
        audio.currentTime = 0;
      } else {
        this.evictIfNeeded();
        audio = new Audio(url);
        this.cache.set(url, audio);
      }

      this.touchCache(url);
      audio.volume = 1.0;
      await audio.play();
    } catch (e) {
      console.error('Sound playback error:', e);
    }
  }
};
