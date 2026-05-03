"""
Alarm Handler for Driver Drowsiness & Road Violations
======================================================
Triggers laptop speaker alerts for safety violations.
Works on Windows, macOS, and Linux.
"""

import os
import sys
import threading
import time

# Platform-specific imports
if sys.platform == "win32":
    import winsound

try:
    import pygame
    PYGAME_AVAILABLE = True
except ImportError:
    PYGAME_AVAILABLE = False


class AlarmHandler:
    """Manages audio alarms for safety alerts."""

    def __init__(self, enable_audio=True, enable_beep=True):
        """
        Initialize alarm handler.
        
        Args:
            enable_audio: Whether to play audio files (requires pygame)
            enable_beep: Whether to use system beep (winsound on Windows)
        """
        self.enable_audio = enable_audio
        self.enable_beep = enable_beep
        self.alarm_active = False
        self.alarm_thread = None
        self.stop_alarm = False
        
        # Alarm file paths
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.alarm_sound_path = os.path.join(self.script_dir, "alarm.wav")
        
        # Initialize pygame if available and audio enabled
        if self.enable_audio and PYGAME_AVAILABLE:
            try:
                pygame.mixer.init()
                print("[OK] Pygame mixer initialized for audio alarms")
            except Exception as e:
                print(f"[WARN] Failed to init pygame: {e}")
                self.enable_audio = False

    def play_beep(self, duration_ms=500, frequency=1000):
        """
        Play system beep (Windows only).
        
        Args:
            duration_ms: Duration in milliseconds
            frequency: Frequency in Hz
        """
        if not self.enable_beep or sys.platform != "win32":
            return
        
        try:
            winsound.Beep(frequency, duration_ms)
        except Exception as e:
            print(f"[WARN] Failed to play beep: {e}")

    def play_audio_file(self, repeat=1):
        """
        Play alarm audio file (pygame).
        
        Args:
            repeat: Number of times to repeat the audio
        """
        if not self.enable_audio or not PYGAME_AVAILABLE:
            return False
        
        if not os.path.exists(self.alarm_sound_path):
            return False
        
        try:
            pygame.mixer.music.load(self.alarm_sound_path)
            pygame.mixer.music.play(repeat - 1)  # -1 = repeat forever
            return True
        except Exception as e:
            print(f"[WARN] Failed to play audio: {e}")
            return False

    def trigger_drowsiness_alarm(self):
        """Trigger alarm for drowsiness detection."""
        if self.alarm_active:
            return
        
        print("🚨 DROWSINESS DETECTED - TRIGGERING ALARM!")
        self._start_alarm_sequence(
            alarm_type="drowsiness",
            beep_frequency=1200,
            duration_sec=3
        )

    def trigger_violation_alarm(self, violation_type="road_violation"):
        """Trigger alarm for road violations (overspeeding, harsh braking, etc.)."""
        if self.alarm_active:
            return
        
        print(f"⚠️ VIOLATION DETECTED ({violation_type}) - TRIGGERING ALARM!")
        self._start_alarm_sequence(
            alarm_type=violation_type,
            beep_frequency=1400,
            duration_sec=2
        )

    def _start_alarm_sequence(self, alarm_type, beep_frequency=1000, duration_sec=3):
        """
        Start alarm in a separate thread so it doesn't block the main loop.
        
        Args:
            alarm_type: Type of alarm ("drowsiness", "violation", etc.)
            beep_frequency: Frequency for system beep
            duration_sec: How long to alarm for
        """
        if self.alarm_thread and self.alarm_thread.is_alive():
            return
        
        self.stop_alarm = False
        self.alarm_active = True
        
        def alarm_loop():
            start_time = time.time()
            beep_interval = 0.3  # Beep every 300ms
            last_beep = 0
            
            while not self.stop_alarm and (time.time() - start_time) < duration_sec:
                current_time = time.time() - start_time
                
                # Play beep every beep_interval seconds
                if current_time - last_beep >= beep_interval:
                    self.play_beep(200, beep_frequency)
                    last_beep = current_time
                
                # Try to play audio file on first iteration
                if current_time < 0.1:
                    self.play_audio_file(repeat=int(duration_sec / 2) + 1)
                
                time.sleep(0.05)
            
            # Stop audio playback
            if PYGAME_AVAILABLE:
                try:
                    pygame.mixer.music.stop()
                except:
                    pass
            
            self.alarm_active = False
            print(f"✓ {alarm_type.upper()} alarm stopped")
        
        self.alarm_thread = threading.Thread(target=alarm_loop, daemon=True)
        self.alarm_thread.start()

    def stop(self):
        """Stop any active alarm."""
        self.stop_alarm = True
        if PYGAME_AVAILABLE and self.enable_audio:
            try:
                pygame.mixer.music.stop()
            except:
                pass


# Global alarm handler instance
_alarm_handler = None


def get_alarm_handler(enable_audio=True, enable_beep=True):
    """Get or create global alarm handler instance."""
    global _alarm_handler
    if _alarm_handler is None:
        _alarm_handler = AlarmHandler(enable_audio=enable_audio, enable_beep=enable_beep)
    return _alarm_handler


def trigger_drowsiness_alarm():
    """Convenience function to trigger drowsiness alarm."""
    handler = get_alarm_handler()
    handler.trigger_drowsiness_alarm()


def trigger_violation_alarm(violation_type="road_violation"):
    """Convenience function to trigger violation alarm."""
    handler = get_alarm_handler()
    handler.trigger_violation_alarm(violation_type)


def stop_alarm():
    """Convenience function to stop active alarm."""
    handler = get_alarm_handler()
    handler.stop()


if __name__ == "__main__":
    # Test the alarm system
    print("Testing Alarm System...")
    handler = get_alarm_handler(enable_audio=True, enable_beep=True)
    
    print("\n1. Testing drowsiness alarm...")
    handler.trigger_drowsiness_alarm()
    time.sleep(4)
    
    print("\n2. Testing violation alarm...")
    handler.trigger_violation_alarm("overspeeding")
    time.sleep(3)
    
    print("\nAlarm test complete!")
