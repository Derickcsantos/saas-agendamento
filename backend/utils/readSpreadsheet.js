import xlsx from "xlsx";

export function readSpreadsheetBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(sheet);

  return data
    .map((row) => row.telefone || row.Telefone || row.phone)
    .filter(Boolean)
    .map((phone) => phone.toString().replace(/\D/g, ""));
}
