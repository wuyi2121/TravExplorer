window.HELP_IMPROVE_VIDEOJS = false;

// Configuration: keep manual demo order (no automatic shuffling)
const SHUFFLE_VIDEOS = false; // Set to false to use manual order specified in demo data arrays
const USE_MEDIA_PLACEHOLDERS = false;
const VIDEO_BASE_DIR = './static/videos_vp9';
const VIDEO_REPLAY_DELAY_MS = 5000;

/*
 * Naming note for readability:
 * - UI titles use Single-Floor/Cross-Floor + in Simulation/Real-World.
 * - Some ids/variables still contain `ori`, `self`, `spatial` because they map to
 *   legacy dataset folder paths under ./static and are kept for compatibility.
 */

function getVideoCategoryPath(robot, type) {
  const key = `${robot}:${type}`;
  const pathMap = {
    'car:ori': 'simulation/single-floor',
    'car:self': 'simulation/single-floor',
    'car:spatial': 'simulation/cross-floor',
    'go2:ori': 'simulation/single-floor',
    'go2:self': 'simulation/cross-floor',
    'go2:spatial': 'simulation/cross-floor',
    'g1:ori': 'real-world/single-floor',
    'g1:self': 'real-world/cross-floor',
    'g1:spatial': 'real-world/cross-floor'
  };

  if (!pathMap[key]) {
    console.warn(`Unknown video category mapping for ${key}, fallback to simulation/single-floor`);
    return 'simulation/single-floor';
  }
  return pathMap[key];
}

function getVideoMimeTypeByPath(path) {
  const normalized = (path || '').toLowerCase();
  if (normalized.endsWith('.mp4')) {
    return 'video/mp4';
  }
  if (normalized.endsWith('.webm')) {
    return 'video/webm';
  }
  if (normalized.endsWith('.mov')) {
    return 'video/quicktime';
  }
  return 'video/mp4';
}

function getDemoVideoSources(demo, robot = 'car', type = 'ori') {
  if (demo.videoPath) {
    return [{ src: demo.videoPath, type: getVideoMimeTypeByPath(demo.videoPath) }];
  }

  const categoryPath = getVideoCategoryPath(robot, type);
  const footageName = demo.folder.replace('bagfile_', '');
  return [
    {
      src: `${VIDEO_BASE_DIR}/${categoryPath}/${demo.folder}/${demo.folder}_final_vp9.webm`,
      type: 'video/webm'
    },
    {
      src: `${VIDEO_BASE_DIR}/${categoryPath}/${demo.folder}/${footageName}_footage_vp9.webm`,
      type: 'video/webm'
    }
  ];
}

// Top banner carousel state
let currentVideoSlide = 0;
let youtubePlayers = [];

function enforceMutedVideo(videoElement) {
  if (!videoElement) {
    return;
  }

  const applyMuteState = () => {
    videoElement.defaultMuted = true;
    videoElement.muted = true;
    videoElement.volume = 0;
  };

  applyMuteState();

  if (videoElement.dataset.forceMutedBound === 'true') {
    return;
  }

  videoElement.addEventListener('volumechange', () => {
    if (!videoElement.muted || videoElement.volume !== 0) {
      applyMuteState();
    }
  });

  videoElement.dataset.forceMutedBound = 'true';
}

function hardenVideoElement(videoElement) {
  if (!videoElement) {
    return;
  }

  videoElement.setAttribute('controlsList', 'nodownload noremoteplayback');
  videoElement.setAttribute('disablePictureInPicture', '');
  videoElement.setAttribute('disableRemotePlayback', '');
  videoElement.controlsList?.add('nodownload');
  videoElement.controlsList?.add('noremoteplayback');
  videoElement.disablePictureInPicture = true;
  videoElement.disableRemotePlayback = true;

  if (videoElement.dataset.contextMenuBlocked === 'true') {
    return;
  }

  videoElement.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  videoElement.dataset.contextMenuBlocked = 'true';
}

function createSvgPlaceholderDataUri(label, kind = 'generic', width = 1280, height = 720) {
  const safeLabel = (label || 'Placeholder')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');

  let colorA = '#eef1f5';
  let colorB = '#dce3ea';
  let colorC = '#5f6b76';
  let badge = 'IMG';

  if (kind === 'storyboard') {
    colorA = '#e8f1ff';
    colorB = '#d6e7ff';
    colorC = '#2c5aa0';
    badge = 'FRAME';
  } else if (kind === 'table') {
    colorA = '#f3ebff';
    colorB = '#e5d8fb';
    colorC = '#6d3ea8';
    badge = 'TABLE';
  }

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><rect width='100%' height='100%' fill='${colorA}'/><rect x='18' y='18' width='${width - 36}' height='${height - 36}' rx='20' fill='${colorB}' stroke='#b8c2cc' stroke-width='4'/><rect x='40' y='40' width='170' height='62' rx='10' fill='${colorC}' opacity='0.85'/><text x='125' y='80' text-anchor='middle' dominant-baseline='middle' font-family='Noto Sans, Arial, sans-serif' font-size='28' fill='#ffffff'>${badge}</text><text x='50%' y='56%' text-anchor='middle' dominant-baseline='middle' font-family='Noto Sans, Arial, sans-serif' font-size='44' fill='${colorC}'>${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createHeadingIconDataUri(keyword) {
  const key = (keyword || 'generic').toLowerCase();
  const iconMap = {
    'contributions': {
      bg: '#eaf2ff',
      accent: '#2563eb',
      detail: '#1d4ed8',
      glyph: `<circle cx='32' cy='24' r='11' fill='none' stroke='#1d4ed8' stroke-width='3'/><rect x='27' y='35' width='10' height='8' rx='2' fill='#1d4ed8'/><rect x='24' y='43' width='16' height='4' rx='2' fill='#1d4ed8'/>`
    },
    'one-shot demo': {
      bg: '#eaf2ff',
      accent: '#2563eb',
      detail: '#1d4ed8',
      glyph: `<polygon points='26,20 45,32 26,44' fill='#1d4ed8'/><rect x='16' y='18' width='5' height='28' rx='2' fill='#1d4ed8'/>`
    },
    'single-floor': {
      bg: '#eaf2ff',
      accent: '#2563eb',
      detail: '#1d4ed8',
      glyph: `<rect x='16' y='28' width='32' height='16' rx='3' fill='#1d4ed8'/><rect x='20' y='18' width='24' height='6' rx='2' fill='#2563eb'/><rect x='29' y='33' width='6' height='11' rx='1.5' fill='#dbeafe'/><circle cx='37.5' cy='38.5' r='1.2' fill='#dbeafe'/>`
    },
    'cross-floor': {
      bg: '#eaf2ff',
      accent: '#2563eb',
      detail: '#1d4ed8',
      glyph: `<path d='M18 45h28v-5h-7v-5h-7v-5h-7v-5h-7z' fill='#1d4ed8'/><path d='M24 20l10-10m0 0h-6m6 0v6' stroke='#2563eb' stroke-width='3' stroke-linecap='round' stroke-linejoin='round' fill='none'/>`
    },
    'generic': {
      bg: '#eaf2ff',
      accent: '#2563eb',
      detail: '#1d4ed8',
      glyph: `<rect x='19' y='20' width='26' height='24' rx='5' fill='none' stroke='#1d4ed8' stroke-width='3'/><circle cx='27' cy='29' r='3' fill='#1d4ed8'/><path d='M22 40l8-7 6 5 5-5 3 7H22z' fill='#1d4ed8'/>`
    }
  };

  const icon = iconMap[key] || iconMap.generic;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${icon.bg}'/><rect x='6' y='6' width='52' height='52' rx='12' fill='none' stroke='${icon.accent}' stroke-width='3'/>${icon.glyph}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function applyKeywordHeadingIcons() {
  const headingIconRules = [
    { keyword: 'contributions', selector: '.text-image-container.title' },
    { keyword: 'one-shot demo', selector: 'h2.title.is-3' },
    { keyword: 'single-floor', selector: 'h2.title.is-3' },
    { keyword: 'cross-floor', selector: 'h2.title.is-3' }
  ];

  headingIconRules.forEach((rule) => {
    document.querySelectorAll(rule.selector).forEach((container) => {
      const text = (container.textContent || '').toLowerCase();
      if (!text.includes(rule.keyword)) {
        return;
      }

      const iconImg = container.querySelector('img');
      if (!iconImg) {
        return;
      }

      // Keep first match priority (e.g., One-Shot Demo should not be overwritten by Cross-Floor keyword).
      if (iconImg.dataset.iconKeyword) {
        return;
      }

      iconImg.src = createHeadingIconDataUri(rule.keyword);
      iconImg.alt = rule.keyword;
      iconImg.dataset.iconKeyword = rule.keyword;
      iconImg.classList.add('heading-keyword-icon');
    });
  });
}

function createVideoPlaceholderNode(label) {
  const node = document.createElement('div');
  node.className = 'video-placeholder';
  node.textContent = label;
  return node;
}

function getImageFallbackKind(src) {
  const normalized = (src || '').toLowerCase();
  if (normalized.includes('/storyboard/')) {
    return 'storyboard';
  }
  if (normalized.includes('/tables/')) {
    return 'table';
  }
  return 'generic';
}

function applyImageFallbacks() {
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    const originalSrc = img.getAttribute('src') || '';
    if (!originalSrc || originalSrc.startsWith('data:image/svg+xml')) {
      return;
    }

    const onError = () => {
      if (img.dataset.fallbackApplied === 'true') {
        return;
      }
      const label = img.alt && img.alt.trim() ? img.alt.trim() : 'Image Placeholder';
      const kind = getImageFallbackKind(originalSrc);
      img.src = createSvgPlaceholderDataUri(label, kind, 1200, 675);
      img.classList.add('media-placeholder-image');
      img.dataset.fallbackApplied = 'true';
    };

    img.addEventListener('error', onError, { once: true });

    // If load already failed before handler registration, apply fallback immediately.
    if (img.complete && img.naturalWidth === 0) {
      onError();
    }
  });
}

// Load YouTube IFrame API
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// This function will be called when YouTube API is ready
window.onYouTubeIframeAPIReady = function() {
  const iframes = document.querySelectorAll('.video-slide iframe');
  iframes.forEach((iframe, index) => {
    const player = new YT.Player(iframe, {
      events: {
        'onReady': function(event) {
          event.target.mute();
          event.target.setVolume(0);
          youtubePlayers[index] = event.target;
        }
      }
    });
  });
};

// Function to pause all YouTube videos
function pauseAllYouTubeVideos() {
  // Try using the player objects if available
  if (youtubePlayers.length > 0) {
    youtubePlayers.forEach(player => {
      if (player && player.pauseVideo) {
        player.pauseVideo();
      }
    });
  }
  
  // Fallback to postMessage method
  const iframes = document.querySelectorAll('.video-slide iframe');
  iframes.forEach(iframe => {
    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  });
}

function setActiveVideoSlide(slideIndex) {
  const slides = document.querySelectorAll('.video-slide');
  const dots = document.querySelectorAll('.carousel-dots .dot');

  if (slides.length === 0) {
    currentVideoSlide = 0;
    return;
  }

  const normalizedIndex = ((slideIndex % slides.length) + slides.length) % slides.length;

  slides.forEach((slide, index) => {
    const isActive = index === normalizedIndex;
    slide.classList.toggle('active', isActive);
    slide.style.display = isActive ? 'block' : 'none';
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === normalizedIndex);
  });

  currentVideoSlide = normalizedIndex;
}

