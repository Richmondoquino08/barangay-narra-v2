const { v4: uuidv4 } = require('uuid');

function generateControlNumber(type) {
  const prefix = type.slice(0, 3).toUpperCase();
  const unique = uuidv4().split('-')[0].toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}-${unique}`;
}

module.exports = { generateControlNumber };
