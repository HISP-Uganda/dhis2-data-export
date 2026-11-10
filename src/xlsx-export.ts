import { saveAs } from "file-saver";
import { utils, write } from "xlsx";

function s2ab(s: string) {
	const buf = new ArrayBuffer(s.length);
	const view = new Uint8Array(buf);
	for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
	return buf;
}

/** Writes rows to a single-sheet "Listing" workbook and prompts the browser to save it. */
export function saveRowsAsXlsx(rows: object[], fileName: string) {
	const wb = utils.book_new();
	wb.Props = {
		Title: "SheetJS Tutorial",
		Subject: "Test",
		Author: "Red Stapler",
		CreatedDate: new Date(),
	};
	wb.SheetNames.push("Listing");
	wb.Sheets["Listing"] = utils.json_to_sheet(rows);

	const wbout = write(wb, { bookType: "xlsx", type: "binary" });
	saveAs(
		new Blob([s2ab(wbout)], { type: "application/octet-stream" }),
		fileName,
	);
}
