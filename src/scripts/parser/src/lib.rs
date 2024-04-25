#![allow(soft_unstable)]
mod lexer;
mod parser;

use encoding::all::UTF_8;
use encoding::Encoding;
use lexer::lexer::lex_csv;
use parser::parser::deserialize_csv;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

// the same function as parse_csv, but with some wasm glue code around it
#[wasm_bindgen(js_name = parse_csv)]
pub fn parse_csv_wasm(raw_csv: &[u8]) -> JsValue {
    let parsed_csv = parse_csv(raw_csv);
    return serde_wasm_bindgen::to_value(&parsed_csv).unwrap();
}

fn parse_csv(raw_csv: &[u8]) -> HashMap<String, Vec<f64>> {
    // translate the csv from ISO-8859-1 to a UTF 8 strings
    let transcoded_csv = transcode_csv(raw_csv);
    let lexed_csv: Vec<Vec<&str>> = lex_csv(&transcoded_csv).unwrap();
    let parsed_csv: HashMap<String, Vec<f64>> = deserialize_csv(lexed_csv);
    return parsed_csv;
}

/// Ever since HWINFO 8.0 (<https://www.hwinfo.com/version-history/>), logs are encoded with
/// unicode, switching from ISO-8559-1 encoding.
/// Take a buffer of presumably UTF-8 encoded bytes, and transcode them to a standard rust String.
#[inline]
fn transcode_csv(unencoded_csv: &[u8]) -> String {
    // see if it's valid utf 8, for some reason the encoding crate handles this better than the standard library's implementation
    match UTF_8.decode(unencoded_csv, encoding::DecoderTrap::Strict) {
        Ok(s) => return s,
        Err(e) => {
            console_log!("warning: The provided file is not valid UTF 8: interpreting with UTF-8 failed with error {e:?}, falling back to UTF-8 with replacement.");
            // match ISO_8859_1.decode(iso_8859_1_csv, encoding::DecoderTrap::Strict) {
            //     Ok(s) => return s,
            //     Err(e) => {
            //         console_log!("Unable to interpret as ISO-8559-1, falling back to UTF-8 with replacement, may god help us all (failed with {e:?}");
            //         return UTF_8.decode(iso_8859_1_csv, encoding::DecoderTrap::Replace).unwrap();
            //     }
            // this is fine because Replace should be infallible(within reason)
            return UTF_8
                .decode(unencoded_csv, encoding::DecoderTrap::Replace)
                .unwrap();
        }
    }
    // }
    // if let Err(e) = UTF_8.decode(iso_8859_1_csv, encoding::DecoderTrap::Strict) {
    //     console_log!("Warning: input file contains invalid UTF-8: {e:?}");
    // }
    // UTF_8.decode(iso_8859_1_csv, encoding::DecoderTrap::Replace)
    // convert the input to an actual encoding
    // let decoded_file = ISO_8859_1.decode(iso_8859_1_csv, encoding::DecoderTrap::Strict)?;
    // Ok(decoded_file)
}

#[cfg(test)]
mod tests {
    // extern crate test;
    use super::parse_csv;
    use std::cell::RefCell;
    use std::collections::HashMap;
    use std::fs::File;
    use std::io::Read;

    fn gen_mock_csv(num_rows: usize, num_columns: usize) -> (String, HashMap<String, Vec<f64>>) {
        // todo!()
        let mock_spreadsheet: Vec<Vec<RefCell<String>>> =
            vec![vec![RefCell::new(String::new()); num_columns]; num_rows + 2];
        // what the finished "parsed product" should look like
        // TODO: make this actually work
        let mut map_equivalent: HashMap<String, Vec<f64>> = HashMap::new();
        // populate the "spreadsheet" with fake data, before the serialization process
        // iterate over each row,
        // | | | | | | | | | |
        // columns are tall and run from top to bottom
        // incrementally, columns run side to side
        // +2 because the header and footer each account for one row
        for row_index in 0..num_rows + 2 {
            // rows are wide and run from side to side
            // incrementally, rows run top to bottom
            // _
            // _
            // _
            for column_index in 0..num_columns {
                let cell = &mock_spreadsheet[row_index][column_index];
                // the reference is never *read from*, so it's marked as unused, even if it's written to
                let mut cell_ref = cell.borrow_mut();
                // the first row, and the last row are the same because hwinfo is weird
                if row_index == 0 || row_index == num_rows + 2 - 1 {
                    let series_label = format!("column {}", column_index);
                    *cell_ref = series_label.clone();
                    // this could probably be refactored to be cleaner
                    if row_index == 0 {
                        map_equivalent.insert(series_label, Vec::new());
                    }
                } else {
                    *cell_ref = format!("{}.{}", column_index, row_index);
                }
            }
        }
        // go through, concatenate all of the rows
        let mut horizontally_merged_spreadsheet: Vec<String> = Vec::with_capacity(num_columns);
        for unmerged_row in mock_spreadsheet {
            // all of the entries are merged into this string
            let mut output_string: String = String::new();
            for entry in unmerged_row {
                let entry_handle = entry.borrow();
                output_string += &entry_handle;
                output_string += ",";
            }
            horizontally_merged_spreadsheet.push(output_string);
        }

        (
            horizontally_merged_spreadsheet.join("\n") + "\n",
            map_equivalent,
        )
    }

    #[test]
    fn basic_parse_csv() {
        // generate a mock csv
        let mock_csv = gen_mock_csv(9, 5);
        // let mut file_handle = File::open("/").unwrap();
        // let mut file_vec = Vec::new();
        // file_handle.read_to_end(&mut file_vec).unwrap();
        parse_csv(&mock_csv.0.bytes().collect::<Vec<u8>>());
    }

    #[test]
    fn parse_csv_from_file() {
        // TODO
        // let mut file_handle = File::open("/Users/arc/Downloads/HWINFO.CSV").unwrap();
        // let mut file_vec = Vec::new();
        // file_handle.read_to_end(&mut file_vec).unwrap();
        // parse_csv(&file_vec);
    }
}
