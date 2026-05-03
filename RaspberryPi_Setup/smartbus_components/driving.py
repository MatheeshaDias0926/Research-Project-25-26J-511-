"""DrivingTimeTracker — tracks driving/resting periods and limits."""
import time
import os
import json
import logging

log = logging.getLogger("SmartBus")


class DrivingTimeTracker:
	STATE_DRIVING = "driving"
	STATE_RESTING = "resting"

	def __init__(self, rest_timeout=60, max_continuous_minutes=360,
				 max_daily_minutes=480, required_rest_minutes=360,
				 cooldown_minutes=0, state_path=None):
		self.rest_timeout = rest_timeout
		self.max_continuous_minutes = max_continuous_minutes
		self.max_daily_minutes = max_daily_minutes
		self.required_rest_minutes = required_rest_minutes
		self.cooldown_minutes = cooldown_minutes

		self.state = self.STATE_RESTING
		self._last_face_time = 0.0
		self._rest_start = time.time()
		base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
		self._state_path = state_path or os.path.join(base, "driving_state.json")

		self._periods: list[list] = []
		self._continuous_limit_alerted = False
		self._daily_limit_alerted = False
		self._cooldown_alerted = False
		self._last_status_report = 0

		self._server_continuous_minutes = 0
		self._server_daily_minutes = 0

		self._load_state()

	def _load_state(self):
		if not os.path.exists(self._state_path):
			return
		try:
			with open(self._state_path, "r") as f:
				data = json.load(f)
			self.state = data.get("state", self.STATE_RESTING)
			self._last_face_time = data.get("last_face_time", 0)
			self._rest_start = data.get("rest_start", time.time())
			self._periods = data.get("periods", [])
			cutoff = time.time() - 48 * 3600
			self._periods = [p for p in self._periods if p[0] >= cutoff]
			log.info(f"[DRIVING] Loaded state from disk: {self.state}, {len(self._periods)} driving periods")
		except Exception as e:
			log.warning(f"[DRIVING] Failed to load state: {e}")

	def _save_state(self):
		data = {
			"state": self.state,
			"last_face_time": self._last_face_time,
			"rest_start": self._rest_start,
			"periods": self._periods,
			"saved_at": time.time(),
		}
		try:
			with open(self._state_path, "w") as f:
				json.dump(data, f)
		except Exception as e:
			log.error(f"[DRIVING] Failed to save state: {e}")

	def apply_server_history(self, server_data: dict):
		if not server_data:
			return
		self._server_continuous_minutes = server_data.get("continuousDrivingMinutes", 0)
		self._server_daily_minutes = server_data.get("totalDailyDrivingMinutes", 0)

	def apply_driver_rules(self, rules: dict):
		if not rules:
			return
		if "maxContinuousDrivingMinutes" in rules:
			self.max_continuous_minutes = rules["maxContinuousDrivingMinutes"]
		if "maxDailyDrivingMinutes" in rules:
			self.max_daily_minutes = rules["maxDailyDrivingMinutes"]
		if "requiredRestMinutes" in rules:
			self.required_rest_minutes = rules["requiredRestMinutes"]
		if "cooldownMinutes" in rules:
			self.cooldown_minutes = rules["cooldownMinutes"]
		log.info(f"[DRIVING] Applied driver rules: max_cont={self.max_continuous_minutes}m, max_daily={self.max_daily_minutes}m, rest={self.required_rest_minutes}m, cooldown={self.cooldown_minutes}m")

	def _current_driving_start(self) -> float | None:
		if self._periods and self._periods[-1][1] is None:
			return self._periods[-1][0]
		return None

	def _continuous_driving_seconds(self, now: float) -> float:
		if not self._periods:
			return 0
		required_rest_sec = self.required_rest_minutes * 60
		total = 0
		i = len(self._periods) - 1
		while i >= 0:
			start = self._periods[i][0]
			end = self._periods[i][1] if self._periods[i][1] is not None else now
			total += end - start
			if i > 0:
				prev_end = self._periods[i - 1][1]
				if prev_end is None:
					break
				gap = start - prev_end
				if gap >= required_rest_sec:
					break
			i -= 1
		return total

	def _daily_driving_seconds(self, now: float) -> float:
		midnight = time.mktime(time.strptime(time.strftime("%Y-%m-%d"), "%Y-%m-%d"))
		total = 0
		for start, end in self._periods:
			effective_start = max(start, midnight)
			effective_end = end if end is not None else now
			if effective_end > midnight:
				total += max(0, effective_end - effective_start)
		return total

	def _last_rest_duration(self, now: float) -> float:
		if self.state == self.STATE_RESTING:
			return now - self._rest_start
		if len(self._periods) >= 2:
			current_start = self._periods[-1][0]
			prev_end = self._periods[-2][1]
			if prev_end is not None:
				return current_start - prev_end
		return 0

	def update(self, face_detected: bool, now: float = None):
		if now is None:
			now = time.time()
		warnings = []
		if face_detected:
			self._last_face_time = now
			if self.state == self.STATE_RESTING:
				rest_duration = now - self._rest_start if self._rest_start else 0
				required_rest_sec = self.required_rest_minutes * 60
				if rest_duration >= required_rest_sec:
					self._continuous_limit_alerted = False
					self._cooldown_alerted = False
					log.info(f"[DRIVING] Valid rest completed ({rest_duration / 60:.0f}m >= {self.required_rest_minutes}m) — starting fresh period")
				else:
					if self._periods:
						log.info(f"[DRIVING] Short break ({rest_duration / 60:.1f}m < {self.required_rest_minutes}m) — resuming driving chain")
				self._periods.append([now, None])
				self.state = self.STATE_DRIVING
				self._rest_start = None
				self._save_state()
				log.info("[DRIVING] State → DRIVING")
		else:
			if self.state == self.STATE_DRIVING:
				elapsed_no_face = now - self._last_face_time
				if elapsed_no_face >= self.rest_timeout:
					if self._periods and self._periods[-1][1] is None:
						self._periods[-1][1] = self._last_face_time
					self.state = self.STATE_RESTING
					self._rest_start = now
					self._save_state()
					log.info(f"[DRIVING] State → RESTING (no face for {elapsed_no_face:.0f}s)")

		if self.state == self.STATE_DRIVING:
			local_continuous_sec = self._continuous_driving_seconds(now)
			local_continuous_min = local_continuous_sec / 60
			effective_continuous = max(local_continuous_min, self._server_continuous_minutes)
			local_daily_sec = self._daily_driving_seconds(now)
			local_daily_min = local_daily_sec / 60
			effective_daily = max(local_daily_min, self._server_daily_minutes)

			if self.max_continuous_minutes > 0 and effective_continuous >= self.max_continuous_minutes:
				if not self._continuous_limit_alerted:
					self._continuous_limit_alerted = True
					warnings.append(f"Continuous driving limit reached ({self.max_continuous_minutes} min, actual: {effective_continuous:.0f} min)")
					log.warning(f"[DRIVING] LIMIT: Continuous {effective_continuous:.0f}m >= {self.max_continuous_minutes}m")

			if self.max_daily_minutes > 0 and effective_daily >= self.max_daily_minutes:
				if not self._daily_limit_alerted:
					self._daily_limit_alerted = True
					warnings.append(f"Daily driving limit reached ({self.max_daily_minutes} min, actual: {effective_daily:.0f} min)")
					log.warning(f"[DRIVING] LIMIT: Daily {effective_daily:.0f}m >= {self.max_daily_minutes}m")

			if self.cooldown_minutes > 0:
				last_rest_min = self._last_rest_duration(now) / 60
				if (self._continuous_limit_alerted and
						last_rest_min < self.cooldown_minutes and
						not self._cooldown_alerted):
					self._cooldown_alerted = True
					warnings.append(f"Cooldown not met — need {self.cooldown_minutes}m rest, only had {last_rest_min:.0f}m")

		if int(now) % 30 == 0:
			self._save_state()

		return warnings

	@property
	def continuous_driving_minutes(self) -> float:
		now = time.time()
		local = self._continuous_driving_seconds(now) / 60
		return max(local, self._server_continuous_minutes)

	@property
	def total_daily_driving_minutes(self) -> float:
		now = time.time()
		local = self._daily_driving_seconds(now) / 60
		return max(local, self._server_daily_minutes)

	@property
	def current_rest_minutes(self) -> float:
		if self.state != self.STATE_RESTING or not self._rest_start:
			return 0
		return (time.time() - self._rest_start) / 60

