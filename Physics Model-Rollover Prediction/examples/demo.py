"""
Small demo utilities for quick local runs. Kept separate to avoid circular imports when running modules directly.
"""

def run_demo():
    import main
    main.demo_scenario()


if __name__ == "__main__":
    run_demo()
