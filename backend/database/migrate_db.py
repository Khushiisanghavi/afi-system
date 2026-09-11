"""
Safe migration script.
- Adds new columns to existing tables (skips if already present).
- Creates new tables (creator_analyses, wellbeing_profiles, wellbeing_checkins).
Run: python -m backend.database.migrate_db
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "afi_results.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def table_exists(cursor, table: str) -> bool:
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    )
    return cursor.fetchone() is not None


def run():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # ── analysis_results: add user_id and raw feature columns ──
    new_analysis_cols = [
        ("user_id", "TEXT"),
        ("audio_tempo", "REAL"),
        ("audio_rms", "REAL"),
        ("audio_spike_ratio", "REAL"),
        ("audio_zcr", "REAL"),
        ("text_words_per_second", "REAL"),
        ("text_area_ratio", "REAL"),
        ("text_change_rate", "REAL"),
    ]
    if table_exists(c, "analysis_results"):
        for col, col_type in new_analysis_cols:
            if not column_exists(c, "analysis_results", col):
                c.execute(f"ALTER TABLE analysis_results ADD COLUMN {col} {col_type}")
                print(f"  + analysis_results.{col}")
            else:
                print(f"  = analysis_results.{col} already exists")

    # ── users table ──
    if not table_exists(c, "users"):
        c.execute("""
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  + created table: users")

    # ── creator_analyses ──
    if not table_exists(c, "creator_analyses"):
        c.execute("""
            CREATE TABLE creator_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id INTEGER,
                user_id TEXT NOT NULL,
                video_name TEXT,
                captivation_score REAL,
                captivation_category TEXT,
                hook_strength REAL,
                pace_variance REAL,
                audio_energy_arc TEXT,
                text_density_fit REAL,
                trend_match_score REAL,
                closest_trend_category TEXT,
                recommendations_json TEXT,
                predicted_score_after REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  + created table: creator_analyses")
    else:
        print("  = creator_analyses already exists")

    # ── wellbeing_profiles ──
    if not table_exists(c, "wellbeing_profiles"):
        c.execute("""
            CREATE TABLE wellbeing_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL UNIQUE,
                profile_tier TEXT,
                overstim_ratio REAL,
                weekly_high_afi_minutes REAL,
                attention_fragmentation_index REAL,
                binge_signals INTEGER DEFAULT 0,
                content_mix_json TEXT,
                plan_json TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  + created table: wellbeing_profiles")
    else:
        print("  = wellbeing_profiles already exists")

    # ── wellbeing_checkins ──
    if not table_exists(c, "wellbeing_checkins"):
        c.execute("""
            CREATE TABLE wellbeing_checkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                focus_quality INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  + created table: wellbeing_checkins")
    else:
        print("  = wellbeing_checkins already exists")

    conn.commit()
    conn.close()
    print("\nMigration complete.")


if __name__ == "__main__":
    run()
