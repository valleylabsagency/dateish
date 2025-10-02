/*
import mobileAds, {
    AdEventType,
    RewardedAdEventType,
    InterstitialAd,
    RewardedAd,
    TestIds,
  } from "react-native-google-mobile-ads";
  
  export const INTERSTITIAL_ID = __DEV__ ? TestIds.INTERSTITIAL : "YOUR_INTERSTITIAL_ID";
  export const REWARDED_ID     = __DEV__ ? TestIds.REWARDED     : "YOUR_REWARDED_ID";
  export const BANNER_ID       = __DEV__ ? TestIds.BANNER       : "YOUR_BANNER_ID";
  
  // call once near app start
  export async function initAds() {
    await mobileAds().initialize();
    preload();
  }
  
  let interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  let rewarded = RewardedAd.createForAdRequest(REWARDED_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  
  export function preload() {
    try { interstitial.load(); } catch {}
    try { rewarded.load(); } catch {}
  }
  
  export function showInterstitial(): Promise<boolean> {
    return new Promise((resolve) => {
      const onLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        interstitial.show();
      });
      const onClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        onLoaded(); onClosed();
        interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, { requestNonPersonalizedAdsOnly: true });
        interstitial.load();
        resolve(true);
      });
      const onError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
        onLoaded(); onClosed(); onError();
        // try reload next time
        interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, { requestNonPersonalizedAdsOnly: true });
        interstitial.load();
        resolve(false);
      });
  
      // already loaded?
      try {
        // show() will throw if not loaded, so we rely on LOADED event
        interstitial.show();
      } catch {
        try { interstitial.load(); } catch {}
      }
    });
  }
  
  export function showRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      let earned = false;
  
      const onLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewarded.show();
      });
      const onError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
        cleanup();
        // rebuild for next time
        rewarded = RewardedAd.createForAdRequest(REWARDED_ID, { requestNonPersonalizedAdsOnly: true });
        rewarded.load();
        resolve(false);
      });
      const onEarn = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      const onClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        rewarded = RewardedAd.createForAdRequest(REWARDED_ID, { requestNonPersonalizedAdsOnly: true });
        rewarded.load();
        resolve(earned);
      });
  
      function cleanup() {
        onLoaded(); onError(); onEarn(); onClosed();
      }
  
      try {
        rewarded.show();
      } catch {
        try { rewarded.load(); } catch {}
      }
    });
  }
  */
 // services/ads.ts  (temporary no-ads stub for Expo Go)
// Keep the same API surface you use elsewhere so you don't touch other files.

export const ADS_ENABLED = false;

type InterstitialResult = { shown: false; reason: 'ads-disabled' };
type RewardResult = { rewarded: false; reason: 'ads-disabled' };

export async function initAds(): Promise<void> {
  // previously: await mobileAds().initialize()
  // no-op
}

export async function showInterstitial(): Promise<InterstitialResult> {
  // previously: create/show InterstitialAd
  return { shown: false, reason: 'ads-disabled' };
}

export async function showRewarded(): Promise<RewardResult> {
  // previously: create/show RewardedAd
  return { rewarded: false, reason: 'ads-disabled' };
}

// If you had helpers like `requestTrackingPermission()` or consent utilities,
// add lightweight no-ops here too so other files don't break.
