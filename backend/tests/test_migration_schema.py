from pathlib import Path


def test_user_topic_performance_has_quiz_count():
    """Init migration must include quiz_count column definition."""
    migration_file = Path("alembic/versions/d5d65b3a5669_init_models.py")
    content = migration_file.read_text()
    assert 'sa.Column("quiz_count"' in content, "quiz_count column missing in init migration"
