import fs from "fs";
import { PDFDocument } from "pdf-lib";

const bytes = fs.readFileSync("templates/TLA_TEMPLATE_BLANK.pdf");
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();
const fields = form.getFields();
console.log("Field count:", fields.length);
for (const f of fields) {
  console.log(f.constructor.name + "|" + f.getName());
}
