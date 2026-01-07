import { test, describe } from 'node:test';
import assert from 'node:assert';
import * as os from 'node:os';
import { detectPlatform, ensureDirectoryExists, cleanupTempFiles } from './tts.js';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

describe('detectPlatform', () => {
  test('should return platform info with correct structure', () => {
    const platform = detectPlatform();

    assert.ok(platform, 'Platform info should be defined');
    assert.ok(['linux', 'darwin', 'win32'].includes(platform.os), `Platform OS should be valid, got ${platform.os}`);
    assert.ok(['x64', 'arm64'].includes(platform.arch), `Platform arch should be valid, got ${platform.arch}`);
    assert.ok(platform.piperFileName, 'Piper filename should be defined');
    assert.ok(platform.piperDownloadUrl, 'Download URL should be defined');
    assert.ok(platform.audioPlayer, 'Audio player should be defined');
    assert.strictEqual(typeof platform.audioPlayerArgs, 'function', 'audioPlayerArgs should be a function');
  });

  test('should include correct audio player for platform', () => {
    const platform = detectPlatform();
    const currentPlatform = os.platform();

    if (currentPlatform === 'darwin') {
      assert.strictEqual(platform.audioPlayer, 'afplay', 'macOS should use afplay');
    } else if (currentPlatform === 'linux') {
      assert.strictEqual(platform.audioPlayer, 'aplay', 'Linux should use aplay');
    } else if (currentPlatform === 'win32') {
      assert.strictEqual(platform.audioPlayer, 'powershell', 'Windows should use powershell');
    }
  });

  test('audio player args should return array', () => {
    const platform = detectPlatform();
    const args = platform.audioPlayerArgs('/test/path.wav');

    assert.ok(Array.isArray(args), 'Args should be an array');
    assert.ok(args.length > 0, 'Args should not be empty');
  });
});

describe('ensureDirectoryExists', () => {
  test('should create a new directory', async () => {
    const testDir = path.join(os.tmpdir(), `test-speak-${Date.now()}`);

    try {
      await ensureDirectoryExists(testDir);
      const stats = await fs.stat(testDir);
      assert.ok(stats.isDirectory(), 'Should create a directory');
    } finally {
      await fs.rmdir(testDir).catch(() => {});
    }
  });

  test('should not throw if directory already exists', async () => {
    const testDir = path.join(os.tmpdir(), `test-speak-${Date.now()}`);

    try {
      await fs.mkdir(testDir);
      await ensureDirectoryExists(testDir); // Should not throw
      const stats = await fs.stat(testDir);
      assert.ok(stats.isDirectory(), 'Directory should still exist');
    } finally {
      await fs.rmdir(testDir).catch(() => {});
    }
  });

  test('should create nested directories', async () => {
    const testDir = path.join(os.tmpdir(), `test-speak-${Date.now()}`, 'nested', 'path');

    try {
      await ensureDirectoryExists(testDir);
      const stats = await fs.stat(testDir);
      assert.ok(stats.isDirectory(), 'Should create nested directories');
    } finally {
      const parentDir = path.join(os.tmpdir(), `test-speak-${Date.now()}`);
      await fs.rm(parentDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('cleanupTempFiles', () => {
  test('should delete existing file', async () => {
    const testFile = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
    await fs.writeFile(testFile, 'test content');

    await cleanupTempFiles(testFile);

    await assert.rejects(
      () => fs.access(testFile),
      'File should be deleted'
    );
  });

  test('should not throw if file does not exist', async () => {
    const nonExistentFile = path.join(os.tmpdir(), `non-existent-${Date.now()}.txt`);

    // Should not throw
    await cleanupTempFiles(nonExistentFile);
  });
});
