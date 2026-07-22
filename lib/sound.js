/**
 * Vybit Chrome Extension — Sound Playback & Caching
 */

const SoundPlayer = {
  // LRU cache: Map iterates in insertion order, so deleting and re-inserting
  // on each access keeps the least-recently-used entry first.
  cache: new Map(),

  getSoundUrl(payload) {
    if (payload.proxyUrl) return payload.proxyUrl;
    if (!payload.soundKey || payload.soundKey === 'none' || !payload.soundType) return null;
    return VYBIT_SOUND_LIB_URL + '/' + payload.soundKey + '.' + payload.soundType;
  },

  async play(payload) {
    const url = this.getSoundUrl(payload);
    if (!url) return;

    try {
      let audio = this.cache.get(url);
      if (audio) {
        this.cache.delete(url);
        audio.currentTime = 0;
      } else {
        if (this.cache.size >= SOUND_CACHE_MAX) {
          this.cache.delete(this.cache.keys().next().value);
        }
        audio = new Audio(url);
      }
      this.cache.set(url, audio);
      await audio.play();
    } catch (e) {
      console.error('Sound playback error:', e);
    }
  }
};
