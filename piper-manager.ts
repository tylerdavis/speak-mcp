import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  PIPER_VERSION,
  PlatformInfo,
  VoiceInfo,
  detectPlatform,
  ensureDirectoryExists,
  downloadPiperBinary,
  fetchAvailableVoices,
  promptUserForVoice,
  downloadVoiceModel,
  generateAudio,
  playAudio,
  cleanupTempFiles,
} from "./tts.js";

export interface Config {
  version: string;
  selectedVoice?: {
    key: string;
    name: string;
    languageCode: string;
    quality: string;
    modelPath: string;
    configPath: string;
  };
  piperBinary?: {
    path: string;
    version: string;
    platform: string;
    arch: string;
  };
}

export class PiperManager {
  private configDir: string;
  private binDir: string;
  private voicesDir: string;
  private configFile: string;
  private config: Config | null = null;
  private piperPath: string | null = null;
  private voiceModelPath: string | null = null;
  private platform: PlatformInfo;
  private isInitialized: boolean = false;

  constructor(configDir: string, binDir: string, voicesDir: string, configFile: string) {
    this.configDir = configDir;
    this.binDir = binDir;
    this.voicesDir = voicesDir;
    this.configFile = configFile;
    this.platform = detectPlatform();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.error('Initializing Speak MCP Server with TTS...');

    await ensureDirectoryExists(this.configDir);
    await ensureDirectoryExists(this.binDir);
    await ensureDirectoryExists(this.voicesDir);

    await this.loadConfig();
    await this.ensurePiperInstalled();
    await this.ensureVoiceSelected();

    this.isInitialized = true;
    console.error('TTS initialization complete');
  }

  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configFile, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      this.config = { version: '1.0.0' };
    }
  }

  private async saveConfig(): Promise<void> {
    const data = JSON.stringify(this.config, null, 2);
    await fs.writeFile(this.configFile, data, 'utf-8');
  }

  private async ensurePiperInstalled(): Promise<void> {
    // First, check if piper is available in PATH
    const { spawn } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const exec = promisify(spawn);

    try {
      // Try to find piper in PATH
      const whichResult = await new Promise<string>((resolve, reject) => {
        const proc = spawn('which', ['piper']);
        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.on('close', (code) => {
          if (code === 0 && output.trim()) {
            resolve(output.trim());
          } else {
            reject(new Error('piper not in PATH'));
          }
        });
      });

      if (whichResult) {
        this.piperPath = whichResult;
        console.error(`Using system piper at ${whichResult}`);

        if (!this.config) {
          this.config = { version: '1.0.0' };
        }

        this.config.piperBinary = {
          path: this.piperPath,
          version: 'system',
          platform: this.platform.os,
          arch: this.platform.arch,
        };

        await this.saveConfig();
        return;
      }
    } catch (error) {
      // piper not in PATH, continue to check local installation
    }

    // Check for local piper installation
    const piperBinaryName = this.platform.os === 'win32' ? 'piper.exe' : 'piper';
    const expectedPath = path.join(this.binDir, 'piper', piperBinaryName);

    try {
      await fs.access(expectedPath);

      if (this.config?.piperBinary?.version === PIPER_VERSION) {
        this.piperPath = expectedPath;
        console.error(`Using existing piper binary at ${expectedPath}`);
        return;
      }
    } catch (error) {
      // Binary doesn't exist, download it
    }

    try {
      this.piperPath = await downloadPiperBinary(this.platform, this.binDir);

      if (!this.config) {
        this.config = { version: '1.0.0' };
      }

      this.config.piperBinary = {
        path: this.piperPath,
        version: PIPER_VERSION,
        platform: this.platform.os,
        arch: this.platform.arch,
      };

      await this.saveConfig();
    } catch (error) {
      throw new Error(`Failed to install piper binary: ${error}`);
    }
  }

  private async ensureVoiceSelected(): Promise<void> {
    if (this.config?.selectedVoice?.modelPath) {
      try {
        await fs.access(this.config.selectedVoice.modelPath);
        this.voiceModelPath = this.config.selectedVoice.modelPath;
        console.error(`Using existing voice: ${this.config.selectedVoice.name}`);
        return;
      } catch (error) {
        console.error('Configured voice not found, prompting for selection...');
      }
    }

    try {
      const voices = await fetchAvailableVoices();

      if (voices.length === 0) {
        throw new Error('No voices available');
      }

      const selectedVoice = await promptUserForVoice(voices);
      const modelPath = await downloadVoiceModel(selectedVoice, this.voicesDir);

      this.voiceModelPath = modelPath;

      if (!this.config) {
        this.config = { version: '1.0.0' };
      }

      this.config.selectedVoice = {
        key: selectedVoice.key,
        name: selectedVoice.name,
        languageCode: selectedVoice.language.code,
        quality: selectedVoice.quality,
        modelPath: modelPath,
        configPath: modelPath.replace('.onnx', '.onnx.json'),
      };

      await this.saveConfig();
    } catch (error) {
      throw new Error(`Failed to setup voice: ${error}`);
    }
  }

  async speakMessage(text: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('PiperManager not initialized');
    }

    if (!this.piperPath || !this.voiceModelPath) {
      throw new Error('Piper binary or voice model not configured');
    }

    const tempFileName = `speak-${Date.now()}.wav`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
      await generateAudio(this.piperPath, this.voiceModelPath, text, tempFilePath);
      await playAudio(tempFilePath, this.platform);
      await cleanupTempFiles(tempFilePath);
      return 'Audio played successfully';
    } catch (error) {
      await cleanupTempFiles(tempFilePath);
      throw error;
    }
  }

  private formatVoiceSize(bytes: number): string {
    const megabytes = bytes / 1024 / 1024;
    return `${megabytes.toFixed(1)}MB`;
  }

  private async checkVoiceDownloaded(voiceKey: string): Promise<boolean> {
    try {
      const voiceDir = path.join(this.voicesDir, voiceKey);
      await fs.access(voiceDir);

      // Check for .onnx file in the directory
      const files = await fs.readdir(voiceDir);
      const hasOnnx = files.some(file => file.endsWith('.onnx'));

      return hasOnnx;
    } catch (error) {
      return false;
    }
  }

  private matchVoice(identifier: string, voices: VoiceInfo[]): VoiceInfo | null {
    if (voices.length === 0) {
      return null;
    }

    // Try numeric index (1-based)
    const numericIndex = parseInt(identifier, 10);
    if (!isNaN(numericIndex) && numericIndex >= 1 && numericIndex <= voices.length) {
      return voices[numericIndex - 1];
    }

    // Try exact match on voice.key
    let match = voices.find(v => v.key === identifier);
    if (match) {
      return match;
    }

    // Try match without 'en_US-' prefix
    match = voices.find(v => v.key === `en_US-${identifier}`);
    if (match) {
      return match;
    }

    // Try partial match (case-insensitive)
    const partialMatches = voices.filter(v =>
      v.key.toLowerCase().includes(identifier.toLowerCase()) ||
      v.name.toLowerCase().includes(identifier.toLowerCase())
    );

    if (partialMatches.length === 0) {
      return null;
    }

    // If multiple partial matches, prefer highest quality
    const qualityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    partialMatches.sort((a, b) => {
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });

    return partialMatches[0];
  }

  async listVoices(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('PiperManager not initialized');
    }

    // Fetch available voices
    const voices = await fetchAvailableVoices();

    if (voices.length === 0) {
      return 'No voices available.';
    }

    // Check which are downloaded
    const downloadedVoices = new Set<string>();
    for (const voice of voices) {
      if (await this.checkVoiceDownloaded(voice.key)) {
        downloadedVoices.add(voice.key);
      }
    }

    const currentVoiceKey = this.config?.selectedVoice?.key;

    // Format output
    let output = `Available voices (${voices.length} total):\n\n`;

    if (currentVoiceKey) {
      const currentVoice = voices.find(v => v.key === currentVoiceKey);
      if (currentVoice) {
        const size = this.formatVoiceSize(Object.values(currentVoice.files)[0]?.size_bytes || 0);
        output += `Currently selected: ${currentVoice.name} (${currentVoice.quality} quality, ${size}) *\n\n`;
      }
    }

    // List available to download
    const toDownload = voices.filter(v => !downloadedVoices.has(v.key));
    if (toDownload.length > 0) {
      output += 'Available to download:\n';
      toDownload.forEach((voice, idx) => {
        const size = this.formatVoiceSize(Object.values(voice.files)[0]?.size_bytes || 0);
        output += `${idx + 1}. ${voice.name} (${voice.quality} quality, ${size})\n`;
      });
      output += '\n';
    }

    // List already downloaded
    const downloaded = voices.filter(v => downloadedVoices.has(v.key));
    if (downloaded.length > 0) {
      output += 'Already downloaded:\n';
      downloaded.forEach(voice => {
        const size = this.formatVoiceSize(Object.values(voice.files)[0]?.size_bytes || 0);
        const marker = voice.key === currentVoiceKey ? ' *' : '';
        output += `• ${voice.name} (${voice.quality} quality, ${size})${marker}\n`;
      });
    }

    return output;
  }

  async changeVoice(voiceIdentifier: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('PiperManager not initialized');
    }

    // Fetch available voices
    const voices = await fetchAvailableVoices();

    // Match voice
    const selectedVoice = this.matchVoice(voiceIdentifier, voices);
    if (!selectedVoice) {
      throw new Error(
        `Voice '${voiceIdentifier}' not found. Use the list_voices tool to see available voices.`
      );
    }

    // Check if voice is already downloaded
    const isDownloaded = await this.checkVoiceDownloaded(selectedVoice.key);

    let modelPath: string;

    if (!isDownloaded) {
      console.error(`Voice not cached. Downloading ${selectedVoice.name} (this may take 1-2 minutes)...`);
      try {
        modelPath = await downloadVoiceModel(selectedVoice, this.voicesDir);
      } catch (error) {
        throw new Error(
          `Failed to download voice ${selectedVoice.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      // Find the .onnx file path
      const voiceDir = path.join(this.voicesDir, selectedVoice.key);
      const files = await fs.readdir(voiceDir);
      const onnxFile = files.find(f => f.endsWith('.onnx'));
      if (!onnxFile) {
        throw new Error(`Voice model file not found for ${selectedVoice.key}`);
      }
      modelPath = path.join(voiceDir, onnxFile);
    }

    // Update config
    if (!this.config) {
      this.config = { version: '1.0.0' };
    }

    this.config.selectedVoice = {
      key: selectedVoice.key,
      name: selectedVoice.name,
      languageCode: selectedVoice.language.code,
      quality: selectedVoice.quality,
      modelPath: modelPath,
      configPath: modelPath.replace('.onnx', '.onnx.json'),
    };

    // Update instance variable
    this.voiceModelPath = modelPath;

    // Save config
    await this.saveConfig();

    const size = this.formatVoiceSize(Object.values(selectedVoice.files)[0]?.size_bytes || 0);
    return `Voice changed successfully to: ${selectedVoice.name} (${selectedVoice.quality} quality, ${size})\nReady to use immediately.`;
  }
}
