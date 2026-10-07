function notFound(req, res) {
  res.status(404).json({ message: 'Endpoint not found.' });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'A record with the same unique value already exists.' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ message: 'The operation conflicts with related records.' });
  }
  return res.status(error.status || 500).json({ message: error.publicMessage || 'An unexpected server error occurred.' });
}

module.exports = { notFound, errorHandler };
