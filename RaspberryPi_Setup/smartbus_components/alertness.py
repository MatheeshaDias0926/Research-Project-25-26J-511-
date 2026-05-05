"""AlertnessTracker — rolling alertness score manager."""
import time
import logging

log = logging.getLogger("SmartBus")


class AlertnessTracker:
	"""Maintains a rolling alertness score (0-100)."""

	def __init__(self, initial=100, recovery_rate=0.5, drowsy_penalty=5, yawn_penalty=2):
		self.score = float(initial)
		self._recovery_rate = recovery_rate
		self._drowsy_penalty = drowsy_penalty
		self._yawn_penalty = yawn_penalty
		self._last_update = time.time()
		self._dirty = True  # Force first heartbeat to always include the score

	def update(self, is_drowsy: bool, is_yawning: bool):
		now = time.time()
		dt = now - self._last_update
		self._last_update = now

		prev = self.score
		if is_drowsy:
			self.score -= self._drowsy_penalty
		elif is_yawning:
			self.score -= self._yawn_penalty
		else:
			self.score += self._recovery_rate * dt

		self.score = max(0.0, min(100.0, self.score))
		if self.score != prev:
			self._dirty = True

	@property
	def level(self) -> str:
		if self.score >= 75:
			return "ALERT"
		elif self.score >= 40:
			return "TIRED"
		else:
			return "DANGER"

