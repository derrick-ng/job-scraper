export function getDate() {
  const newDate = new Date();
  const day = newDate.getDate() + 1;
  const month = newDate.getMonth();
  const year = newDate.getFullYear();

  const date = `${month}/${day}/${year}`;
  return date;
}