// Change video slide function
function changeVideoSlide(direction) {
  pauseAllYouTubeVideos();
  setActiveVideoSlide(currentVideoSlide + direction);
}

// Go to specific slide
function goToVideoSlide(slideIndex) {
  pauseAllYouTubeVideos();
  setActiveVideoSlide(slideIndex);
}

// Initialize video carousel on page load
function initVideoCarousel() {
  setActiveVideoSlide(0);
}

function initHighlightLocalVideo() {
  const highlightVideo = document.getElementById('highlightLocalVideo');
  const playButton = document.getElementById('highlightPlayButton');
  const progressTrack = document.getElementById('highlightProgressTrack');
  const progressBar = document.getElementById('highlightProgressBar');
  const timeDisplay = document.getElementById('highlightTimeDisplay');
  const videoWrapper = highlightVideo ? highlightVideo.closest('.publication-video') : null;
  if (!highlightVideo || highlightVideo.dataset.initialized === 'true') {
    return;
  }

  highlightVideo.dataset.initialized = 'true';
  highlightVideo.dataset.hasStarted = 'false';
  highlightVideo.dataset.loaded = 'false';
  enforceMutedVideo(highlightVideo);
  hardenVideoElement(highlightVideo);
  ensureVideoLoaded(highlightVideo);

  let hideControlsTimer = null;

  const formatVideoTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainderSeconds = totalSeconds % 60;
    return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
  };

  const syncHighlightProgress = () => {
    if (!progressBar || !timeDisplay) {
      return;
    }

    const duration = Number.isFinite(highlightVideo.duration) ? highlightVideo.duration : 0;
    const currentTime = Number.isFinite(highlightVideo.currentTime) ? highlightVideo.currentTime : 0;
    const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

    progressBar.style.width = `${progressPercent}%`;
    timeDisplay.textContent = `${formatVideoTime(currentTime)} / ${formatVideoTime(duration)}`;
  };

  const clearHideControlsTimer = () => {
    if (!hideControlsTimer) {
      return;
    }
    clearTimeout(hideControlsTimer);
    hideControlsTimer = null;
  };

  const scheduleHideControls = () => {
    clearHideControlsTimer();
    if (highlightVideo.paused || highlightVideo.ended) {
      return;
    }

    hideControlsTimer = window.setTimeout(() => {
      playButton?.classList.add('is-idle');
      hideControlsTimer = null;
    }, 1000);
  };

  const syncHighlightPlayButton = () => {
    if (!playButton) {
      return;
    }

    const isPlaying = !highlightVideo.paused && !highlightVideo.ended;
    playButton.classList.toggle('is-playing', isPlaying);
    playButton.classList.remove('is-idle');
    playButton.setAttribute('aria-label', isPlaying ? 'Pause highlight video' : 'Play highlight video');

    if (isPlaying) {
      scheduleHideControls();
    } else {
      clearHideControlsTimer();
    }
  };

  const toggleHighlightPlayback = () => {
    if (!highlightVideo.paused && !highlightVideo.ended) {
      highlightVideo.pause();
      return;
    }

    if (highlightVideo.ended || (Number.isFinite(highlightVideo.duration) && highlightVideo.currentTime >= Math.max(highlightVideo.duration - 0.05, 0))) {
      try {
        highlightVideo.currentTime = 0;
      } catch (error) {
        console.log('Highlight video restart failed:', error);
      }
    }

    highlightVideo.dataset.hasStarted = 'true';
    highlightVideo.play().catch((error) => console.log('Highlight video play failed:', error));
  };

  if (playButton) {
    playButton.addEventListener('click', () => {
      toggleHighlightPlayback();
    });
  }

  if (progressTrack) {
    progressTrack.addEventListener('click', (event) => {
      const rect = progressTrack.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      const duration = Number.isFinite(highlightVideo.duration) ? highlightVideo.duration : 0;
      const targetTime = duration * ratio;
      const shouldResumePlayback = !highlightVideo.paused && !highlightVideo.ended;
      seekNativeVideo(highlightVideo, targetTime, { playAfterSeek: shouldResumePlayback });
    });
  }

  if (videoWrapper) {
    const revealControls = () => {
      if (highlightVideo.paused || highlightVideo.ended || !playButton) {
        return;
      }

      playButton.classList.remove('is-idle');
      scheduleHideControls();
    };

    videoWrapper.addEventListener('mouseenter', revealControls);
    videoWrapper.addEventListener('mousemove', revealControls);
  }

  highlightVideo.addEventListener('play', syncHighlightPlayButton);
  highlightVideo.addEventListener('pause', syncHighlightPlayButton);
  highlightVideo.addEventListener('ended', syncHighlightPlayButton);
  highlightVideo.addEventListener('loadeddata', syncHighlightPlayButton);
  highlightVideo.addEventListener('loadedmetadata', syncHighlightProgress);
  highlightVideo.addEventListener('timeupdate', syncHighlightProgress);
  highlightVideo.addEventListener('seeked', syncHighlightProgress);
  highlightVideo.addEventListener('ended', syncHighlightProgress);

  syncHighlightPlayButton();
  syncHighlightProgress();
}

function seekNativeVideo(videoElement, timeSeconds, options = {}) {
  if (!videoElement) {
    return;
  }

  const { playAfterSeek = true } = options;
  const requestId = String((Number(videoElement.dataset.seekRequestId || '0') + 1));
  videoElement.dataset.seekRequestId = requestId;

  clearDelayedReplaysInContainer(videoElement.parentElement || videoElement);
  videoElement.pause();
  ensureVideoLoaded(videoElement);

  const performSeek = () => {
    if (videoElement.dataset.seekRequestId !== requestId) {
      return;
    }

    const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : 0;
    const maxTime = duration > 0 ? Math.max(duration - 0.05, 0) : Number.POSITIVE_INFINITY;
    const safeTime = Math.max(0, Math.min(timeSeconds, maxTime));

    const completeSeek = () => {
      if (videoElement.dataset.seekRequestId !== requestId) {
        return;
      }

      if (playAfterSeek) {
        videoElement.dataset.hasStarted = 'true';
        videoElement.play().catch((error) => console.log('Highlight video play failed:', error));
      }
    };

    if (Math.abs(videoElement.currentTime - safeTime) < 0.02) {
      completeSeek();
      return;
    }

    videoElement.addEventListener('seeked', completeSeek, { once: true });

    try {
      videoElement.currentTime = safeTime;
    } catch (error) {
      console.log('Highlight video seek failed:', error);
      completeSeek();
    }
  };

  if (videoElement.readyState >= 1) {
    performSeek();
  } else {
    videoElement.addEventListener('loadedmetadata', performSeek, { once: true });
  }
}

const BENCHMARK_VIDEO_CONFIG = {
  DOWNSTAIR: {
    label: 'Downstairs',
    target: 'tv',
    ours: './video/sim/downstair/ours/downstair_ours.mp4',
    apexnav: './video/sim/downstair/apexnav/downstair_apexnav.mp4'
  },
  UPSTAIR: {
    label: 'Upstairs',
    target: 'bed',
    ours: './video/sim/upstair/ours/upstair_ours.mp4',
    apexnav: './video/sim/upstair/apexnav/upstair_apexnav.mp4'
  },
  MIDSTAIR: {
    label: 'Mid-stairs',
    target: 'bed',
    ours: './video/sim/midstair/ours/midstair_ours.mp4',
    apexnav: './video/sim/midstair/apexnav/midstair_apexnav.mp4'
  },
  SINGLE: {
    label: 'Single Floor',
    target: 'toilet',
    ours: './video/sim/single/ours/single_ours.mp4',
    apexnav: './video/sim/single/apexnav/single_apexnav.mp4'
  }
};

const benchmarkSyncState = {
  token: 0,
  restartTimer: null
};

function clearBenchmarkRestartTimer() {
  if (!benchmarkSyncState.restartTimer) {
    return;
  }

  clearTimeout(benchmarkSyncState.restartTimer);
  benchmarkSyncState.restartTimer = null;
}

function resetBenchmarkComparisonState() {
  benchmarkSyncState.token += 1;
  clearBenchmarkRestartTimer();

  ['bmk-ours', 'bmk-racer'].forEach((id) => {
    const container = document.getElementById(id);
    if (container) {
      pauseVideosInContainer(container, { resetToStart: true });
    }
  });
}

function renderBenchmarkPlaceholder(container, sceneLabel, methodLabel, methodClass) {
  if (!container) {
    return;
  }

  pauseVideosInContainer(container, { resetToStart: true });
  container.classList.add('bmk-video-placeholder');
  container.innerHTML = '<span class="bmk-placeholder-scene">' + sceneLabel + ' - </span><span class="bmk-placeholder-method ' + methodClass + '">' + methodLabel + '</span>';
}

function appendBenchmarkTargetBadge(container, targetText) {
  if (!container || !targetText) {
    return;
  }

  const badgeElement = document.createElement('div');
  badgeElement.className = 'bmk-target-badge';
  badgeElement.innerHTML = 'Find the <span class="highlight-target">' + targetText + '</span>.';
  container.appendChild(badgeElement);
}

function renderBenchmarkVideo(container, videoPath, sceneLabel, methodLabel, methodClass, targetText) {
  if (!container) {
    return null;
  }

  if (!videoPath) {
    renderBenchmarkPlaceholder(container, sceneLabel, methodLabel, methodClass);
    appendBenchmarkTargetBadge(container, targetText);
    return null;
  }

  pauseVideosInContainer(container, { resetToStart: true });
  container.classList.remove('bmk-video-placeholder');
  container.innerHTML = '';

  const videoElement = document.createElement('video');
  videoElement.className = 'bmk-video-media';
  videoElement.setAttribute('muted', '');
  videoElement.setAttribute('playsinline', '');
  videoElement.setAttribute('preload', 'auto');
  videoElement.dataset.loaded = 'false';
  enforceMutedVideo(videoElement);
  hardenVideoElement(videoElement);

  const sourceElement = document.createElement('source');
  sourceElement.src = videoPath;
  sourceElement.type = getVideoMimeTypeByPath(videoPath);
  videoElement.appendChild(sourceElement);

  videoElement.addEventListener('error', () => {
    renderBenchmarkPlaceholder(container, sceneLabel, methodLabel, methodClass);
    appendBenchmarkTargetBadge(container, targetText);
  }, { once: true });

  container.appendChild(videoElement);
  appendBenchmarkTargetBadge(container, targetText);
  return videoElement;
}

