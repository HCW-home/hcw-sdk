import { Injectable } from '@angular/core';
import { platform } from 'platform';
@Injectable({
  providedIn: 'root'
})
export class PlatformService {

  constructor() { }

  isChromeBrowser() {
    return platform.name === "Chrome";
  };

  isSafariBrowser() {
    return platform.name === "Safari";
  };

  isChromeMobileBrowser() {
    return platform.name === "Chrome Mobile";
  };

  isFirefoxBrowser() {
    return platform.name === "Firefox";
  };

  isFirefoxMobileBrowser() {
    return platform.name === "Firefox Mobile";
  };

  isOperaBrowser() {
    return platform.name === "Opera";
  };

  isOperaMobileBrowser() {
    return platform.name === "Opera Mobile";
  };

  isAndroidBrowser() {
    return platform.name === "Android Browser";
  };

  isElectron() {
    return platform.name === "Electron";
  };

  isSamsungBrowser() {
    return (platform.name === "Samsung Internet Mobile" ||
      platform.name === "Samsung Internet");
  };

  isIPhoneOrIPad() {
    var userAgent = !!platform.ua ? platform.ua : navigator.userAgent;
    var isTouchable = "ontouchend" in document;
    var isIPad = /\b(\w*Macintosh\w*)\b/.test(userAgent) && isTouchable;
    var isIPhone = /\b(\w*iPhone\w*)\b/.test(userAgent) &&
      /\b(\w*Mobile\w*)\b/.test(userAgent) &&
      isTouchable;
    return isIPad || isIPhone;
  };

  isIOSWithSafari() {
    var userAgent = !!platform.ua ? platform.ua : navigator.userAgent;
    return (/\b(\w*Apple\w*)\b/.test(navigator.vendor) &&
      /\b(\w*Safari\w*)\b/.test(userAgent) &&
      !/\b(\w*CriOS\w*)\b/.test(userAgent) &&
      !/\b(\w*FxiOS\w*)\b/.test(userAgent));
  };

  isIonicIos() {
    return this.isIPhoneOrIPad() && platform.ua.indexOf("Safari") === -1;
  };

  isIonicAndroid() {
    return (platform.os.family === "Android" && platform.name == "Android Browser");
  };

  isMobileDevice() {
    return platform.os.family === "iOS" || platform.os.family === "Android";
  };

  canScreenShare() {
    var version = (platform === null || platform === void 0 ? void 0 : platform.version) ? parseFloat(platform.version) : -1;
    // Reject mobile devices
    if (this.isMobileDevice()) {
      return false;
    }
    return (this.isChromeBrowser() ||
      this.isFirefoxBrowser() ||
      this.isOperaBrowser() ||
      this.isElectron() ||
      (this.isSafariBrowser() && version >= 13));
  };

  getName() {
    return platform.name || "";
  };

  getVersion() {
    return platform.version || "";
  };

  getFamily() {
    return platform.os.family || "";
  };

  getDescription() {
    return platform.description || "";
  };

}
