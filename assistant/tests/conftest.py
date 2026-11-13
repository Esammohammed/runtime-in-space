import os

# Force the mock model regardless of a local .env -- tests must never depend
# on (or burn quota from) a real LLM provider a developer has configured.
os.environ["LLM_PROVIDER"] = "mock"
