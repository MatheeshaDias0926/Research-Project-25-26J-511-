"""Local alarm implementation.

This module contains a self-contained `LocalAlarm` class that manages
GPIO buzzer and audio playback (via pygame) if available. It is safe
to import on systems without GPIO or audio support.
"""
import os
import logging

log = logging.getLogger("SmartBus")

# Optional: GPIO for hardware buzzer
try:
	from gpiozero import Buzzer as GPIOBuzzer
	GPIO_AVAILABLE = True
except Exception:
	GPIO_AVAILABLE = False

# Optional: pygame for audio alarm
try:
	import pygame
	try:
		pygame.mixer.init()
	except Exception:
		pass
	PYGAME_AVAILABLE = True
except Exception:
	PYGAME_AVAILABLE = False


def _default_alarm_sound_path():
	# Default to parent folder's alarm.wav (RaspberryPi_Setup/alarm.wav)
	base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
	return os.path.join(base, "alarm.wav")


class LocalAlarm:
	"""Manages immediate driver alerts: GPIO buzzer + audio + console."""

	def __init__(self, gpio_pin=18, alarm_sound=None):
		self._buzzer = None
		self._alarm_sound = alarm_sound or _default_alarm_sound_path()
		self._active = False

		if GPIO_AVAILABLE:
			try:
				self._buzzer = GPIOBuzzer(gpio_pin)
				log.info(f"GPIO buzzer initialised on pin {gpio_pin}")
			except Exception as e:
				log.warning(f"GPIO buzzer init failed: {e}")

		if PYGAME_AVAILABLE and os.path.exists(self._alarm_sound):
			log.info(f"Audio alarm loaded: {self._alarm_sound}")

	def trigger(self, reason="DROWSINESS"):
		"""Activate alarm immediately."""
		if self._active:
			return
		self._active = True
		log.warning(f"*** LOCAL ALARM: {reason} ***")

		# GPIO buzzer
		if self._buzzer:
			try:
				self._buzzer.on()
			except Exception:
				pass

		# Audio alarm (non-blocking)
		if PYGAME_AVAILABLE and os.path.exists(self._alarm_sound):
			try:
				pygame.mixer.music.load(self._alarm_sound)
				pygame.mixer.music.play(-1)  # loop until stopped
			except Exception:
				pass

		# Fallback: terminal bell
		print("\a")

	def stop(self):
		"""Deactivate alarm."""
		if not self._active:
			return
		self._active = False
		if self._buzzer:
			try:
				self._buzzer.off()
			except Exception:
				pass
		if PYGAME_AVAILABLE:
			try:
				pygame.mixer.music.stop()
			except Exception:
				pass

	@property
	def is_active(self):
		return self._active

