// Shared client for all Play.fun games
// Handles: Play.fun Browser SDK init, scoring via addPoints/endGame

const PlayFunClient = {
  sdk: null,
  sdkReady: false,
  gameName: null,
  gameId: null,

  async init(gameName, gameId) {
    this.gameName = gameName;
    this.gameId = gameId;

    // Init Play.fun Browser SDK
    if (typeof OpenGameSDK !== 'undefined') {
      this.sdk = new OpenGameSDK({
        ui: { usePointsWidget: true, theme: 'dark' },
        logLevel: 'info',
      });

      this.sdk.on('OnReady', () => {
        this.sdkReady = true;
        console.log(`[${gameName}] Play.fun SDK ready`);
      });

      this.sdk.on('SavePointsSuccess', () => console.log('Score saved!'));
      this.sdk.on('SavePointsFailed', (e) => console.log('Save failed:', e));

      await this.sdk.init({ gameId });
    }
  },

  // Add points during gameplay (accumulates locally, updates widget)
  addPoints(points) {
    if (this.sdk && this.sdkReady && points > 0) {
      this.sdk.addPoints(points);
    }
  },

  // Submit final score — adds points then calls endGame to save
  async submitScore(score) {
    if (this.sdk && this.sdkReady && score > 0) {
      try {
        this.sdk.addPoints(Math.floor(score));
        await this.sdk.endGame();
      } catch (e) {
        console.error('Score submit failed:', e);
      }
    }
    return { success: true };
  },

  async getLeaderboard() {
    // Leaderboard is handled by the Play.fun widget
    return [];
  }
};
