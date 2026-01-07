import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PiperManager } from './piper-manager.js';
import type { VoiceInfo } from './tts.js';

describe('Voice Management - Helper Methods', () => {
  describe('formatVoiceSize()', () => {
    test('should format bytes to MB with 1 decimal place', () => {
      // Given: PiperManager instance with formatVoiceSize method
      // When: formatVoiceSize is called with bytes
      // Then: should return formatted string like "116.2MB"

      // This will test: 121634816 bytes = 116.0 MB
      // Implementation needed in PiperManager
    });

    test('should handle 0 bytes', () => {
      // Given: PiperManager instance
      // When: formatVoiceSize(0) is called
      // Then: should return "0.0MB"
    });

    test('should handle very large sizes', () => {
      // Given: PiperManager instance
      // When: formatVoiceSize is called with 1GB+
      // Then: should return size in MB (e.g., "1024.0MB")
    });
  });

  describe('checkVoiceDownloaded()', () => {
    test('should return true if voice directory and .onnx file exist', async () => {
      // Given: voice directory exists with .onnx file
      // When: checkVoiceDownloaded('en_US-amy-high') is called
      // Then: should return true
    });

    test('should return false if voice directory is missing', async () => {
      // Given: voice directory does not exist
      // When: checkVoiceDownloaded('en_US-nonexistent') is called
      // Then: should return false
    });

    test('should return false if .onnx file is missing', async () => {
      // Given: voice directory exists but .onnx file missing
      // When: checkVoiceDownloaded is called
      // Then: should return false
    });

    test('should handle filesystem errors gracefully', async () => {
      // Given: filesystem throws permission error
      // When: checkVoiceDownloaded is called
      // Then: should return false (not throw)
    });
  });

  describe('matchVoice()', () => {
    let mockVoices: VoiceInfo[];

    beforeEach(() => {
      // Setup mock voice list
      mockVoices = [
        {
          key: 'en_US-amy-high',
          name: 'Amy (high quality)',
          language: { code: 'en_US', name_english: 'English', country_english: 'United States' },
          quality: 'high',
          files: { 'en_US/en_US-amy-high/en_US-amy-high.onnx': { size_bytes: 121634816, md5_digest: 'abc123' } }
        },
        {
          key: 'en_US-amy-medium',
          name: 'Amy (medium quality)',
          language: { code: 'en_US', name_english: 'English', country_english: 'United States' },
          quality: 'medium',
          files: { 'en_US/en_US-amy-medium/en_US-amy-medium.onnx': { size_bytes: 66048000, md5_digest: 'def456' } }
        },
        {
          key: 'en_US-danny-high',
          name: 'Danny (high quality)',
          language: { code: 'en_US', name_english: 'English', country_english: 'United States' },
          quality: 'high',
          files: { 'en_US/en_US-danny-high/en_US-danny-high.onnx': { size_bytes: 121634816, md5_digest: 'ghi789' } }
        }
      ];
    });

    test('should match exact voice key', () => {
      // Given: voice list and exact key identifier
      // When: matchVoice('en_US-amy-high', mockVoices) is called
      // Then: should return amy-high voice object
    });

    test('should match short name without en_US prefix', () => {
      // Given: voice list and short name
      // When: matchVoice('amy-high', mockVoices) is called
      // Then: should return amy-high voice object
    });

    test('should match partial name and pick highest quality', () => {
      // Given: voice list with amy-high and amy-medium
      // When: matchVoice('amy', mockVoices) is called
      // Then: should return amy-high (highest quality match)
    });

    test('should match numeric index (1-based)', () => {
      // Given: voice list with 3 voices
      // When: matchVoice('1', mockVoices) is called
      // Then: should return first voice (amy-high)
    });

    test('should return null for invalid numeric index', () => {
      // Given: voice list with 3 voices
      // When: matchVoice('99', mockVoices) is called
      // Then: should return null
    });

    test('should return null for completely invalid identifier', () => {
      // Given: voice list
      // When: matchVoice('xyznonsense', mockVoices) is called
      // Then: should return null
    });

    test('should handle empty voice list', () => {
      // Given: empty voice list
      // When: matchVoice('amy', []) is called
      // Then: should return null
    });
  });
});

