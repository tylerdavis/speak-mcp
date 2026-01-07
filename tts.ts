import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as fsSync from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as https from "node:https";
import * as readline from "node:readline";
import { URL } from "node:url";

export const PIPER_VERSION = "2023.11.14-2";
export const VOICES_JSON_URL = "https://huggingface.co/rhasspy/piper-voices/raw/main/voices.json";

export interface PlatformInfo {
  os: 'linux' | 'darwin' | 'win32';
  arch: 'x64' | 'arm64';
  piperFileName: string;
  piperDownloadUrl: string;
  audioPlayer: string;
  audioPlayerArgs: (audioPath: string) => string[];
}

export interface VoiceInfo {
  key: string;
  name: string;
  language: {
    code: string;
    name_english: string;
    country_english: string;
  };
  quality: string;
  files: Record<string, { size_bytes: number; md5_digest: string }>;
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
}

export function detectPlatform(): PlatformInfo {
  const platform = os.platform();
  const arch = os.arch();

  let piperFileName: string;
  let piperOs: 'linux' | 'darwin' | 'win32';
  let piperArch: 'x64' | 'arm64';
  let audioPlayer: string;
  let audioPlayerArgs: (audioPath: string) => string[];

  if (platform === 'darwin') {
    piperOs = 'darwin';
    audioPlayer = 'afplay';
    audioPlayerArgs = (audioPath: string) => [audioPath];

    if (arch === 'arm64') {
      piperArch = 'arm64';
      piperFileName = 'piper_macos_aarch64.tar.gz';
    } else {
      piperArch = 'x64';
      piperFileName = 'piper_macos_x86_64.tar.gz';
    }
  } else if (platform === 'linux') {
    piperOs = 'linux';
    audioPlayer = 'aplay';
    audioPlayerArgs = (audioPath: string) => [audioPath];

    if (arch === 'arm64' || arch === 'aarch64') {
      piperArch = 'arm64';
      piperFileName = 'piper_linux_aarch64.tar.gz';
    } else {
      piperArch = 'x64';
      piperFileName = 'piper_linux_x86_64.tar.gz';
    }
  } else if (platform === 'win32') {
    piperOs = 'win32';
    audioPlayer = 'powershell';
    audioPlayerArgs = (audioPath: string) => [
      '-c',
      `(New-Object Media.SoundPlayer '${audioPath}').PlaySync()`
    ];
    piperArch = 'x64';
    piperFileName = 'piper_windows_amd64.zip';
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const piperDownloadUrl = `https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/${piperFileName}`;

  return {
    os: piperOs,
    arch: piperArch,
    piperFileName,
    piperDownloadUrl,
    audioPlayer,
    audioPlayerArgs,
  };
}

export async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fsSync.createWriteStream(destPath);

    const request = (redirectUrl: string, redirectCount = 0): void => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      https.get(redirectUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const location = response.headers.location;
          if (location) {
            // Handle relative redirects
            const nextUrl = location.startsWith('http') ? location : new URL(location, redirectUrl).href;
            console.error(`Following redirect to ${nextUrl}`);
            request(nextUrl, redirectCount + 1);
          } else {
            reject(new Error('Redirect without location header'));
          }
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastProgress = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const progress = Math.floor((downloadedBytes / totalBytes) * 100);
            if (progress >= lastProgress + 10) {
              console.error(`Download progress: ${progress}%`);
              lastProgress = progress;
            }
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.error('Download complete');
          resolve();
        });
      }).on('error', (err) => {
        fsSync.unlink(destPath, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

export async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  await ensureDirectoryExists(destDir);

  return new Promise((resolve, reject) => {
    const isZip = archivePath.endsWith('.zip');
    const command = isZip ? 'unzip' : 'tar';
    const args = isZip
      ? ['-q', archivePath, '-d', destDir]
      : ['-xzf', archivePath, '-C', destDir];

    const proc = spawn(command, args);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Extraction failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run ${command}: ${err.message}`));
    });
  });
}

export async function makeExecutable(filePath: string): Promise<void> {
  if (os.platform() !== 'win32') {
    try {
      await fs.chmod(filePath, 0o755);
    } catch (error) {
      throw new Error(`Failed to make ${filePath} executable: ${error}`);
    }
  }
}

export async function downloadPiperBinary(platform: PlatformInfo, destDir: string): Promise<string> {
  console.error('Downloading piper binary...');

  const tmpDir = os.tmpdir();
  const archivePath = path.join(tmpDir, platform.piperFileName);

  try {
    await downloadFile(platform.piperDownloadUrl, archivePath);

    console.error('Extracting piper binary...');
    await extractArchive(archivePath, destDir);

    const piperBinaryName = platform.os === 'win32' ? 'piper.exe' : 'piper';
    const piperPath = path.join(destDir, 'piper', piperBinaryName);

    await makeExecutable(piperPath);

    await fs.unlink(archivePath).catch(() => {});

    console.error('Piper binary installed successfully');
    return piperPath;
  } catch (error) {
    await fs.unlink(archivePath).catch(() => {});
    throw error;
  }
}

export async function fetchAvailableVoices(): Promise<VoiceInfo[]> {
  console.error('Fetching available voices...');

  return new Promise((resolve, reject) => {
    https.get(VOICES_JSON_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch voices: HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const voicesData = JSON.parse(data);
          const voices: VoiceInfo[] = [];

          for (const [key, value] of Object.entries(voicesData)) {
            const voiceData = value as any;
            if (key.startsWith('en_US-')) {
              voices.push({
                key,
                name: voiceData.name || key,
                language: voiceData.language || { code: 'en_US', name_english: 'English', country_english: 'United States' },
                quality: voiceData.quality || 'medium',
                files: voiceData.files || {},
              });
            }
          }

          voices.sort((a, b) => {
            const qualityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
            return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
          });

          resolve(voices);
        } catch (error) {
          reject(new Error(`Failed to parse voices JSON: ${error}`));
        }
      });
    }).on('error', reject);
  });
}

export async function promptUserForVoice(voices: VoiceInfo[]): Promise<VoiceInfo> {
  console.error('\nAvailable voices:');
  voices.forEach((voice, index) => {
    const sizeBytes = Object.values(voice.files)[0]?.size_bytes || 0;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(1);
    console.error(`${index + 1}. ${voice.name} (${voice.quality} quality, ${sizeMB}MB)`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('\nSelect a voice (enter number): ', (answer) => {
      rl.close();

      const selection = parseInt(answer, 10);
      if (isNaN(selection) || selection < 1 || selection > voices.length) {
        reject(new Error('Invalid selection'));
        return;
      }

      resolve(voices[selection - 1]);
    });
  });
}

export async function downloadVoiceModel(voice: VoiceInfo, destDir: string): Promise<string> {
  console.error(`Downloading voice model: ${voice.name}...`);

  const voiceDir = path.join(destDir, voice.key);
  await ensureDirectoryExists(voiceDir);

  const baseUrl = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';

  for (const [filePath, fileInfo] of Object.entries(voice.files)) {
    const fileName = path.basename(filePath);
    const destPath = path.join(voiceDir, fileName);
    const downloadUrl = `${baseUrl}/${filePath}`;

    console.error(`Downloading ${fileName}...`);
    await downloadFile(downloadUrl, destPath);
  }

  const onnxFile = Object.keys(voice.files).find(f => f.endsWith('.onnx'));
  if (!onnxFile) {
    throw new Error('No .onnx file found for voice');
  }

  const onnxPath = path.join(voiceDir, path.basename(onnxFile));
  console.error('Voice model downloaded successfully');
  return onnxPath;
}

export async function generateAudio(
  piperPath: string,
  voiceModelPath: string,
  text: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(piperPath, [
      '--model', voiceModelPath,
      '--output_file', outputPath
    ]);

    proc.stdin.write(text);
    proc.stdin.end();

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Piper failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run piper: ${err.message}`));
    });
  });
}

export async function playAudio(audioPath: string, platform: PlatformInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = platform.audioPlayerArgs(audioPath);
    const proc = spawn(platform.audioPlayer, args);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Audio player failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run audio player ${platform.audioPlayer}: ${err.message}`));
    });
  });
}

export async function cleanupTempFiles(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore errors if file doesn't exist
  }
}
