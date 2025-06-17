
function sanitize(value) {
  return typeof value === "string" ? value.trim() : value;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function checkMissingFields(data, requiredFields) {
  return requiredFields.filter((field) => !data[field]);
}

function formatDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

module.exports = {
  sanitize,
  today,
  checkMissingFields,
  formatDateDaysAgo,
};