describe('Voice Management - listVoices()', () => {
  test('should throw if not initialized', async () => {
    // Given: PiperManager not initialized
    // When: listVoices() is called
    // Then: should throw error "PiperManager not initialized"
  });

  test('should fetch voices from Hugging Face', async () => {
    // Given: initialized PiperManager
    // When: listVoices() is called
    // Then: should call fetchAvailableVoices()
  });

  test('should check which voices are downloaded', async () => {
    // Given: initialized PiperManager with some voices downloaded
    // When: listVoices() is called
    // Then: should call checkVoiceDownloaded for each voice
  });

  test('should format output with current voice marked', async () => {
    // Given: initialized PiperManager with current voice selected
    // When: listVoices() is called
    // Then: output should contain "Currently selected: {voice} *"
  });

  test('should separate downloaded vs available voices', async () => {
    // Given: initialized PiperManager with mixed downloaded/not-downloaded voices
    // When: listVoices() is called
    // Then: should have "Available to download:" and "Already downloaded:" sections
  });

  test('should show voice sizes in MB', async () => {
    // Given: initialized PiperManager
    // When: listVoices() is called
    // Then: each voice should show size like "(high quality, 116.2MB)"
  });

  test('should handle no current voice selected', async () => {
    // Given: initialized PiperManager with no voice selected
    // When: listVoices() is called
    // Then: should not show "Currently selected" section
  });

  test('should handle empty voice list', async () => {
    // Given: fetchAvailableVoices returns empty array
    // When: listVoices() is called
    // Then: should return message indicating no voices available
  });

  test('should handle network errors gracefully', async () => {
    // Given: fetchAvailableVoices throws network error
    // When: listVoices() is called
    // Then: should throw with helpful error message
  });
});

describe('Voice Management - changeVoice()', () => {
  test('should throw if not initialized', async () => {
    // Given: PiperManager not initialized
    // When: changeVoice('amy-high') is called
    // Then: should throw error "PiperManager not initialized"
  });

  test('should throw if voice not found', async () => {
    // Given: initialized PiperManager
    // When: changeVoice('nonexistent-voice') is called
    // Then: should throw error with message suggesting to use list_voices
  });

  test('should switch to cached voice immediately', async () => {
    // Given: initialized PiperManager with cached voice
    // When: changeVoice('amy-high') is called
    // Then: should not download, should update config immediately
  });

  test('should download uncached voice before switching', async () => {
    // Given: initialized PiperManager with voice not cached
    // When: changeVoice('danny-high') is called
    // Then: should call downloadVoiceModel before updating config
  });

  test('should update config after switch', async () => {
    // Given: initialized PiperManager
    // When: changeVoice('amy-high') is called successfully
    // Then: config.selectedVoice should be updated and saved
  });

  test('should update voiceModelPath instance variable', async () => {
    // Given: initialized PiperManager
    // When: changeVoice('amy-high') is called successfully
    // Then: this.voiceModelPath should point to new voice .onnx file
  });

  test('should handle download failures without changing config', async () => {
    // Given: downloadVoiceModel throws error
    // When: changeVoice('new-voice') is called
    // Then: should throw error and config should remain unchanged
  });

  test('should accept full key format (en_US-amy-high)', async () => {
    // Given: initialized PiperManager
    // When: changeVoice('en_US-amy-high') is called
    // Then: should match and switch to amy-high
  });

  test('should accept short name format (amy-high)', async () => {
    // Given: initialized PiperManager
    // When: changeVoice('amy-high') is called
    // Then: should match and switch to amy-high
  });

  test('should accept partial name (amy)', async () => {
    // Given: initialized PiperManager with amy-high and amy-medium
    // When: changeVoice('amy') is called
    // Then: should match highest quality (amy-high)
  });

  test('should accept numeric index (1)', async () => {
    // Given: initialized PiperManager
    // When: changeVoice('1') is called
    // Then: should switch to first voice in list
  });

  test('should handle network errors gracefully', async () => {
    // Given: fetchAvailableVoices throws network error
    // When: changeVoice('amy') is called
    // Then: should throw with helpful error message
  });

  test('should return success message with voice details', async () => {
    // Given: initialized PiperManager
    // When: changeVoice('amy-high') is called successfully
    // Then: should return message like "Voice changed successfully to: amy-high (high quality, 116.2MB)"
  });
});

describe('MCP Tool Handlers', () => {
  describe('list_voices tool', () => {
    test('should call piperManager.listVoices()', async () => {
      // Given: MCP server with list_voices tool
      // When: list_voices tool is called
      // Then: should call piperManager.listVoices()
    });

    test('should return formatted voice list', async () => {
      // Given: piperManager.listVoices() returns formatted string
      // When: list_voices tool is called
      // Then: should return content with type "text" and the formatted list
    });

    test('should return error message on failure', async () => {
      // Given: piperManager.listVoices() throws error
      // When: list_voices tool is called
      // Then: should return content with error message
    });
  });

  describe('change_voice tool', () => {
    test('should validate voice parameter is required', async () => {
      // Given: MCP server with change_voice tool
      // When: change_voice is called without voice parameter
      // Then: should throw error "Voice identifier is required"
    });

    test('should validate voice parameter is string', async () => {
      // Given: MCP server with change_voice tool
      // When: change_voice is called with non-string voice parameter
      // Then: should throw error "must be a string"
    });

    test('should call piperManager.changeVoice() with parameter', async () => {
      // Given: MCP server with change_voice tool
      // When: change_voice tool is called with voice='amy-high'
      // Then: should call piperManager.changeVoice('amy-high')
    });

    test('should return success message', async () => {
      // Given: piperManager.changeVoice() succeeds
      // When: change_voice tool is called
      // Then: should return content with success message
    });

    test('should return error message on failure', async () => {
      // Given: piperManager.changeVoice() throws error
      // When: change_voice tool is called
      // Then: should return content with error message
    });
  });
});