function setupSynchronizedBenchmarkPlayback(videos, token) {
  const videoList = Array.from(videos || []).filter(Boolean);
  if (videoList.length === 0) {
    return;
  }

  const endedStates = new WeakMap();
  videoList.forEach((video) => {
    endedStates.set(video, false);
    video.removeAttribute('loop');
    video.loop = false;
  });

  const playBenchmarkGroup = (options = {}) => {
    if (benchmarkSyncState.token !== token) {
      return;
    }

    videoList.forEach((video) => endedStates.set(video, false));
    loadAndPlayVideoGroup(videoList, options);
  };

  videoList.forEach((video) => {
    video.addEventListener('play', () => {
      if (benchmarkSyncState.token !== token) {
        return;
      }

      endedStates.set(video, false);
      clearBenchmarkRestartTimer();
    });

    video.addEventListener('ended', () => {
      if (benchmarkSyncState.token !== token) {
        return;
      }

      endedStates.set(video, true);
      const allEnded = videoList.every((item) => endedStates.get(item) === true);
      if (!allEnded) {
        return;
      }

      clearBenchmarkRestartTimer();
      benchmarkSyncState.restartTimer = window.setTimeout(() => {
        benchmarkSyncState.restartTimer = null;
        playBenchmarkGroup({ resetToStart: true });
      }, VIDEO_REPLAY_DELAY_MS);
    });
  });

  playBenchmarkGroup();
}

function updateBenchmarkMedia(sceneKey) {
  const sceneConfig = BENCHMARK_VIDEO_CONFIG[sceneKey];
  if (!sceneConfig) {
    return;
  }

  resetBenchmarkComparisonState();
  const syncToken = benchmarkSyncState.token;

  const oursVideo = renderBenchmarkVideo(
    document.getElementById('bmk-ours'),
    sceneConfig.ours,
    sceneConfig.label,
    'TravExplorer',
    'bmk-placeholder-method-ours',
    sceneConfig.target
  );

  const apexVideo = renderBenchmarkVideo(
    document.getElementById('bmk-racer'),
    sceneConfig.apexnav,
    sceneConfig.label,
    'ApexNav',
    'bmk-placeholder-method-racer',
    sceneConfig.target
  );

  setupSynchronizedBenchmarkPlayback([oursVideo, apexVideo], syncToken);
}

function initBenchmarkComparison() {
  var currentScene = 'DOWNSTAIR';

  updateBenchmarkMedia(currentScene);

  var sceneTabs = document.querySelectorAll('.bmk-tab');
  if (sceneTabs.length === 0) return;

  sceneTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      sceneTabs.forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      currentScene = tab.dataset.scene;
      updateBenchmarkMedia(currentScene);
    });
  });
}

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}

// Lazy loading video observer
let videoObserver = null;
const nextPagePreloadTimers = {};

function clearDelayedReplayForGroup(loopGroup) {
  if (!loopGroup || !loopGroup.__delayedReplayTimer) {
    return;
  }

  clearTimeout(loopGroup.__delayedReplayTimer);
  loopGroup.__delayedReplayTimer = null;
}

function clearDelayedReplaysInContainer(container) {
  if (!container) {
    return;
  }

  if (container.__delayedReplayTimer) {
    clearDelayedReplayForGroup(container);
  }

  if (container.matches && container.matches('.video-pair-videos, .modal-video-pair, .bmk-video')) {
    clearDelayedReplayForGroup(container);
  }

  container.querySelectorAll('.video-pair-videos, .modal-video-pair, .bmk-video').forEach((group) => {
    clearDelayedReplayForGroup(group);
  });
}

function pauseVideosInContainer(container, options = {}) {
  if (!container) {
    return;
  }

  const { resetToStart = false } = options;
  clearDelayedReplaysInContainer(container);

  container.querySelectorAll('video').forEach((video) => {
    video.pause();
    if (resetToStart) {
      try {
        video.currentTime = 0;
      } catch (error) {
        console.log('Reset video time failed:', error);
      }
    }
  });
}

function attachDelayedReplay(video, loopGroup) {
  if (!video || video.dataset.delayedReplayAttached === 'true') {
    return;
  }

  video.dataset.delayedReplayAttached = 'true';
  video.removeAttribute('loop');
  video.loop = false;

  const replayGroup = loopGroup || video.parentElement || video;

  video.addEventListener('ended', () => {
    if (replayGroup.__delayedReplayTimer) {
      return;
    }

    replayGroup.__delayedReplayTimer = window.setTimeout(() => {
      replayGroup.__delayedReplayTimer = null;

      const groupedVideos = replayGroup.querySelectorAll
        ? replayGroup.querySelectorAll('video')
        : [video];

      loadAndPlayVideoGroup(groupedVideos, { resetToStart: true });
    }, VIDEO_REPLAY_DELAY_MS);
  });

  video.addEventListener('play', () => {
    clearDelayedReplayForGroup(replayGroup);
  });

  video.addEventListener('pause', () => {
    if (!video.ended) {
      clearDelayedReplayForGroup(replayGroup);
    }
  });
}

function ensureVideoLoaded(video) {
  if (!video || video.dataset.loaded === 'true') {
    return;
  }

  video.load();
  video.dataset.loaded = 'true';
}

function loadAndPlayVideoGroup(videos, options = {}) {
  const videoList = Array.from(videos || []);
  if (videoList.length === 0) {
    return;
  }

  const { resetToStart = false } = options;

  videoList.forEach((video) => {
    ensureVideoLoaded(video);
  });

  const startPlayback = () => {
    videoList.forEach((video) => {
      if (resetToStart) {
        try {
          video.currentTime = 0;
        } catch (error) {
          console.log('Reset video time failed:', error);
        }
      }
      video.play().catch((error) => console.log('Video play failed:', error));
    });
  };

  const pendingVideos = videoList.filter((video) => video.readyState < 2);
  if (pendingVideos.length === 0) {
    startPlayback();
    return;
  }

  let remaining = pendingVideos.length;
  const handleReady = () => {
    remaining -= 1;
    if (remaining === 0) {
      startPlayback();
    }
  };

  pendingVideos.forEach((video) => {
    video.addEventListener('canplay', handleReady, { once: true });
  });
}

function loadAndPlayVideosInPage(pageElement, options = {}) {
  if (!pageElement) {
    return;
  }

  const videos = pageElement.querySelectorAll('video');
  loadAndPlayVideoGroup(videos, options);
}

function preloadVideoFirstFrame(video) {
  if (!video) {
    return;
  }

  ensureVideoLoaded(video);

  if (video.readyState >= 2) {
    video.dataset.firstFrameReady = 'true';
    video.dataset.firstFramePending = 'false';
    return;
  }

  if (video.dataset.firstFramePending === 'true') {
    return;
  }

  video.dataset.firstFramePending = 'true';
  video.addEventListener('loadeddata', () => {
    video.dataset.firstFrameReady = 'true';
    video.dataset.firstFramePending = 'false';
  }, { once: true });
}

function preloadFirstFrameInPage(pageElement) {
  if (!pageElement) {
    return;
  }

  const videos = pageElement.querySelectorAll('video');
  videos.forEach((video) => {
    preloadVideoFirstFrame(video);
  });
}

function scheduleNextPageFirstFramePreload({ timerKey, pagePrefix, currentPageIndex, totalPages, delay = 700 }) {
  if (nextPagePreloadTimers[timerKey]) {
    clearTimeout(nextPagePreloadTimers[timerKey]);
  }

  if (!totalPages || totalPages <= 1) {
    return;
  }

  nextPagePreloadTimers[timerKey] = setTimeout(() => {
    const nextPageIndex = (currentPageIndex + 1) % totalPages;
    const nextPageElement = document.getElementById(`${pagePrefix}${nextPageIndex + 1}`);
    preloadFirstFrameInPage(nextPageElement);
  }, delay);
}

// Initialize lazy loading for videos
function initLazyLoadVideos() {
  // Check if Intersection Observer is supported
  if (!('IntersectionObserver' in window)) {
    console.log('IntersectionObserver not supported, loading all videos');
    return;
  }
  
  // Create observer with options
  const observerOptions = {
    root: null, // viewport
    rootMargin: '200px', // Start loading 200px before entering viewport
    threshold: 0.01 // Trigger when 1% visible
  };
  
  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const cell = entry.target;
      const videos = cell.querySelectorAll('video');
      
      if (entry.isIntersecting) {
        loadAndPlayVideoGroup(videos);
      } else {
        // Video cell is not visible - pause videos to save resources
        pauseVideosInContainer(cell);
      }
    });
  }, observerOptions);
  
  // Observe all demo cells
  const allDemoCells = document.querySelectorAll('.demo-cell:not(.empty)');
  allDemoCells.forEach(cell => {
    videoObserver.observe(cell);
  });
  
  console.log(`Lazy loading initialized for ${allDemoCells.length} video cells`);
}


