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
}
