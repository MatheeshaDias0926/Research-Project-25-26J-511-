import math
import road_reader
import physics_engine


def test_cog_and_threshold_empty_bus():
    const = physics_engine.BusConstants()
    cog = physics_engine.compute_cog_height(0, 0, const)
    assert abs(cog - const.H_EMPTY) < 1e-6
    thresh = physics_engine.rollover_threshold_g(cog, const)
    assert thresh > 0


def test_overloaded_reduces_threshold():
    const = physics_engine.BusConstants()
    cog_empty = physics_engine.compute_cog_height(0, 0, const)
    cog_loaded = physics_engine.compute_cog_height(0, 75, const)
    thresh_empty = physics_engine.rollover_threshold_g(cog_empty, const)
    thresh_loaded = physics_engine.rollover_threshold_g(cog_loaded, const)
    assert cog_loaded > cog_empty
    assert thresh_loaded < thresh_empty


def test_radius_function():
    # Points forming an arc (~25m radius)
    p1 = (6.9270, 79.8610)
    p2 = (6.9269, 79.8611)
    p3 = (6.9267, 79.8611)
    r = road_reader.calculate_curvature_radius(p1, p2, p3)
    assert math.isfinite(r) and r > 0
    assert 10 < r < 100  # rough sanity check