$(document).ready(function() {
    applyKeywordHeadingIcons();
    applyImageFallbacks();
    document.querySelectorAll('video').forEach((video) => {
      enforceMutedVideo(video);
      hardenVideoElement(video);
    });
    initHighlightLocalVideo();

    // Initialize video carousel - ensure first slide is visible
    initVideoCarousel();
    
    // Load YouTube API for volume control
    if (!USE_MEDIA_PLACEHOLDERS) {
      loadYouTubeAPI();
    }
    
    initBenchmarkComparison();

    // Initialize real-world galleries
    initG1OriGallery();
    initG1SelfGallery();
    
    // Initialize lazy loading for videos
    initLazyLoadVideos();

    scheduleNextPageFirstFramePreload({
      timerKey: 'g1Ori',
      pagePrefix: 'g1OriPage',
      currentPageIndex: currentG1OriGalleryPage,
      totalPages: totalG1OriPages,
      delay: 1000
    });
    scheduleNextPageFirstFramePreload({
      timerKey: 'g1Self',
      pagePrefix: 'g1SelfPage',
      currentPageIndex: currentG1SelfGalleryPage,
      totalPages: totalG1SelfPages,
      delay: 1000
    });
    
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    // Initialize YouTube video carousel with specific settings
    var youtubeCarouselElement = document.getElementById('results-carousel');
    if (youtubeCarouselElement) {
      var youtubeOptions = {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 5000,
        pagination: true,
        navigation: true
      }
      
      var youtubeCarousel = bulmaCarousel.attach('#results-carousel', youtubeOptions);
      console.log('YouTube carousel initialized:', youtubeCarousel);
    }

    // Initialize other carousels
    var options = {
			slidesToScroll: 1,
			slidesToShow: 1,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all other div with carousel class (excluding results-carousel)
    var carousels = bulmaCarousel.attach('.carousel:not(#results-carousel)', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    preloadInterpolationImages();

    $('#interpolation-slider').on('input', function(event) {
      setInterpolationImage(this.value);
    });
    setInterpolationImage(0);
    $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

    bulmaSlider.attach();

})

// Car dataset group A (legacy path: car/ori) - shown as baseline object navigation
const demoData = [
  { name: "FRC Cabinet 1", folder: "bagfile_frc_cabinet_1" },
  { name: "Katia Sofa 2", folder: "bagfile_katia_sofa_2" },
  { name: "Katia Ref 2", folder: "bagfile_katia_ref_2" },
  { name: "NSH Oven 1", folder: "bagfile_nsh_oven_1" },
  { name: "Katia Cabinet 1", folder: "bagfile_katia_cabinet_1" },
  { name: "Katia Sofa 1", folder: "bagfile_katia_sofa_1" },

  // FRC demos (6)
  { name: "FRC Cabinet 2", folder: "bagfile_frc_cabinet_2" },
  { name: "Katia Ref 1", folder: "bagfile_katia_ref_1" },
  { name: "NSH Oven 2", folder: "bagfile_nsh_oven_2" },
  { name: "Katia Trash Can 1", folder: "bagfile_katia_trash_can_1" },
  { name: "NSH Oven 3", folder: "bagfile_nsh_oven_3" },
  { name: "FRC Sofa 1", folder: "bagfile_frc_sofa_1" },

  { name: "FRC Sofa 2", folder: "bagfile_frc_sofa_2" },
  { name: "Katia Whiteboard 1", folder: "bagfile_katia_whiteboard_1" },
  { name: "NSH Ref 1", folder: "bagfile_nsh_ref_1" },
  { name: "Katia Whiteboard 2", folder: "bagfile_katia_whiteboard_2" },
  { name: "NSH Ref 2", folder: "bagfile_nsh_ref_2" },
  { name: "FRC Sofa 3", folder: "bagfile_frc_sofa_3" },

  { name: "NSH Sofa 2", folder: "bagfile_nsh_sofa_2" },
  { name: "NSH Sofa 3", folder: "bagfile_nsh_sofa_3" },
  { name: "FRC Whiteboard 1", folder: "bagfile_frc_whiteboard_1" },
  { name: "NSH Whiteboard 1", folder: "bagfile_nsh_whiteboard_1" },
  { name: "NSH Whiteboard 2", folder: "bagfile_nsh_whiteboard_2" }
];

// Car dataset group B (legacy path: car/self) - displayed as Sim Single-Floor
const selfDemoData = [
  { name: "FRC Self Chair 1", folder: "bagfile_frc_self_chair_1" },
  { name: "NSH 3 Self Chair Black 2", folder: "bagfile_nsh_3_self_chair_black_2" },
  { name: "FRC Self Whiteboard 1", folder: "bagfile_frc_self_whiteboard_1" },
  { name: "FRC Self Trash Can Blue 1", folder: "bagfile_frc_self_trash_can_blue_1" },
  
  { name: "FRC Self Monitor Open 1", folder: "bagfile_frc_self_monitor_open_1" },
  { name: "FRC Self Chair 2", folder: "bagfile_frc_self_chair_2" },
  { name: "FRC Self Whiteboard 2", folder: "bagfile_frc_self_whiteboard_2" },
  { name: "NSH 3 Self Chair Black 1", folder: "bagfile_nsh_3_self_chair_black_1" },

  { name: "FRC Self Monitor Open 2", folder: "bagfile_frc_self_monitor_open_2" },
  { name: "FRC Self Trash Can Blue 2", folder: "bagfile_frc_self_trash_can_blue_2" },
];

// Car dataset group C (legacy path: car/spatial) - displayed as Sim Cross-Floor
const spatialDemoData = [
  { name: "FRC Spatial Bag Hang 1", folder: "bagfile_frc_spatial_bag_hang_1" },
  { name: "FRC Spatial Bag Sofa 1", folder: "bagfile_frc_spatial_bag_sofa_1" },
  { name: "FRC Spatial Person 1", folder: "bagfile_frc_spatial_person_1" },
  { name: "FRC Spatial Person 2", folder: "bagfile_frc_spatial_person_2" },
  { name: "FRC Spatial Person Chair 1", folder: "bagfile_frc_spatial_person_chair_1" },
  { name: "FRC Spatial Desk 1", folder: "bagfile_frc_spatial_desk_1" },
];

// Go2 dataset group A (legacy path: go2/ori) - displayed as Sim Single-Floor
const go2OriDemoData = [
  { name: "FRC 1th Coffee 1", folder: "bagfile_frc_1th_coffee_1" },
  { name: "FRC 1th TV Monitor 1", folder: "bagfile_frc_1th_tv_monitor_1" },
  { name: "FRC Whiteboard 1", folder: "bagfile_frc_whiteboard_1" },
  { name: "FRC 1th Ref 1", folder: "bagfile_frc_1th_ref_1" },

  { name: "Gates Plant 1", folder: "bagfile_gates_plant_1" },
  { name: "FRC 1th Oven 1", folder: "bagfile_frc_1th_oven_1" },
  { name: "FRC Sofa 1", folder: "bagfile_frc_sofa_1" },
];

// Go2 dataset group B (legacy path: go2/self) - displayed as Sim Cross-Floor (set A)
const go2SelfDemoData = [
  { name: "HCI Self Chair 1", folder: "bagfile_hci_self_chair_1" },
  { name: "Gates Self Chair 2", folder: "bagfile_gates_self_chair_2" },
  { name: "FRC 1th Self Sofa 1", folder: "bagfile_frc_1th_self_sofa_1" },
  { name: "FRC Self Trash Can 1", folder: "bagfile_frc_self_trash_can_1" },

  { name: "Gates Self Chair 1", folder: "bagfile_gates_self_chair_1" },
  { name: "HCI Self Trash Can 1", folder: "bagfile_hci_self_trash_can_1" },
];

// Go2 dataset group C (legacy path: go2/spatial) - displayed as Sim Cross-Floor (set B)
const go2SpatialDemoData = [
  { name: "HCI Spatial Person 1", folder: "bagfile_hci_spatial_person_1" },
  { name: "FRC 1th Spatial Person", folder: "bagfile_frc_1th_spatial_person" },
  { name: "FRC Spatial Bag 1", folder: "bagfile_frc_spatial_bag_1" },
  { name: "HCI Spatial Person 2", folder: "bagfile_hci_spatial_person_2" },

  { name: "FRC Spatial Person 1", folder: "bagfile_frc_spatial_person_1" },
];

function makeRealVideoDemo(mode, objectKey, filename) {
  const targetMap = {
    bed: 'bed',
    chair: 'chair',
    laptop: 'laptop',
    plant: 'plant',
    robot: 'quadruped robot',
    toilet: 'toilet',
    trash: 'trash bin',
    washing: 'washing machine'
  };

  const target = targetMap[objectKey] || objectKey;
  const stem = filename.replace(/\.[^.]+$/, '');

  return {
    name: target,
    folder: `${mode}-${objectKey}-${stem}`,
    videoPath: `./video/real/${mode}/${objectKey}/${filename}`,
    fullInstruction: `Find the ${target}.`,
    target: target
  };
}

// G1 dataset group A (legacy path: g1/ori) - displayed as Real Single-Floor
const g1OriDemoData = [
  makeRealVideoDemo('single', 'laptop', 'labtop1.mp4'),
  makeRealVideoDemo('single', 'laptop', 'laptop2.mp4'),
  makeRealVideoDemo('single', 'laptop', 'laptop3.mp4'),
  makeRealVideoDemo('single', 'trash', 'trash1.mp4'),
  makeRealVideoDemo('single', 'trash', 'trash2.mp4'),
  makeRealVideoDemo('single', 'trash', 'trash3.mp4'),
  makeRealVideoDemo('single', 'robot', 'robot1.mp4'),
  makeRealVideoDemo('single', 'robot', 'robot2.mp4'),
  makeRealVideoDemo('single', 'robot', 'robot3.mp4'),
  makeRealVideoDemo('single', 'chair', 'chair1.mp4'),
  makeRealVideoDemo('single', 'chair', 'chair2.mp4'),
  makeRealVideoDemo('single', 'chair', 'chair3.mp4'),
  makeRealVideoDemo('single', 'bed', 'bed1.mp4'),
  makeRealVideoDemo('single', 'bed', 'bed2.mp4'),
  makeRealVideoDemo('single', 'bed', 'bed3.mp4'),
  makeRealVideoDemo('single', 'plant', 'plant1.mp4'),
  makeRealVideoDemo('single', 'plant', 'plant2.mp4'),
  makeRealVideoDemo('single', 'plant', 'plant3.mp4'),
  makeRealVideoDemo('single', 'toilet', 'toilet1.mp4'),
  makeRealVideoDemo('single', 'toilet', 'toilet2.mp4'),
  makeRealVideoDemo('single', 'toilet', 'toilet3.mp4'),
  makeRealVideoDemo('single', 'washing', 'washing1.mp4'),
  makeRealVideoDemo('single', 'washing', 'washing2.mp4'),
  makeRealVideoDemo('single', 'washing', 'washing3.mp4')
];

// G1 dataset group B (legacy path: g1/self) - displayed as Real Cross-Floor
const g1SelfDemoData = [
  makeRealVideoDemo('cross', 'bed', 'bed1.mp4'),
  makeRealVideoDemo('cross', 'bed', 'bed2.mp4'),
  makeRealVideoDemo('cross', 'chair', 'chair1.mp4'),
  makeRealVideoDemo('cross', 'chair', 'chair2.mp4'),
  makeRealVideoDemo('cross', 'laptop', 'laptop1.mp4'),
  makeRealVideoDemo('cross', 'laptop', 'labtop2.mp4'),
  makeRealVideoDemo('cross', 'trash', 'trash1.mp4'),
  makeRealVideoDemo('cross', 'trash', 'trash2.mp4')
];

// G1 dataset group C (legacy path: g1/spatial) - displayed as Real Cross-Floor (set B)
const g1SpatialDemoData = [
  { name: "HCI TV 1", folder: "bagfile_hci_tv_1" },
  { name: "FRC Person 1", folder: "bagfile_frc_person_1" },
];

let currentGalleryPage = 0;
const totalPages = 4;
const demosPerPage = 6;

let currentSelfGalleryPage = 0;
const totalSelfPages = 3;
const selfDemosPerPage = 4;

let currentGo2OriGalleryPage = 0;
const totalGo2OriPages = 2;
const go2OriDemosPerPage = 4;

let currentGo2SelfGalleryPage = 0;
const totalGo2SelfPages = 2;
const go2SelfDemosPerPage = 4;

let currentGo2SpatialGalleryPage = 0;
const totalGo2SpatialPages = 2;
const go2SpatialDemosPerPage = 4;

let currentG1OriGalleryPage = 0;
const g1OriDemosPerPage = 6;
const totalG1OriPages = Math.max(1, Math.ceil(g1OriDemoData.length / g1OriDemosPerPage));

let currentG1SelfGalleryPage = 0;
const g1SelfDemosPerPage = 2;
const totalG1SelfPages = Math.max(1, Math.ceil(g1SelfDemoData.length / g1SelfDemosPerPage));

let currentG1SpatialGalleryPage = 0;
const totalG1SpatialPages = 1;
const g1SpatialDemosPerPage = 4;

// Initialize car group A gallery (legacy: car/ori)
function initDemoGallery() {
  // Use demos in the order specified in demoData array (no interleaving)
  const demos = demoData;
  
  // Fill each page with demos
  for (let page = 0; page < totalPages; page++) {
    const pageElement = document.getElementById(`page${page + 1}`);
    const startIdx = page * demosPerPage;
    const endIdx = Math.min(startIdx + demosPerPage, demos.length);
    
    for (let i = startIdx; i < startIdx + demosPerPage; i++) {
      if (i < demos.length) {
        const demo = demos[i];
        const demoCell = createDemoCell(demo, 'car', 'ori');
        pageElement.appendChild(demoCell);
      } else {
        // Add empty cell for the last position
        const emptyCell = document.createElement('div');
        emptyCell.className = 'demo-cell empty';
        pageElement.appendChild(emptyCell);
      }
    }
  }
  
  updateNavigationButtons();
}

// Initialize car group B gallery (displayed as Sim Single-Floor)
function initSelfGallery() {
  // Use demos in the order specified in selfDemoData array (no interleaving)
  const demos = selfDemoData;
  
  for (let page = 0; page < totalSelfPages; page++) {
    const pageElement = document.getElementById(`selfPage${page + 1}`);
    const startIdx = page * selfDemosPerPage;
    
    for (let i = startIdx; i < startIdx + selfDemosPerPage; i++) {
      if (i < demos.length) {
        const demo = demos[i];
        const demoCell = createDemoCell(demo, 'car', 'self');
        pageElement.appendChild(demoCell);
      }
    }
  }
  
  updateSelfNavigationButtons();
}

// Initialize car group C gallery (displayed as Sim Cross-Floor)
function initSpatialGallery() {
  // Use demos in the order specified in spatialDemoData array (no interleaving)
  const demos = spatialDemoData;
  
  const pageElement = document.getElementById('spatialPage1');
  
  demos.forEach(demo => {
    const demoCell = createDemoCell(demo, 'car', 'spatial');
    pageElement.appendChild(demoCell);
  });
}

// Initialize Go2 group A gallery (displayed as Sim Single-Floor)
function initGo2OriGallery() {
  // Use demos in the order specified in go2OriDemoData array (no interleaving)
  const demos = go2OriDemoData;
  
  for (let page = 0; page < totalGo2OriPages; page++) {
    const pageElement = document.getElementById(`go2OriPage${page + 1}`);
    const startIdx = page * go2OriDemosPerPage;
    
    for (let i = startIdx; i < startIdx + go2OriDemosPerPage; i++) {
      if (i < demos.length) {
        const demo = demos[i];
        const demoCell = createDemoCell(demo, 'go2', 'ori');
        pageElement.appendChild(demoCell);
      }
    }
  }
  
  updateGo2OriNavigationButtons();
}

// Initialize Go2 group B gallery (displayed as Sim Cross-Floor, set A)
function initGo2SelfGallery() {
  // Use demos in the order specified in go2SelfDemoData array (no interleaving)
  const demos = go2SelfDemoData;
  
  for (let page = 0; page < totalGo2SelfPages; page++) {
    const pageElement = document.getElementById(`go2SelfPage${page + 1}`);
    const startIdx = page * go2SelfDemosPerPage;
    
    for (let i = startIdx; i < startIdx + go2SelfDemosPerPage; i++) {
      if (i < demos.length) {
        const demo = demos[i];
        const demoCell = createDemoCell(demo, 'go2', 'self');
        pageElement.appendChild(demoCell);
      }
    }
  }
  
  updateGo2SelfNavigationButtons();
}

// Initialize Go2 group C gallery (displayed as Sim Cross-Floor, set B)
function initGo2SpatialGallery() {
  // Use demos in the order specified in go2SpatialDemoData array (no interleaving)
  const demos = go2SpatialDemoData;
  
  for (let page = 0; page < totalGo2SpatialPages; page++) {
    const pageElement = document.getElementById(`go2SpatialPage${page + 1}`);
    const startIdx = page * go2SpatialDemosPerPage;
    
    for (let i = startIdx; i < startIdx + go2SpatialDemosPerPage; i++) {
      if (i < demos.length) {
        const demo = demos[i];
        const demoCell = createDemoCell(demo, 'go2', 'spatial');
        pageElement.appendChild(demoCell);
      }
    }
  }
  
  updateGo2SpatialNavigationButtons();
}

// Initialize G1 group A gallery (displayed as Real Single-Floor)
function initG1OriGallery() {
  // Use demos in the order specified in g1OriDemoData array (no interleaving)
  const demos = g1OriDemoData;
  
  for (let page = 0; page < totalG1OriPages; page++) {
    const pageElement = document.getElementById(`g1OriPage${page + 1}`);
    if (!pageElement) {
      continue;
    }

    const startIdx = page * g1OriDemosPerPage;
    const endIdx = Math.min(startIdx + g1OriDemosPerPage, demos.length);

    for (let i = startIdx; i < endIdx; i++) {
      const demo = demos[i];
      const demoCell = createDemoCell(demo, 'g1', 'ori');
      pageElement.appendChild(demoCell);
    }
  }

  updateG1OriNavigationButtons();
}

// Initialize G1 group B gallery (displayed as Real Cross-Floor)
function initG1SelfGallery() {
  // Use demos in the order specified in g1SelfDemoData array (no interleaving)
  const demos = g1SelfDemoData;
  
  for (let page = 0; page < totalG1SelfPages; page++) {
    const pageElement = document.getElementById(`g1SelfPage${page + 1}`);
    if (!pageElement) {
      continue;
    }

    const startIdx = page * g1SelfDemosPerPage;
    const endIdx = Math.min(startIdx + g1SelfDemosPerPage, demos.length);

    for (let i = startIdx; i < endIdx; i++) {
      const demo = demos[i];
      const demoCell = createDemoCell(demo, 'g1', 'self');
      pageElement.appendChild(demoCell);
    }
  }

  updateG1SelfNavigationButtons();
}

// Initialize G1 group C gallery (displayed as Real Cross-Floor, set B)
function initG1SpatialGallery() {
  // Use demos in the order specified in g1SpatialDemoData array (no interleaving)
  const demos = g1SpatialDemoData;
  
  // Only one page for 2 demos
  const pageElement = document.getElementById('g1SpatialPage1');
  
  demos.forEach(demo => {
    const demoCell = createDemoCell(demo, 'g1', 'spatial');
    pageElement.appendChild(demoCell);
  });
}

// Load instruction data for a demo
async function loadInstructionData(demo, robot = 'car', type = 'ori') {
  const cleanField = (value) => (value || '').toString().trim().replace(/%$/, '');

  if (demo.fullInstruction || demo.target || demo.attribute || demo.spatial) {
    return {
      fullInstruction: cleanField(demo.fullInstruction) || null,
      target: cleanField(demo.target) || cleanField(demo.name),
      attribute: cleanField(demo.attribute),
      spatial: cleanField(demo.spatial)
    };
  }

  try {
    const basePath = `./static/instructions/${robot}/${type}/${demo.folder}`;
    const instructionPath = `${basePath}/instruction.txt`;
    const targetPath = `${basePath}/target_object.txt`;
    const attributePath = `${basePath}/self_attribute.txt`;
    const spatialPath = `${basePath}/spatial_condition.txt`;
    
    // Try to fetch the complete instruction first
    const instructionResponse = await fetch(instructionPath).catch(() => null);
    
    if (instructionResponse && instructionResponse.ok) {
      const fullInstruction = await instructionResponse.text();
      const cleanInstruction = fullInstruction.trim().replace(/%$/, '');
      
      // Also fetch individual components for highlighting
      const [targetResponse, attributeResponse, spatialResponse] = await Promise.all([
        fetch(targetPath).catch(() => null),
        fetch(attributePath).catch(() => null),
        fetch(spatialPath).catch(() => null)
      ]);
      
      const target = targetResponse && targetResponse.ok ? await targetResponse.text() : '';
      const attribute = attributeResponse && attributeResponse.ok ? await attributeResponse.text() : '';
      const spatial = spatialResponse && spatialResponse.ok ? await spatialResponse.text() : '';
      
      return {
        fullInstruction: cleanInstruction,
        target: target.trim().replace(/%$/, ''),
        attribute: attribute.trim().replace(/%$/, ''),
        spatial: spatial.trim().replace(/%$/, '')
      };
    }
    
    // Fallback: Fetch all files separately if instruction.txt doesn't exist
    const [targetResponse, attributeResponse, spatialResponse] = await Promise.all([
      fetch(targetPath),
      fetch(attributePath).catch(() => null),
      fetch(spatialPath).catch(() => null)
    ]);
    
    if (!targetResponse.ok) {
      throw new Error('Failed to load target_object.txt');
    }
    
    const target = await targetResponse.text();
    const attribute = attributeResponse && attributeResponse.ok ? await attributeResponse.text() : '';
    const spatial = spatialResponse && spatialResponse.ok ? await spatialResponse.text() : '';
    
    // Clean up the text (remove trailing % and whitespace)
    const cleanTarget = target.trim().replace(/%$/, '');
    const cleanAttribute = attribute.trim().replace(/%$/, '');
    const cleanSpatial = spatial.trim().replace(/%$/, '');
    
    return {
      fullInstruction: null,
      target: cleanTarget,
      attribute: cleanAttribute,
      spatial: cleanSpatial
    };
  } catch (error) {
    console.error(`Failed to load instruction for ${demo.folder}:`, error);
    return { fullInstruction: null, target: demo.name, attribute: '', spatial: '' };
  }
}

// Build instruction text from components and highlight target
function buildInstructionText(data) {
  if (!data.target) {
    return 'No instruction available';
  }
  
  // If we have the full instruction from instruction.txt, use it and apply highlighting
  if (data.fullInstruction) {
    let highlightedText = data.fullInstruction;
    
    // Apply highlighting to each component if it exists in the instruction
    if (data.attribute) {
      const attrRegex = new RegExp(`(${escapeRegExp(data.attribute)})`, 'gi');
      highlightedText = highlightedText.replace(attrRegex, '<span class="highlight-attribute">$1</span>');
    }
    
    if (data.target) {
      const targetRegex = new RegExp(`(${escapeRegExp(data.target)})`, 'gi');
      highlightedText = highlightedText.replace(targetRegex, '<span class="highlight-target">$1</span>');
    }
    
    if (data.spatial) {
      const spatialRegex = new RegExp(`(${escapeRegExp(data.spatial)})`, 'gi');
      highlightedText = highlightedText.replace(spatialRegex, '<span class="highlight-spatial">$1</span>');
    }
    
    return highlightedText;
  }
  
  // Fallback: Build the instruction text: "Find the [attribute] target [spatial]"
  let parts = ['Find the'];
  
  // Add attribute if exists (red highlight)
  if (data.attribute) {
    parts.push(`<span class="highlight-attribute">${data.attribute}</span>`);
  }
  
  // Add target (yellow highlight)
  parts.push(`<span class="highlight-target">${data.target}</span>`);
  
  // Add spatial condition if exists (blue highlight)
  if (data.spatial) {
    parts.push(`<span class="highlight-spatial">${data.spatial}</span>`);
  }
  
  return parts.join(' ') + '.';
}

// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// Create a demo cell with video pair (no mini controls)
function createDemoCell(demo, robot = 'car', type = 'ori') {
  const cell = document.createElement('div');
  cell.className = 'demo-cell';
  
  // Add click handler to open modal
  cell.addEventListener('click', function(e) {
    openVideoModal(demo, robot, type);
  });
  
  const title = document.createElement('div');
  title.className = 'demo-title';
  title.textContent = 'Loading...'; // Placeholder while loading
  
  // Load and display instruction with highlighted target
  loadInstructionData(demo, robot, type).then(data => {
    const instructionText = buildInstructionText(data);
    title.innerHTML = instructionText;
  });
  
  const videoPair = document.createElement('div');
  videoPair.className = 'video-pair';
  
  const videoPairVideos = document.createElement('div');
  videoPairVideos.className = 'video-pair-videos';
  const videoSources = getDemoVideoSources(demo, robot, type);
  const isSingleVideo = videoSources.length === 1;
  videoPairVideos.classList.toggle('single-video', isSingleVideo);
  
  if (USE_MEDIA_PLACEHOLDERS) {
    if (isSingleVideo) {
      videoPairVideos.appendChild(createVideoPlaceholderNode('Video Placeholder'));
    } else {
      videoPairVideos.appendChild(createVideoPlaceholderNode('Final Video Placeholder'));
      videoPairVideos.appendChild(createVideoPlaceholderNode('Footage Video Placeholder'));
    }
  } else {
    videoSources.forEach((videoSource) => {
      const videoElement = document.createElement('video');
      videoElement.setAttribute('muted', '');
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('preload', 'none'); // Don't preload - wait for lazy loading
      enforceMutedVideo(videoElement);
      hardenVideoElement(videoElement);
      videoElement.dataset.loaded = 'false'; // Track loading state
      const sourceElement = document.createElement('source');
      sourceElement.src = videoSource.src;
      sourceElement.type = videoSource.type;
      videoElement.appendChild(sourceElement);
      attachDelayedReplay(videoElement, videoPairVideos);
      videoPairVideos.appendChild(videoElement);
    });
  }
  
  // No mini controls - just add videos
  videoPair.appendChild(videoPairVideos);
  
  cell.appendChild(title);
  cell.appendChild(videoPair);
  
  // Note: Synchronization is now handled by lazy loading observer
  // Videos will be loaded and played when they enter the viewport
  
  return cell;
}

// Navigate between gallery pages (with loop)
function navigateGallery(direction) {
  let newPage = currentGalleryPage + direction;
  
  // Enable looping: wrap around to first/last page
  if (newPage < 0) {
    newPage = totalPages - 1; // Go to last page
  } else if (newPage >= totalPages) {
    newPage = 0; // Go to first page
  }
  
  // Pause all videos on current page before switching
  const currentPageElement = document.getElementById(`page${currentGalleryPage + 1}`);
  if (currentPageElement) {
    pauseVideosInContainer(currentPageElement, { resetToStart: true });
  }
  
  currentGalleryPage = newPage;
  
  const slider = document.getElementById('gallerySlider');
  slider.style.transform = `translateX(-${currentGalleryPage * 100}%)`;
  
  document.getElementById('currentPage').textContent = currentGalleryPage + 1;
  updateNavigationButtons();
  
  // Play all videos on new page from the beginning
  setTimeout(() => {
    const newPageElement = document.getElementById(`page${currentGalleryPage + 1}`);
    if (newPageElement) {
      const newVideos = newPageElement.querySelectorAll('video');
      newVideos.forEach(video => {
        video.currentTime = 0; // Ensure starting from beginning
        video.play().catch(e => console.log('Video play failed after navigation:', e));
      });
    }
  }, 100); // Small delay to ensure page transition has started
}

// Update navigation button states (always enabled for loop mode)
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  // Always enable buttons for infinite loop
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// Navigate car group B gallery (Sim Single-Floor)
function navigateSelfGallery(direction) {
  let newPage = currentSelfGalleryPage + direction;
  
  // Enable looping
  if (newPage < 0) {
    newPage = totalSelfPages - 1;
  } else if (newPage >= totalSelfPages) {
    newPage = 0;
  }
  
  // Pause all videos on current page
  const currentPageElement = document.getElementById(`selfPage${currentSelfGalleryPage + 1}`);
  if (currentPageElement) {
    pauseVideosInContainer(currentPageElement, { resetToStart: true });
  }
  
  currentSelfGalleryPage = newPage;
  
  const slider = document.getElementById('gallerySelfSlider');
  slider.style.transform = `translateX(-${currentSelfGalleryPage * 100}%)`;
  
  document.getElementById('currentSelfPage').textContent = currentSelfGalleryPage + 1;
  updateSelfNavigationButtons();
  
  // Play all videos on new page
  setTimeout(() => {
    const newPageElement = document.getElementById(`selfPage${currentSelfGalleryPage + 1}`);
    if (newPageElement) {
      const newVideos = newPageElement.querySelectorAll('video');
      newVideos.forEach(video => {
        video.currentTime = 0;
        video.play().catch(e => console.log('Self video play failed:', e));
      });
    }
  }, 100);
}

// Update self navigation button states
function updateSelfNavigationButtons() {
  const prevBtn = document.getElementById('prevSelfBtn');
  const nextBtn = document.getElementById('nextSelfBtn');
  
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// Navigate Go2 group A gallery
function navigateGo2OriGallery(direction) {
  let newPage = currentGo2OriGalleryPage + direction;
  
  if (newPage < 0) {
    newPage = totalGo2OriPages - 1;
  } else if (newPage >= totalGo2OriPages) {
    newPage = 0;
  }
  
  const currentPageElement = document.getElementById(`go2OriPage${currentGo2OriGalleryPage + 1}`);
  if (currentPageElement) {
    pauseVideosInContainer(currentPageElement, { resetToStart: true });
  }
  
  currentGo2OriGalleryPage = newPage;
  const slider = document.getElementById('galleryGo2OriSlider');
  slider.style.transform = `translateX(-${currentGo2OriGalleryPage * 100}%)`;
  document.getElementById('currentGo2OriPage').textContent = currentGo2OriGalleryPage + 1;
  updateGo2OriNavigationButtons();
  
  setTimeout(() => {
    const newPageElement = document.getElementById(`go2OriPage${currentGo2OriGalleryPage + 1}`);
    if (newPageElement) {
      const newVideos = newPageElement.querySelectorAll('video');
      newVideos.forEach(video => {
        video.currentTime = 0;
        video.play().catch(e => console.log('Go2 ori video play failed:', e));
      });
    }
  }, 100);
}

function updateGo2OriNavigationButtons() {
  const prevBtn = document.getElementById('prevGo2OriBtn');
  const nextBtn = document.getElementById('nextGo2OriBtn');
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// Navigate Go2 group B gallery
function navigateGo2SelfGallery(direction) {
  let newPage = currentGo2SelfGalleryPage + direction;
  
  if (newPage < 0) {
    newPage = totalGo2SelfPages - 1;
  } else if (newPage >= totalGo2SelfPages) {
    newPage = 0;
  }
  
  const currentPageElement = document.getElementById(`go2SelfPage${currentGo2SelfGalleryPage + 1}`);
  if (currentPageElement) {
    pauseVideosInContainer(currentPageElement, { resetToStart: true });
  }
  
  currentGo2SelfGalleryPage = newPage;
  const slider = document.getElementById('galleryGo2SelfSlider');
  slider.style.transform = `translateX(-${currentGo2SelfGalleryPage * 100}%)`;
  document.getElementById('currentGo2SelfPage').textContent = currentGo2SelfGalleryPage + 1;
  updateGo2SelfNavigationButtons();
  
  setTimeout(() => {
    const newPageElement = document.getElementById(`go2SelfPage${currentGo2SelfGalleryPage + 1}`);
    if (newPageElement) {
      const newVideos = newPageElement.querySelectorAll('video');
      newVideos.forEach(video => {
        video.currentTime = 0;
        video.play().catch(e => console.log('Go2 self video play failed:', e));
      });
    }
  }, 100);
}

function updateGo2SelfNavigationButtons() {
  const prevBtn = document.getElementById('prevGo2SelfBtn');
  const nextBtn = document.getElementById('nextGo2SelfBtn');
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// Navigate Go2 group C gallery
function navigateGo2SpatialGallery(direction) {
  let newPage = currentGo2SpatialGalleryPage + direction;
  
  if (newPage < 0) {
    newPage = totalGo2SpatialPages - 1;
  } else if (newPage >= totalGo2SpatialPages) {
    newPage = 0;
  }
  
  const currentPageElement = document.getElementById(`go2SpatialPage${currentGo2SpatialGalleryPage + 1}`);
  if (currentPageElement) {
    pauseVideosInContainer(currentPageElement, { resetToStart: true });
  }
  
  currentGo2SpatialGalleryPage = newPage;
  const slider = document.getElementById('galleryGo2SpatialSlider');
  slider.style.transform = `translateX(-${currentGo2SpatialGalleryPage * 100}%)`;
  document.getElementById('currentGo2SpatialPage').textContent = currentGo2SpatialGalleryPage + 1;
  updateGo2SpatialNavigationButtons();
  
  setTimeout(() => {
    const newPageElement = document.getElementById(`go2SpatialPage${currentGo2SpatialGalleryPage + 1}`);
    if (newPageElement) {
      const newVideos = newPageElement.querySelectorAll('video');
      newVideos.forEach(video => {
        video.currentTime = 0;
        video.play().catch(e => console.log('Go2 spatial video play failed:', e));
      });
    }
  }, 100);
}

function updateGo2SpatialNavigationButtons() {
  const prevBtn = document.getElementById('prevGo2SpatialBtn');
  const nextBtn = document.getElementById('nextGo2SpatialBtn');
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// Navigate G1 group A gallery
function navigateG1OriGallery(direction) {
  if (totalG1OriPages <= 1) {
    return;
  }

  let newPage = currentG1OriGalleryPage + direction;
  
  if (newPage < 0) {
    newPage = totalG1OriPages - 1;
  } else if (newPage >= totalG1OriPages) {
    newPage = 0;
  }
  
  const currentPageElement = document.getElementById(`g1OriPage${currentG1OriGalleryPage + 1}`);
  if (currentPageElement) {
    pauseVideosInContainer(currentPageElement, { resetToStart: true });
  }
  
  currentG1OriGalleryPage = newPage;
  const slider = document.getElementById('galleryG1OriSlider');
  if (slider) {
    slider.style.transform = `translateX(-${currentG1OriGalleryPage * 100}%)`;
  }
  const currentPageEl = document.getElementById('currentG1OriPage');
  if (currentPageEl) {
    currentPageEl.textContent = currentG1OriGalleryPage + 1;
  }
  updateG1OriNavigationButtons();
  
  setTimeout(() => {
    const newPageElement = document.getElementById(`g1OriPage${currentG1OriGalleryPage + 1}`);
    loadAndPlayVideosInPage(newPageElement, { resetToStart: true });
    scheduleNextPageFirstFramePreload({
      timerKey: 'g1Ori',
      pagePrefix: 'g1OriPage',
      currentPageIndex: currentG1OriGalleryPage,
      totalPages: totalG1OriPages
    });
  }, 100);
}

function updateG1OriNavigationButtons() {
  const prevBtn = document.getElementById('prevG1OriBtn');
  const nextBtn = document.getElementById('nextG1OriBtn');
  const totalPageEl = document.getElementById('totalG1OriPages');
  if (totalPageEl) {
    totalPageEl.textContent = totalG1OriPages;
  }

  const navContainer = document.querySelector('#galleryG1OriSlider')?.closest('.gallery-container')?.querySelector('.gallery-nav');
  if (navContainer) {
    navContainer.style.display = totalG1OriPages > 1 ? 'flex' : 'none';
  }

  if (prevBtn) {
    prevBtn.disabled = false;
  }
  if (nextBtn) {
    nextBtn.disabled = false;
  }
}

// Navigate G1 group B gallery
function navigateG1SelfGallery(direction) {
  if (totalG1SelfPages <= 1) {
    return;
  }

  let newPage = currentG1SelfGalleryPage + direction;
  
  if (newPage < 0) {
    newPage = totalG1SelfPages - 1;
  } else if (newPage >= totalG1SelfPages) {
    newPage = 0;
  }
  
  const currentPageElement = document.getElementById(`g1SelfPage${currentG1SelfGalleryPage + 1}`);
  if (currentPageElement) {
    pauseVideosInContainer(currentPageElement, { resetToStart: true });
  }
  
  currentG1SelfGalleryPage = newPage;
  const slider = document.getElementById('galleryG1SelfSlider');
  slider.style.transform = `translateX(-${currentG1SelfGalleryPage * 100}%)`;
  document.getElementById('currentG1SelfPage').textContent = currentG1SelfGalleryPage + 1;
  updateG1SelfNavigationButtons();
  
  setTimeout(() => {
    const newPageElement = document.getElementById(`g1SelfPage${currentG1SelfGalleryPage + 1}`);
    loadAndPlayVideosInPage(newPageElement, { resetToStart: true });
    scheduleNextPageFirstFramePreload({
      timerKey: 'g1Self',
      pagePrefix: 'g1SelfPage',
      currentPageIndex: currentG1SelfGalleryPage,
      totalPages: totalG1SelfPages
    });
  }, 100);
}

function updateG1SelfNavigationButtons() {
  const prevBtn = document.getElementById('prevG1SelfBtn');
  const nextBtn = document.getElementById('nextG1SelfBtn');
  const currentPageEl = document.getElementById('currentG1SelfPage');
  const totalPageEl = document.getElementById('totalG1SelfPages');
  const navContainer = document.querySelector('#galleryG1SelfSlider')?.closest('.gallery-container')?.querySelector('.gallery-nav');

  if (currentPageEl) {
    currentPageEl.textContent = currentG1SelfGalleryPage + 1;
  }
  if (totalPageEl) {
    totalPageEl.textContent = totalG1SelfPages;
  }
  if (navContainer) {
    navContainer.style.display = totalG1SelfPages > 1 ? 'flex' : 'none';
  }
  if (prevBtn) {
    prevBtn.disabled = false;
  }
  if (nextBtn) {
    nextBtn.disabled = false;
  }
}

// Global variables for modal video control
let modalFinalVideo = null;
let modalFootageVideo = null;
// Note: isPlaying, isMuted, updateInterval no longer needed with native controls

// Open video modal for fullscreen playback
function openVideoModal(demo, robot = 'car', type = 'ori') {
  const modal = document.getElementById('videoModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalVideoPair = document.getElementById('modalVideoPair');
  
  // Pause ALL videos on the page to save bandwidth
  const allVideos = document.querySelectorAll('video');
  allVideos.forEach(video => {
    video.pause();
  });
  
  // Set title with highlighted components
  modalTitle.textContent = 'Loading...';
  loadInstructionData(demo, robot, type).then(data => {
    const instructionText = buildInstructionText(data);
    modalTitle.innerHTML = instructionText;
  });
  
  // Clear previous videos
  modalVideoPair.innerHTML = '';
  const videoSources = getDemoVideoSources(demo, robot, type);
  const isSingleVideo = videoSources.length === 1;
  modalVideoPair.classList.toggle('single-video', isSingleVideo);

  if (USE_MEDIA_PLACEHOLDERS) {
    if (isSingleVideo) {
      modalVideoPair.appendChild(createVideoPlaceholderNode('Video Placeholder'));
    } else {
      modalVideoPair.appendChild(createVideoPlaceholderNode('Final Video Placeholder'));
      modalVideoPair.appendChild(createVideoPlaceholderNode('Footage Video Placeholder'));
    }
    modalFinalVideo = null;
    modalFootageVideo = null;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    return;
  }

  const modalVideos = videoSources.map((videoSource) => {
    const videoElement = document.createElement('video');
    videoElement.setAttribute('controls', '');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('preload', 'auto');
    videoElement.setAttribute('muted', '');
    enforceMutedVideo(videoElement);
    hardenVideoElement(videoElement);

    const sourceElement = document.createElement('source');
    sourceElement.src = videoSource.src;
    sourceElement.type = videoSource.type;
    videoElement.appendChild(sourceElement);
    return videoElement;
  });

  modalFinalVideo = modalVideos[0] || null;
  modalFootageVideo = modalVideos[1] || null;

  modalVideos.forEach((videoElement) => {
    attachDelayedReplay(videoElement, modalVideoPair);
    modalVideoPair.appendChild(videoElement);
    videoElement.load();
  });

  let loadedCount = 0;
  const totalVideoCount = modalVideos.length;
  modalVideos.forEach((videoElement) => {
    videoElement.addEventListener('canplay', function onCanPlay() {
      loadedCount += 1;
      if (loadedCount === totalVideoCount) {
        Promise.all(
          modalVideos.map(v => v.play().catch(e => console.log('Modal video play failed:', e)))
        ).then(() => {
          console.log('Modal videos auto-playing');
        });
      }
    }, { once: true });
  });
  
  // Show modal
  modal.classList.add('active');
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

// Setup progress bar interaction (DEPRECATED - now using native controls)
function setupProgressBar() {
  const progressContainer = document.getElementById('progressContainer');
  let isSeeking = false;
  
  progressContainer.addEventListener('click', function(e) {
    if (!modalFinalVideo || !modalFootageVideo) return;
    
    const rect = progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * modalFinalVideo.duration;
    
    // Pause during seek
    const wasPlaying = isPlaying;
    if (isPlaying) {
      modalFinalVideo.pause();
      modalFootageVideo.pause();
      isPlaying = false;
      stopProgressUpdate();
      updatePlayPauseButton();
    }
    
    isSeeking = true;
    
    // Check if the target time is buffered for both videos
    function isTimeBuffered(video, targetTime) {
      if (!video || !video.buffered || video.buffered.length === 0) {
        return false;
      }
      for (let i = 0; i < video.buffered.length; i++) {
        if (targetTime >= video.buffered.start(i) && targetTime <= video.buffered.end(i)) {
          return true;
        }
      }
      return false;
    }
    
    const finalBuffered = isTimeBuffered(modalFinalVideo, newTime);
    const footageBuffered = isTimeBuffered(modalFootageVideo, newTime);
    
    console.log(`Seeking to ${newTime.toFixed(2)}s - Final buffered: ${finalBuffered}, Footage buffered: ${footageBuffered}`);
    
    // Set new time for both videos
    modalFinalVideo.currentTime = newTime;
    modalFootageVideo.currentTime = newTime;
    
    // Wait for both videos to finish seeking
    let finalReady = false;
    let footageReady = false;
    let seekTimeout;
    
    function checkBothReady() {
      if (finalReady && footageReady) {
        isSeeking = false;
        updateProgress();
        clearTimeout(seekTimeout);
        
        // Resume playback if was playing
        if (wasPlaying) {
          // Add a small delay to ensure both videos are ready
          setTimeout(() => {
            Promise.all([
              modalFinalVideo.play().catch(e => {
                console.error('Final video play failed:', e);
                return Promise.resolve();
              }),
              modalFootageVideo.play().catch(e => {
                console.error('Footage video play failed:', e);
                // Try to reload if playback fails
                if (modalFootageVideo.readyState < 2) {
                  console.log('Footage video not ready, reloading...');
                  modalFootageVideo.load();
                  modalFootageVideo.currentTime = newTime;
                }
                return Promise.resolve();
              })
            ]).then(() => {
              isPlaying = true;
              updatePlayPauseButton();
              startProgressUpdate();
            });
          }, 100);
        }
      }
    }
    
    // Listen for seeked events
    function handleFinalSeeked() {
      finalReady = true;
      console.log('Final video seeked');
      checkBothReady();
    }
    
    function handleFootageSeeked() {
      footageReady = true;
      console.log('Footage video seeked');
      checkBothReady();
    }
    
    modalFinalVideo.addEventListener('seeked', handleFinalSeeked, { once: true });
    modalFootageVideo.addEventListener('seeked', handleFootageSeeked, { once: true });
    
    // Also listen for 'canplay' event as backup
    function handleFinalCanPlay() {
      if (!finalReady) {
        finalReady = true;
        console.log('Final video canplay (backup)');
        modalFinalVideo.removeEventListener('seeked', handleFinalSeeked);
        checkBothReady();
      }
    }
    
    function handleFootageCanPlay() {
      if (!footageReady) {
        footageReady = true;
        console.log('Footage video canplay (backup)');
        modalFootageVideo.removeEventListener('seeked', handleFootageSeeked);
        checkBothReady();
      }
    }
    
    modalFinalVideo.addEventListener('canplay', handleFinalCanPlay, { once: true });
    modalFootageVideo.addEventListener('canplay', handleFootageCanPlay, { once: true });
    
    // Timeout fallback - force continue even if one video is stuck
    seekTimeout = setTimeout(() => {
      if (isSeeking) {
        console.warn('Seek timeout - forcing playback');
        isSeeking = false;
        
        // Remove event listeners
        modalFinalVideo.removeEventListener('seeked', handleFinalSeeked);
        modalFootageVideo.removeEventListener('seeked', handleFootageSeeked);
        modalFinalVideo.removeEventListener('canplay', handleFinalCanPlay);
        modalFootageVideo.removeEventListener('canplay', handleFootageCanPlay);
        
        updateProgress();
        
        if (wasPlaying) {
          // Try to play both videos, continue even if one fails
          modalFinalVideo.play().catch(e => console.error('Final play timeout failed:', e));
          modalFootageVideo.play().catch(e => {
            console.error('Footage play timeout failed:', e);
            // If footage is really stuck, try reloading it
            if (modalFootageVideo.readyState < 2) {
              console.log('Force reloading footage video...');
              const currentSrc = modalFootageVideo.querySelector('source').src;
              modalFootageVideo.src = currentSrc;
              modalFootageVideo.currentTime = newTime;
              modalFootageVideo.play().catch(e2 => console.error('Reload play failed:', e2));
            }
          });
          isPlaying = true;
          updatePlayPauseButton();
          startProgressUpdate();
        }
      }
    }, 3000);
  });
}

// Update progress bar
function updateProgress() {
  if (!modalFinalVideo) return;
  
  const progressBar = document.getElementById('progressBar');
  const timeDisplay = document.getElementById('timeDisplay');
  
  const percent = (modalFinalVideo.currentTime / modalFinalVideo.duration) * 100;
  progressBar.style.width = percent + '%';
  
  const currentMin = Math.floor(modalFinalVideo.currentTime / 60);
  const currentSec = Math.floor(modalFinalVideo.currentTime % 60);
  const durationMin = Math.floor(modalFinalVideo.duration / 60);
  const durationSec = Math.floor(modalFinalVideo.duration % 60);
  
  timeDisplay.textContent = `${currentMin}:${currentSec.toString().padStart(2, '0')} / ${durationMin}:${durationSec.toString().padStart(2, '0')}`;
}

// Start progress update interval
function startProgressUpdate() {
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(updateProgress, 100);
}

// Stop progress update interval
function stopProgressUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// Toggle play/pause
function togglePlayPause() {
  if (!modalFinalVideo || !modalFootageVideo) return;
  
  if (isPlaying) {
    modalFinalVideo.pause();
    modalFootageVideo.pause();
    isPlaying = false;
    stopProgressUpdate();
  } else {
    Promise.all([
      modalFinalVideo.play(),
      modalFootageVideo.play()
    ]).then(() => {
      isPlaying = true;
      startProgressUpdate();
    });
  }
  
  updatePlayPauseButton();
}

// Update play/pause button text
function updatePlayPauseButton() {
  const btn = document.getElementById('playPauseBtn');
  if (isPlaying) {
    btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
  } else {
    btn.innerHTML = '<i class="fas fa-play"></i> Play';
  }
}

// Toggle mute
function toggleMute() {
  if (!modalFinalVideo || !modalFootageVideo) return;

  isMuted = true;
  enforceMutedVideo(modalFinalVideo);
  enforceMutedVideo(modalFootageVideo);

  const btn = document.getElementById('muteBtn');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-volume-mute"></i> Muted';
  }
}

// Close video modal
function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const modalVideoPair = document.getElementById('modalVideoPair');

  pauseVideosInContainer(modalVideoPair, { resetToStart: true });
  
  // Pause and remove videos
  if (modalFinalVideo) {
    modalFinalVideo.src = '';
  }
  if (modalFootageVideo) {
    modalFootageVideo.src = '';
  }
  
  modalVideoPair.innerHTML = '';
  modalFinalVideo = null;
  modalFootageVideo = null;
  
  // Hide modal
  modal.classList.remove('active');
  
  // Restore body scroll
  document.body.style.overflow = 'auto';
  
  // Resume playing videos with intelligent strategy
  resumeVideosAfterModal();
}

// Resume videos after modal closes with optimized strategy
// Note: This works together with lazy loading - only resumes visible videos
function resumeVideosAfterModal() {
  // Collect visible page video pairs
  const visibleCells = [];
  
  // Car group A page (legacy: ori)
  const currentOriPage = document.getElementById(`page${currentGalleryPage + 1}`);
  if (currentOriPage) {
    visibleCells.push(...currentOriPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // Car group B page (displayed as Sim Single-Floor)
  const currentSelfPage = document.getElementById(`selfPage${currentSelfGalleryPage + 1}`);
  if (currentSelfPage) {
    visibleCells.push(...currentSelfPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // Car group C page (displayed as Sim Cross-Floor)
  const spatialPage = document.getElementById('spatialPage1');
  if (spatialPage) {
    visibleCells.push(...spatialPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // Go2 group A current page
  const currentGo2OriPage = document.getElementById(`go2OriPage${currentGo2OriGalleryPage + 1}`);
  if (currentGo2OriPage) {
    visibleCells.push(...currentGo2OriPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // Go2 group B current page
  const currentGo2SelfPage = document.getElementById(`go2SelfPage${currentGo2SelfGalleryPage + 1}`);
  if (currentGo2SelfPage) {
    visibleCells.push(...currentGo2SelfPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // Go2 group C current page
  const currentGo2SpatialPage = document.getElementById(`go2SpatialPage${currentGo2SpatialGalleryPage + 1}`);
  if (currentGo2SpatialPage) {
    visibleCells.push(...currentGo2SpatialPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // G1 group A current page
  const currentG1OriPage = document.getElementById(`g1OriPage${currentG1OriGalleryPage + 1}`);
  if (currentG1OriPage) {
    visibleCells.push(...currentG1OriPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // G1 group B current page
  const currentG1SelfPage = document.getElementById(`g1SelfPage${currentG1SelfGalleryPage + 1}`);
  if (currentG1SelfPage) {
    visibleCells.push(...currentG1SelfPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // G1 group C current page
  const g1SpatialPage = document.getElementById('g1SpatialPage1');
  if (g1SpatialPage) {
    visibleCells.push(...g1SpatialPage.querySelectorAll('.demo-cell:not(.empty)'));
  }
  
  // Synchronize and play videos in each cell
  requestAnimationFrame(() => {
    visibleCells.forEach(cell => {
      const videos = cell.querySelectorAll('video');
      if (videos.length === 2) {
        const video1 = videos[0];
        const video2 = videos[1];
        
        // Get current time of both videos
        const time1 = video1.currentTime;
        const time2 = video2.currentTime;
        
        // Sync to the earlier timestamp
        const syncTime = Math.min(time1, time2);
        
        // Set both videos to the earlier time
        video1.currentTime = syncTime;
        video2.currentTime = syncTime;
        
        // Wait for both to seek, then play together
        let video1Ready = false;
        let video2Ready = false;
        
        function tryPlayBoth() {
          if (video1Ready && video2Ready) {
            Promise.all([
              video1.play().catch(e => console.log('Video 1 play failed:', e)),
              video2.play().catch(e => console.log('Video 2 play failed:', e))
            ]);
          }
        }
        
        video1.addEventListener('seeked', function onSeeked1() {
          video1Ready = true;
          video1.removeEventListener('seeked', onSeeked1);
          tryPlayBoth();
        }, { once: true });
        
        video2.addEventListener('seeked', function onSeeked2() {
          video2Ready = true;
          video2.removeEventListener('seeked', onSeeked2);
          tryPlayBoth();
        }, { once: true });
        
        // Fallback: if seeked doesn't fire quickly, just play
        setTimeout(() => {
          if (!video1Ready || !video2Ready) {
            video1.play().catch(e => {});
            video2.play().catch(e => {});
          }
        }, 500);
      } else if (videos.length === 1) {
        videos[0].play().catch(e => {});
      }
    });
  });
}

// Close modal when clicking outside the content
document.addEventListener('click', function(event) {
  const modal = document.getElementById('videoModal');
  if (event.target === modal) {
    closeVideoModal();
  }
});

// Close modal with ESC key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeVideoModal();
    closeLightbox();
  }
});

// Image Lightbox Functions for Storyboard
function openLightbox(imageSrc) {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  
  lightboxImage.src = imageSrc;
  lightbox.classList.add('active');
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

// Parse time string (e.g., "0:12" or "1:22") to seconds
function parseTimeToSeconds(timeString) {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return 0;
}

// Seek YouTube video to specific time
function seekYouTubeVideo(videoSlide, timeSeconds) {
  // Find the iframe in the video slide
  const iframe = videoSlide.querySelector('iframe');
  if (!iframe) {
    console.error('No iframe found in video slide');
    return;
  }
  
  // Get the iframe ID or find the corresponding player
  const iframeId = iframe.id;
  const slideIndex = Array.from(document.querySelectorAll('.video-slide')).indexOf(videoSlide);
  
  // Try to use the YouTube player object if available
  if (youtubePlayers[slideIndex] && youtubePlayers[slideIndex].seekTo) {
    youtubePlayers[slideIndex].seekTo(timeSeconds, true);
    youtubePlayers[slideIndex].playVideo();
    console.log(`Seeking to ${timeSeconds}s using player object`);
  } else {
    // Fallback: use postMessage API
    iframe.contentWindow.postMessage(JSON.stringify({
      event: 'command',
      func: 'seekTo',
      args: [timeSeconds, true]
    }), '*');
    
    // Also send play command
    setTimeout(() => {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'playVideo',
        args: []
      }), '*');
    }, 100);
    
    console.log(`Seeking to ${timeSeconds}s using postMessage`);
  }
}

function closeLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  
  lightbox.classList.remove('active');
  lightboxImage.src = '';
  
  // Restore body scroll
  document.body.style.overflow = 'auto';
}

// Close lightbox when clicking outside the image
document.addEventListener('click', function(event) {
  const lightbox = document.getElementById('imageLightbox');
  if (event.target === lightbox) {
    closeLightbox();
  }
});

function enhanceStoryboardFramesLayout() {
  const storyboardFrames = document.querySelectorAll('.storyboard-frame');

  storyboardFrames.forEach((frame) => {
    if (frame.querySelector('.storyboard-media')) {
      return;
    }

    const img = frame.querySelector('img');
    const timeSpan = frame.querySelector('.frame-time');
    const description = frame.querySelector('.frame-description');

    if (!img || !timeSpan || !description) {
      return;
    }

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'storyboard-media';

    frame.insertBefore(mediaWrapper, description);
    mediaWrapper.appendChild(img);
    mediaWrapper.appendChild(timeSpan);
  });
}

// Add click event to all storyboard images
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for content to load, then attach handlers
  setTimeout(function() {
    enhanceStoryboardFramesLayout();

    const storyboardFrames = document.querySelectorAll('.storyboard-frame');
    storyboardFrames.forEach(function(frame) {
      const img = frame.querySelector('img');
      const timeSpan = frame.querySelector('.frame-time');
      const mediaWrapper = frame.querySelector('.storyboard-media');
      
      if (img && timeSpan) {
        img.style.cursor = 'pointer';
        frame.style.cursor = 'pointer';
        
        // Add zoom icon to the frame
        const zoomIcon = document.createElement('span');
        zoomIcon.className = 'frame-zoom-icon';
        zoomIcon.innerHTML = '<i class="fas fa-search-plus"></i>';
        zoomIcon.title = 'Click to enlarge image';
        zoomIcon.style.pointerEvents = 'auto'; // Make sure it can receive clicks
        zoomIcon.style.cursor = 'zoom-in';
        (mediaWrapper || frame).appendChild(zoomIcon);
        
        // Add click handler to zoom icon - enlarge image (FIRST, with higher priority)
        zoomIcon.addEventListener('click', function(e) {
          e.stopPropagation(); // CRITICAL: Stop event from bubbling to parent
          e.preventDefault();
          openLightbox(img.src);
          console.log('Clicked zoom icon - opening lightbox');
        });
        
        // Add click handler to the frame - seek video
        frame.addEventListener('click', function(e) {
          // Double check: if the click target is the zoom icon or its child, don't seek
          if (e.target.classList.contains('frame-zoom-icon') || 
              e.target.closest('.frame-zoom-icon')) {
            console.log('Click was on zoom icon, not seeking video');
            return; // Don't seek video
          }
          
          e.stopPropagation();

          if (USE_MEDIA_PLACEHOLDERS) {
            return;
          }
          
          // Get the time from the frame-time span
          const timeString = timeSpan.textContent.trim();
          const timeSeconds = parseTimeToSeconds(timeString);
          
          // Find the parent video-slide (for carousel videos)
          let videoSlide = frame.closest('.video-slide');
          
          if (videoSlide) {
            const localVideo = videoSlide.querySelector('video');
            if (localVideo) {
              const shouldResumePlayback = !localVideo.paused && !localVideo.ended;
              seekNativeVideo(localVideo, timeSeconds, { playAfterSeek: shouldResumePlayback });
            } else {
              seekYouTubeVideo(videoSlide, timeSeconds);
            }
            console.log(`Clicked frame with time ${timeString} (${timeSeconds}s)`);
          } else {
            // For standalone videos (not in carousel), find the closest section with iframe
            const section = frame.closest('section');
            if (section) {
              const iframe = section.querySelector('iframe');
              if (iframe) {
                // Use postMessage to seek the standalone video
                iframe.contentWindow.postMessage(JSON.stringify({
                  event: 'command',
                  func: 'seekTo',
                  args: [timeSeconds, true]
                }), '*');
                
                // Also send play command
                setTimeout(() => {
                  iframe.contentWindow.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'playVideo',
                    args: []
                  }), '*');
                }, 100);
                
                console.log(`Clicked standalone video frame with time ${timeString} (${timeSeconds}s)`);
              }
            }
          }
        });
      }
    });
    
    console.log(`Attached click handlers to ${storyboardFrames.length} storyboard frames`);
  }, 500);
});
