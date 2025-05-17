/**
 * Mausilda - Baby Sound Machine
 * A static web app that generates soothing sounds for babies
 * using the Web Audio API.
 */

// App version
const APP_VERSION = "v0.2.0";

// Initialize audio context when the page loads
document.addEventListener("DOMContentLoaded", function() {
  // Set version in UI
  document.getElementById("app-version").textContent = APP_VERSION;
  
  // Initialize the app
  const soundMachine = new SoundMachine();
  soundMachine.init();
});

class SoundMachine {
  constructor() {
    // Audio context
    this.audioContext = null;
    
    // Master gain node
    this.masterGain = null;
    
    // Active sound nodes
    this.activeSounds = {};
    
    // Timer settings
    this.timerDuration = 0;
    this.timerEndTime = 0;
    this.timerInterval = null;
    
    // Store currently playing sound
    this.currentSound = null;
    
    // Combo mode settings
    this.comboSounds = {
      'white-noise': false,
      'pink-noise': false,
      'brown-noise': false,
      'heartbeat': false,
      'ocean': false,
      'rain': false,
      'snow': false,
      'forest': false,
      'lullaby': false
    };
  }
  
  /**
   * Initialize the sound machine
   */
  init() {
    // Create audio context (with fallback for older browsers)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    
    // Create master gain node
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5; // Default volume
    this.masterGain.connect(this.audioContext.destination);
    
    // Initialize UI event listeners
    this.initEventListeners();
  }
  
