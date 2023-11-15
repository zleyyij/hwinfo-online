#![allow(soft_unstable)]
// #![feature(test)]
use encoding::{all::ISO_8859_1, Encoding};
use lexer::lexer::lex_csv;
use parser::parser::deserialize_csv;
use std::borrow::Cow;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
mod lexer;
mod parser;

// the same function as parse_csv, but with some wasm glue code around it
#[wasm_bindgen(js_name = parse_csv)]
pub fn parse_csv_wasm(raw_csv: &[u8]) -> JsValue {
    let parsed_csv = parse_csv(raw_csv);
    return serde_wasm_bindgen::to_value(&parsed_csv).unwrap();
}

fn parse_csv(raw_csv: &[u8]) -> HashMap<String, Vec<f64>> {
    // translate the csv from ISO-8859-1 to a UTF 8 strings
    let transcoded_csv =
        transcode_csv(raw_csv).expect("Provided input is not valid ISO-8559-1 encoding");
    let lexed_csv: Vec<Vec<&str>> = lex_csv(&transcoded_csv).unwrap();
    let parsed_csv: HashMap<String, Vec<f64>> = deserialize_csv(lexed_csv);
    return parsed_csv;
}

/// Take a buffer of ISO 8559-1 encoded bytes, and transcode them to a standard rust String.
/// Panics if the provided input is invalid
#[inline]
fn transcode_csv(iso_8859_1_csv: &[u8]) -> std::result::Result<String, Cow<'_, str>> {
    // convert the input to an actual encoding
    let decoded_file = ISO_8859_1.decode(iso_8859_1_csv, encoding::DecoderTrap::Strict)?;
    Ok(decoded_file)
}

#[cfg(test)]
mod tests {
    // extern crate test;
    use super::parse_csv;
    use std::cell::RefCell;
    use std::collections::HashMap;
    use std::fs::File;
    use std::io::Read;

    // ISO-8859-1 encoding is really close to UTF-8, so more general characters are fine
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
        // go through, concatecate all of the rows
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

        (horizontally_merged_spreadsheet.join("\n") + "\n", map_equivalent)
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
        let mut file_handle = File::open("C:\\Users\\James Boehme\\Downloads\\stress.CSV").unwrap();
        let mut file_vec = Vec::new();
        file_handle.read_to_end(&mut file_vec).unwrap();
        parse_csv(&file_vec);
    }
}
