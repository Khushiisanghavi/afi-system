import os
import pytest

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


@pytest.fixture(scope="session")
def fixture_video():
    path = os.path.join(FIXTURES_DIR, "cooking.mp4")
    if not os.path.exists(path):
        pytest.skip("Test fixture cooking.mp4 not found")
    return path