  /**
   * Set up event listeners for the UI
   */
  initEventListeners() {
    // Sound tile click events
    const soundTiles = document.querySelectorAll('.sound-tile');
    soundTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        const soundType = tile.getAttribute('data-sound');
        // For combo tile, handle differently
        if (soundType === 'combo') {
          // Toggle combo settings
          const comboSettings = document.getElementById('combo-settings');
          comboSettings.classList.toggle('d-none');
        } else {
          this.toggleSound(soundType, tile);
        }
      });
    });
    
    // Volume control
    const volumeControl = document.getElementById('volume-control');
    volumeControl.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      this.setVolume(volume);
    });
    
    // Timer buttons
    const timerButtons = document.querySelectorAll('.timer-btn');
    timerButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        // Prevent event bubbling to parent elements
        e.stopPropagation();
        
        const minutes = parseInt(button.getAttribute('data-time'));
        this.setTimer(minutes);
        
        // Update active button state
        timerButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });
    
    // Apply combo button
    const applyComboButton = document.getElementById('apply-combo');
    if (applyComboButton) {
      applyComboButton.addEventListener('click', (e) => {
        // Prevent event bubbling
        e.stopPropagation();
        this.applyComboSettings();
      });
    }
    
    // Prevent combo settings from closing when clicking inside
    const comboSettings = document.getElementById('combo-settings');
    if (comboSettings) {
      comboSettings.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }
  
  /**
   * Toggle sound on/off
   * @param {string} soundType - Type of sound to toggle
   * @param {HTMLElement} tile - The DOM element for the sound tile
   */
  toggleSound(soundType, tile) {
    // If it's already playing, stop it
    if (tile.classList.contains('playing')) {
      if (soundType === 'combo') {
        this.stopCombo();
      } else {
        this.stopSound(soundType);
      }
      
      // Update UI to stopped state - the CSS will handle showing/hiding play/pause icons
      tile.classList.remove('playing');
      
      return;
    }
    
    // If it's not combo mode, stop any currently playing sound
    if (soundType !== 'combo') {
      this.stopAllSounds();
      
      // Reset UI for all tiles
      document.querySelectorAll('.sound-tile').forEach(t => {
        t.classList.remove('playing');
      });
    }
    
    // Start the audio
    if (soundType === 'combo') {
      // Show combo settings if not already visible
      const comboSettings = document.getElementById('combo-settings');
      if (comboSettings.classList.contains('d-none')) {
        comboSettings.classList.remove('d-none');
      }
    } else {
      // Play the selected sound
      this.playSound(soundType);
      this.currentSound = soundType;
    }
  }
  
  /**
   * Play a specific sound
   * @param {string} soundType - Type of sound to play
   */
  playSound(soundType) {
    // Resume the audio context (needed because of autoplay policies)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    switch(soundType) {
      case 'white-noise':
        this.playWhiteNoise();
        break;
      case 'pink-noise':
        this.playPinkNoise();
        break;
      case 'brown-noise':
        this.playBrownNoise();
        break;
      case 'heartbeat':
        this.playHeartbeat();
        break;
      case 'ocean':
        this.playOceanWaves();
        break;
      case 'rain':
        this.playRain();
        break;
      case 'snow':
        this.playSnow();
        break;
      case 'forest':
        this.playForest();
        break;
      case 'lullaby':
        this.playLullaby();
        break;
      default:
        console.warn('Unknown sound type:', soundType);
        return; // Don't update UI if sound type is unknown
    }
    
    // Update UI state for the sound tile
    const tile = document.querySelector(`[data-sound="${soundType}"]`);
    if (tile) {
      // Add playing class to the tile - the CSS will handle showing/hiding play/pause icons
      tile.classList.add('playing');
    }
  }
  
  /**
   * Stop a specific sound
   * @param {string} soundType - Type of sound to stop
   */
  stopSound(soundType) {
    if (this.activeSounds[soundType]) {
      // If it's an array of nodes
      if (Array.isArray(this.activeSounds[soundType])) {
        this.activeSounds[soundType].forEach(node => {
          if (node.stop) {
            node.stop();
          } else if (node.disconnect) {
            node.disconnect();
          }
        });
      } else {
        // If it's a single node
        if (this.activeSounds[soundType].stop) {
          this.activeSounds[soundType].stop();
        } else {
          this.activeSounds[soundType].disconnect();
        }
      }
      
      delete this.activeSounds[soundType];
    }
  }
  
  /**
   * Stop all active sounds
   */
  stopAllSounds() {
    Object.keys(this.activeSounds).forEach(soundType => {
      this.stopSound(soundType);
    });
    
    // Clear the current timer
    this.clearTimer();
  }
  
  /**
   * Set the master volume
   * @param {number} value - Volume level (0 to 1)
   */
  setVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }
  
  /**
   * Set a timer to stop sounds after specified minutes
   * @param {number} minutes - Duration in minutes
   */
  setTimer(minutes) {
    // Clear any existing timer
    this.clearTimer();
    
    // If timer is set to 0, don't set a new timer
    if (minutes === 0) {
      const timerDisplay = document.getElementById('timer-display');
      timerDisplay.classList.add('d-none');
      return;
    }
    
    // Calculate end time
    this.timerDuration = minutes * 60 * 1000; // Convert to milliseconds
    this.timerEndTime = Date.now() + this.timerDuration;
    
    // Update timer display
    const timerDisplay = document.getElementById('timer-display');
    timerDisplay.classList.remove('d-none');
    
    // Start the interval
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.updateTimerDisplay();
      
      // Check if timer has ended
      if (Date.now() >= this.timerEndTime) {
        this.stopAllSounds();
        document.querySelectorAll('.sound-tile').forEach(tile => {
          tile.classList.remove('playing');
        });
        this.clearTimer();
      }
    }, 1000);
  }
  
  /**
   * Update the timer display
   */
  updateTimerDisplay() {
    const timeRemaining = Math.max(0, this.timerEndTime - Date.now());
    const minutes = Math.floor(timeRemaining / (60 * 1000));
    const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
    
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('time-remaining').textContent = formattedTime;
  }
  
  /**
   * Clear the active timer
   */
  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Reset timer display
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.classList.add('d-none');
    }
    
    // Reset active button state
    document.querySelectorAll('.timer-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector('.timer-btn[data-time="0"]').classList.add('active');
  }
  
  /**
   * Apply combo mode settings
   */
  applyComboSettings() {
    // Stop any currently playing sounds
    this.stopAllSounds();
    
    // Reset UI for all tiles
    document.querySelectorAll('.sound-tile').forEach(t => {
      t.classList.remove('playing');
    });
    
    // Get selected sounds from checkboxes
    this.comboSounds = {
      'white-noise': document.getElementById('combo-white-noise').checked,
      'brown-noise': document.getElementById('combo-brown-noise').checked,
      'heartbeat': document.getElementById('combo-heartbeat').checked,
      'ocean': document.getElementById('combo-ocean').checked,
      'rain': document.getElementById('combo-rain').checked,
      'snow': document.getElementById('combo-snow').checked,
      'forest': document.getElementById('combo-forest').checked,
      'lullaby': document.getElementById('combo-lullaby').checked
    };
    
    // Check if any sounds are selected
    const hasSelectedSounds = Object.values(this.comboSounds).some(val => val === true);
    
    if (hasSelectedSounds) {
      // Play all selected sounds
      Object.keys(this.comboSounds).forEach(sound => {
        if (this.comboSounds[sound]) {
          this.playSound(sound);
        }
      });
      
      // Hide combo settings
      document.getElementById('combo-settings').classList.add('d-none');
    } else {
      alert('Please select at least one sound to combine.');
    }
  }
  
  /**
   * Stop all combo sounds
   */
  stopCombo() {
    // Stop all sounds that were part of the combo
    Object.keys(this.comboSounds).forEach(soundType => {
      if (this.comboSounds[soundType]) {
        this.stopSound(soundType);
      }
    });
    
    // Reset all combo checkboxes
    Object.keys(this.comboSounds).forEach(soundType => {
      const checkbox = document.getElementById(`combo-${soundType}`);
      if (checkbox) {
        checkbox.checked = false;
      }
      this.comboSounds[soundType] = false;
    });
    
    // Reset UI state - remove playing class from all tiles
    document.querySelectorAll('.sound-tile').forEach(tile => {
      tile.classList.remove('playing');
    });
    
    this.currentSound = null;
  }
  
  // -------------------- Sound Generation Methods --------------------
  
  /**
   * Generate white noise
   */
  playWhiteNoise() {
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const whiteNoise = this.audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    
    // Add a low-pass filter to make it softer
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    // Connect nodes
    whiteNoise.connect(filter);
    filter.connect(this.masterGain);
    
    // Start playing
    whiteNoise.start();
    
    // Store active sound nodes
    this.activeSounds['white-noise'] = [whiteNoise, filter];
  }
  
  /**
   * Generate pink noise
   * Pink noise has less high-frequency components compared to white noise
   */
  playPinkNoise() {
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Pink noise algorithm
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      // Apply pink noise filter
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // Scale to suit
      
      b6 = white * 0.115926;
    }
    
    const pinkNoise = this.audioContext.createBufferSource();
    pinkNoise.buffer = noiseBuffer;
    pinkNoise.loop = true;
    
    // Add a gentle low-pass filter
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    
    // Connect nodes
    pinkNoise.connect(filter);
    filter.connect(this.masterGain);
    
    // Start playing
    pinkNoise.start();
    
    // Store active sound nodes
    this.activeSounds['pink-noise'] = [pinkNoise, filter];
  }
  
  /**
   * Generate heartbeat sound
   */
  playHeartbeat() {
    // Create oscillator for heartbeat
    const heartbeatOsc = this.audioContext.createOscillator();
    heartbeatOsc.type = 'sine';
    heartbeatOsc.frequency.value = 2;
    
    // Create gain node for heartbeat amplitude
    const heartbeatGain = this.audioContext.createGain();
    heartbeatGain.gain.value = 0;
    
    // Create LFO for the heartbeat effect
    const heartbeatLFO = this.audioContext.createOscillator();
    heartbeatLFO.type = 'sine';
    heartbeatLFO.frequency.value = 1.2; // Heartbeats per second (72 BPM)
    
    // Create gain node for heartbeat LFO
    const heartbeatLFOGain = this.audioContext.createGain();
    heartbeatLFOGain.gain.value = 1;
    
    // Create oscillator for the actual heartbeat sound
    const heartbeatSound = this.audioContext.createOscillator();
    heartbeatSound.type = 'sine';
    heartbeatSound.frequency.value = 70; // Low frequency for heartbeat
    
    // Create filter for heartbeat sound
    const heartbeatFilter = this.audioContext.createBiquadFilter();
    heartbeatFilter.type = 'lowpass';
    heartbeatFilter.frequency.value = 200;
    heartbeatFilter.Q.value = 10;
    
    // Connect LFO to gain
    heartbeatLFO.connect(heartbeatLFOGain);
    heartbeatLFOGain.connect(heartbeatGain.gain);
    
    // Connect heartbeat sound through filter
    heartbeatSound.connect(heartbeatFilter);
    heartbeatFilter.connect(heartbeatGain);
    heartbeatGain.connect(this.masterGain);
    
    // Start oscillators
    heartbeatLFO.start();
    heartbeatSound.start();
    
    // Store active sound nodes
    this.activeSounds['heartbeat'] = [heartbeatLFO, heartbeatSound, heartbeatGain, heartbeatLFOGain, heartbeatFilter];
  }
  
  /**
   * Generate ocean waves sound
   */
  playOceanWaves() {
    // Create noise for ocean base
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const oceanBase = this.audioContext.createBufferSource();
    oceanBase.buffer = noiseBuffer;
    oceanBase.loop = true;
    
    // Create filter for ocean sound
    const oceanFilter = this.audioContext.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.value = 500;
    
    // Create gain node for wave modulation
    const waveGain = this.audioContext.createGain();
    waveGain.gain.value = 0.2;
    
    // Create oscillator for wave modulation
    const waveLFO = this.audioContext.createOscillator();
    waveLFO.type = 'sine';
    waveLFO.frequency.value = 0.1; // Slow wave effect
    
    // Create gain node for LFO
    const waveModulationGain = this.audioContext.createGain();
    waveModulationGain.gain.value = 0.2;
    
    // Connect wave LFO
    waveLFO.connect(waveModulationGain);
    waveModulationGain.connect(waveGain.gain);
    
    // Connect ocean nodes
    oceanBase.connect(oceanFilter);
    oceanFilter.connect(waveGain);
    waveGain.connect(this.masterGain);
    
    // Start ocean sound
    oceanBase.start();
    waveLFO.start();
    
    // Store active sound nodes
    this.activeSounds['ocean'] = [oceanBase, oceanFilter, waveGain, waveLFO, waveModulationGain];
  }
  
  /**
   * Generate gentle lullaby melody
   */
  playLullaby() {
    // Create oscillators for the gentle melody
    const noteOsc = this.audioContext.createOscillator();
    noteOsc.type = 'sine';
    
    // Create gain node for the oscillator
    const noteGain = this.audioContext.createGain();
    noteGain.gain.value = 0.2;
    
    // Connect oscillator to gain node
    noteOsc.connect(noteGain);
    noteGain.connect(this.masterGain);
    
    // Start oscillator
    noteOsc.start();
    
    // Store active sound nodes
    this.activeSounds['lullaby'] = [noteOsc, noteGain];
    
    // Simple pentatonic lullaby melody
    const notes = [
      {note: 'G4', freq: 392.00, duration: 1},
      {note: 'E4', freq: 329.63, duration: 1},
      {note: 'C4', freq: 261.63, duration: 1},
      {note: 'D4', freq: 293.66, duration: 1},
      {note: 'A3', freq: 220.00, duration: 1.5},
      {note: 'C4', freq: 261.63, duration: 0.5},
      {note: 'E4', freq: 329.63, duration: 1},
      {note: 'D4', freq: 293.66, duration: 1},
      {note: 'C4', freq: 261.63, duration: 2},
    ];
    
    // Play melody sequence
    let startTime = this.audioContext.currentTime;
    let noteIndex = 0;
    
    const playNextNote = () => {
      if (!this.activeSounds['lullaby']) {
        return; // Stop if sound has been stopped
      }
      
      const note = notes[noteIndex % notes.length];
      const duration = note.duration * 0.8; // Note duration
      const gap = note.duration * 0.2; // Gap between notes
      
      // Fade in
      noteOsc.frequency.setValueAtTime(note.freq, startTime);
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.2, startTime + 0.1);
      
      // Fade out
      noteGain.gain.setValueAtTime(0.2, startTime + duration - 0.1);
      noteGain.gain.linearRampToValueAtTime(0, startTime + duration);
      
      // Schedule next note
      startTime += note.duration;
      noteIndex++;
      
      setTimeout(playNextNote, (duration + gap) * 1000);
    };
    
    // Start playing melody
    playNextNote();
  }
  
  /**
   * Generate brown noise
   * Brown noise has even more low-frequency components than pink noise
   */
  playBrownNoise() {
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      // Brown noise algorithm
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Scale to suit
    }
    
    const brownNoise = this.audioContext.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;
    
    // Add a low-pass filter with very low frequency for deep sound
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    // Connect nodes
    brownNoise.connect(filter);
    filter.connect(this.masterGain);
    
    // Start playing
    brownNoise.start();
    
    // Store active sound nodes
    this.activeSounds['brown-noise'] = [brownNoise, filter];
  }
  
  /**
   * Generate rain sound
   */
  playRain() {
    // Create noise for rain base
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const rainBase = this.audioContext.createBufferSource();
    rainBase.buffer = noiseBuffer;
    rainBase.loop = true;
    
    // Create filter for rain sound - use bandpass to get the right frequency range
    const rainFilter = this.audioContext.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 2500;
    rainFilter.Q.value = 0.5;
    
    // Create dynamics compressor for rain drops effect
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    
    // Create gain node for rain volume
    const rainGain = this.audioContext.createGain();
    rainGain.gain.value = 0.3;
    
    // Connect nodes
    rainBase.connect(rainFilter);
    rainFilter.connect(compressor);
    compressor.connect(rainGain);
    rainGain.connect(this.masterGain);
    
    // Start rain sound
    rainBase.start();
    
    // Create an occasional heavier raindrop effect
    const raindropScheduler = setInterval(() => {
      if (!this.activeSounds['rain']) {
        clearInterval(raindropScheduler);
        return;
      }
      
      if (Math.random() > 0.7) { // 30% chance of a random heavier drop
        const dropGain = this.audioContext.createGain();
        dropGain.gain.value = 0.1 + (Math.random() * 0.2);
        
        const dropFilter = this.audioContext.createBiquadFilter();
        dropFilter.type = 'lowpass';
        dropFilter.frequency.value = 1000 + (Math.random() * 1500);
        
        const drop = this.audioContext.createBufferSource();
        drop.buffer = noiseBuffer;
        
        drop.connect(dropFilter);
        dropFilter.connect(dropGain);
        dropGain.connect(this.masterGain);
        
        drop.start();
        drop.stop(this.audioContext.currentTime + 0.05 + (Math.random() * 0.1));
      }
    }, 200);
    
    // Store active sound nodes and interval
    this.activeSounds['rain'] = [rainBase, rainFilter, compressor, rainGain, raindropScheduler];
  }
  
  /**
   * Generate snow/gentle breeze sound
   */
  playSnow() {
    // Create noise for snow base (very soft white noise)
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // Gentle, filtered noise
      output[i] = (Math.random() * 2 - 1) * 0.35; // Lower amplitude
    }
    
    const snowBase = this.audioContext.createBufferSource();
    snowBase.buffer = noiseBuffer;
    snowBase.loop = true;
    
    // Create filter for snow sound (gentle high frequencies)
    const snowFilter = this.audioContext.createBiquadFilter();
    snowFilter.type = 'highpass';
    snowFilter.frequency.value = 1500;
    
    // Add another filter to shape the sound
    const secondFilter = this.audioContext.createBiquadFilter();
    secondFilter.type = 'lowpass';
    secondFilter.frequency.value = 7500;
    
    // Create gain node for gentle volume
    const snowGain = this.audioContext.createGain();
    snowGain.gain.value = 0.2;
    
    // Create LFO for subtle wind effect
    const windLFO = this.audioContext.createOscillator();
    windLFO.type = 'sine';
    windLFO.frequency.value = 0.05; // Very slow modulation
    
    const windLFOGain = this.audioContext.createGain();
    windLFOGain.gain.value = 0.05; // Subtle effect
    
    // Connect wind LFO to the main gain
    windLFO.connect(windLFOGain);
    windLFOGain.connect(snowGain.gain);
    
    // Connect snow nodes
    snowBase.connect(snowFilter);
    snowFilter.connect(secondFilter);
    secondFilter.connect(snowGain);
    snowGain.connect(this.masterGain);
    
    // Start snow sound and wind LFO
    snowBase.start();
    windLFO.start();
    
    // Store active sound nodes
    this.activeSounds['snow'] = [snowBase, snowFilter, secondFilter, snowGain, windLFO, windLFOGain];
  }
  
  /**
   * Generate forest sounds with birds and wind
   */
  playForest() {
    // Create noise for forest background (gentle breeze)
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15; // Quiet background
    }
    
    const forestBase = this.audioContext.createBufferSource();
    forestBase.buffer = noiseBuffer;
    forestBase.loop = true;
    
    // Create filter for forest background
    const forestFilter = this.audioContext.createBiquadFilter();
    forestFilter.type = 'bandpass';
    forestFilter.frequency.value = 800;
    forestFilter.Q.value = 0.5;
    
    // Create gain node for forest background
    const forestGain = this.audioContext.createGain();
    forestGain.gain.value = 0.2;
    
    // Connect forest background nodes
    forestBase.connect(forestFilter);
    forestFilter.connect(forestGain);
    forestGain.connect(this.masterGain);
    
    // Start forest background
    forestBase.start();
    
    // Create bird chirping effect at random intervals
    const birdScheduler = setInterval(() => {
      if (!this.activeSounds['forest']) {
        clearInterval(birdScheduler);
        return;
      }
      
      if (Math.random() > 0.7) { // 30% chance of bird chirp
        this.createBirdChirp();
      }
    }, 2000); // Check every 2 seconds
    
    // Create gentle wind rustling at random intervals
    const windScheduler = setInterval(() => {
      if (!this.activeSounds['forest']) {
        clearInterval(windScheduler);
        return;
      }
      
      if (Math.random() > 0.8) { // 20% chance of wind rustle
        this.createWindRustle();
      }
    }, 3000); // Check every 3 seconds
    
    // Store active sound nodes and intervals
    this.activeSounds['forest'] = [forestBase, forestFilter, forestGain, birdScheduler, windScheduler];
  }
  
  /**
   * Helper method to create bird chirp sounds for forest
   */
  createBirdChirp() {
    // Create oscillator for bird chirp
    const birdOsc = this.audioContext.createOscillator();
    birdOsc.type = 'sine';
    
    // Randomize the starting frequency (different birds)
    const baseFreq = 2000 + (Math.random() * 2000);
    birdOsc.frequency.value = baseFreq;
    
    // Create gain node for bird chirp
    const birdGain = this.audioContext.createGain();
    birdGain.gain.value = 0;
    
    // Connect bird nodes
    birdOsc.connect(birdGain);
    birdGain.connect(this.masterGain);
    
    // Generate the chirp pattern (frequency and amplitude modulation)
    const startTime = this.audioContext.currentTime;
    const chirpDuration = 0.1 + (Math.random() * 0.2);
    
    // Ramp up then down for the chirp
    birdGain.gain.setValueAtTime(0, startTime);
    birdGain.gain.linearRampToValueAtTime(0.05 + (Math.random() * 0.1), startTime + 0.05);
    birdGain.gain.linearRampToValueAtTime(0, startTime + chirpDuration);
    
    // Modulate frequency for realistic chirp
    birdOsc.frequency.setValueAtTime(baseFreq, startTime);
    birdOsc.frequency.linearRampToValueAtTime(baseFreq + 500, startTime + 0.05);
    birdOsc.frequency.linearRampToValueAtTime(baseFreq - 300, startTime + chirpDuration);
    
    // Start and stop the chirp
    birdOsc.start(startTime);
    birdOsc.stop(startTime + chirpDuration + 0.05);
    
    // Double chirp effect (common in many birds)
    if (Math.random() > 0.5) {
      const secondChirp = this.audioContext.createOscillator();
      secondChirp.type = 'sine';
      secondChirp.frequency.value = baseFreq + 200;
      
      const secondGain = this.audioContext.createGain();
      secondGain.gain.value = 0;
      
      secondChirp.connect(secondGain);
      secondGain.connect(this.masterGain);
      
      const secondStartTime = startTime + chirpDuration + 0.08;
      const secondDuration = 0.1 + (Math.random() * 0.15);
      
      secondGain.gain.setValueAtTime(0, secondStartTime);
      secondGain.gain.linearRampToValueAtTime(0.05 + (Math.random() * 0.1), secondStartTime + 0.05);
      secondGain.gain.linearRampToValueAtTime(0, secondStartTime + secondDuration);
      
      secondChirp.frequency.setValueAtTime(baseFreq + 200, secondStartTime);
      secondChirp.frequency.linearRampToValueAtTime(baseFreq + 700, secondStartTime + 0.05);
      secondChirp.frequency.linearRampToValueAtTime(baseFreq, secondStartTime + secondDuration);
      
      secondChirp.start(secondStartTime);
      secondChirp.stop(secondStartTime + secondDuration + 0.05);
    }
  }
  
  /**
   * Helper method to create wind rustling sounds for forest
   */
  createWindRustle() {
    // Create noise for wind rustle
    const bufferSize = this.audioContext.sampleRate / 2; // 0.5 seconds
    const rustleBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = rustleBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.3;
    }
    
    const rustleNoise = this.audioContext.createBufferSource();
    rustleNoise.buffer = rustleBuffer;
    
    // Create filter for wind rustle
    const rustleFilter = this.audioContext.createBiquadFilter();
    rustleFilter.type = 'bandpass';
    rustleFilter.frequency.value = 800 + (Math.random() * 1200);
    rustleFilter.Q.value = 1;
    
    // Create gain node for wind rustle
    const rustleGain = this.audioContext.createGain();
    rustleGain.gain.value = 0;
    
    // Connect wind rustle nodes
    rustleNoise.connect(rustleFilter);
    rustleFilter.connect(rustleGain);
    rustleGain.connect(this.masterGain);
    
    // Create the wind rustle effect
    const startTime = this.audioContext.currentTime;
    const rustleDuration = 1 + (Math.random() * 2);
    
    // Fade in and out for natural sound
    rustleGain.gain.setValueAtTime(0, startTime);
    rustleGain.gain.linearRampToValueAtTime(0.1 + (Math.random() * 0.1), startTime + (rustleDuration * 0.3));
    rustleGain.gain.linearRampToValueAtTime(0, startTime + rustleDuration);
    
    // Start and stop the rustle
    rustleNoise.start(startTime);
    rustleNoise.stop(startTime + rustleDuration);
  }
} 