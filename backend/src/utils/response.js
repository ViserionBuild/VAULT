function responseEnvelope(data, error, meta) {
  return {
    success: !error,
    data: data ?? null,
    error: error ?? null,
    meta: meta ?? null,
  }
}

module.exports = {
  responseEnvelope,
}
