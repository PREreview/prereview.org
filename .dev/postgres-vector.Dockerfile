FROM postgres:17

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    postgresql-$PG_MAJOR-pgvector \
  && rm -rf /var/lib/apt/lists/*
