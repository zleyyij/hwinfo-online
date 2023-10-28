pub mod parser {
    use std::collections::HashMap;

    /// Given a list of lexed csv records from a hwinfo csv, convert values to the appropriate type
    pub fn deserialize_csv(csv: Vec<Vec<&str>>) -> HashMap<String, Vec<f64>> {
        let mut deserialized_csv: HashMap<String, Vec<f64>> = HashMap::with_capacity(512);
        let columnar_csv = rows_to_columns(csv);
        for mut column in columnar_csv {
            remove_column_footer(&mut column);
            deserialize_column(&mut deserialized_csv, column);
        }
        deserialized_csv
    }

    /// given a mutable reference to a hashmap and a vec of strings,
    /// treat that vec like the column of a hwinfo CSV and parse the values into
    /// floats, and insert the appropriate header, mutating the provided hashmap
    fn deserialize_column(map: &mut HashMap<String, Vec<f64>>, column: Vec<&str>) {
        // as the column is processed, it's streamed into this vec
        let mut processed_column: Vec<f64> = Vec::with_capacity(column.len() - 1);
        // just skip the date *entirely*
        if column[0] == "Date" {
            return;
        }
        // the date is skipped because it's not really valuble overhead
        for entry in &column[1..column.len()] {
            // handle special cases
            match *entry {
                // yes and no are translated to 1.0 and 0.0 respectively so that
                // they can be graphed
                "Yes" => {
                    processed_column.push(1.0);
                    continue;
                }
                "No" => {
                    processed_column.push(0.0);
                    continue;
                }
                _ if column[0] == "Time" => {
                    processed_column.push(time_to_secs(&entry).unwrap() as f64);
                    continue;
                }
                _ => {}
            }
            // handle number parsing
            match entry.parse::<f64>() {
                Ok(parsed_val) => {
                    processed_column.push(parsed_val);
                }
                Err(_) => {
                    #[cfg(wasm)]
                    {
                        console_log!("Failed to parse entry {entry} into a float, skipping");
                    }
                    #[cfg(not(wasm))]
                    {
                        println!("Failed to parse entry {entry} into a float, skipping");
                    }
                }
            }
        }

        // take the parsed column, and add it to the hashmap, doing duplicate prevention if necessary
        let mut insertion_key: String = column[0].to_string();
        // because hashmaps can't have two duplicate keys, append (n) to keys that already exit in the map
        while map.contains_key(insertion_key.as_str()) {
            // select the last 3 chars, and strip parentheses and whitespace, before parsing it to a number
            let last_chars = &insertion_key.chars().collect::<Vec<char>>()
                [insertion_key.len() - 3..]
                .iter()
                .collect::<String>();
            // sometimes there's more than one duplicate
            if last_chars.ends_with(")") {
                // the "number" found at the end, as a string
                let duplicate_index = last_chars
                    .chars()
                    .filter(|c| *c != '(' && *c != ')')
                    .collect::<String>();
                // parse the number into a string
                match duplicate_index.trim().parse::<u8>() {
                    Ok(val) => {
                        // 3 for " (" and ")"
                        let size_of_suffix = duplicate_index.trim().len() + 3;
                        let new_suffix = &format!(" ({})", val + 1);
                        insertion_key.drain(insertion_key.len() - size_of_suffix..);
                        insertion_key += new_suffix;
                    }
                    Err(_) => {
                        // failover mode, this point should never be reached
                        insertion_key += "^";
                    }
                }
            } else {
                insertion_key += " (1)";
            }
        }
        map.insert(insertion_key, processed_column);
    }

    // /// Check to see if the provided input resembles the format used by hwinfo for time
    // fn is_time(test_input: &str) -> bool {
    //     // this makes some fairly bold assumptions about the format of the `Time` key,
    //     // and the validity of input data
    //     let mut colon_count: u8 = 0;
    //     for byte in test_input.bytes() {
    //         if byte == b':' {
    //             colon_count += 1;
    //         }
    //     }
    //     if colon_count == 2 && test_input.len() <= 12 {
    //         return true;
    //     }
    //     return false;
    // }

    fn time_to_secs(time: &str) -> Result<i32, Box<dyn std::error::Error>> {
        let mut time_as_secs: i32 = 0;
        let split_time: Vec<&str> = time.split(":").collect();
        let hours = str::parse::<u8>(split_time[0])?;
        let minutes = str::parse::<u8>(split_time[1])?;
        let seconds = str::parse::<f64>(split_time[2])? as u8;
        time_as_secs += hours as i32 * 3600;
        time_as_secs += minutes as i32 * 60;
        time_as_secs += seconds as i32;
        Ok(time_as_secs)
    }

    /// given a set of nested vecs, where the input is a list of rows
    /// in a hwinfo csv, translate to another vec of vectors, where
    /// the output is a list of columns
    fn rows_to_columns(input: Vec<Vec<&str>>) -> Vec<Vec<&str>> {
        let mut columnar_input: Vec<Vec<&str>> =
            vec![Vec::with_capacity(input.len()); input[0].len()];
        for row in input {
            for (index, item) in row.iter().enumerate() {
                columnar_input[index].push(*item);
            }
        }
        return columnar_input;
    }

    /// the .csv files generated by hwinfo have a duplicate key at the bottom of the column, and sometimes have random column names afterwords,
    /// I don't know how they're connected. This function removes the duplicate key, and any cruft after the second header
    fn remove_column_footer(column: &mut Vec<&str>) {
        let header = column[0];
        // the length is just a default value, this should never become an issue
        let mut footer_index: usize = column.len();
        // how many of the last elements should be included in the check
        let iter_section_size = 3;
        // the index is based off of the range, not the whole vec
        // to get the index relative to the entire vec, add the length - `iter_section_size`
        for (index, item) in column[column.len() - iter_section_size..]
            .iter()
            .enumerate()
        {
            let absolute_index = column.len() - iter_section_size + index;
            // if any matches are found, anything after the match is deemed garbage
            if *item == header {
                footer_index = absolute_index;
                break;
            }
        }
        column.drain(footer_index..);
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn basic_column_footer_removed() {
            let mut mock_column = vec!["a", "b", "c", "d", "a"];
            remove_column_footer(&mut mock_column);
            assert_eq!(mock_column, vec!["a", "b", "c", "d"]);
        }

        #[test]
        fn column_footer_removed_with_excess() {
            // sometimes there's an extra key after the footer,
            // for no clear reason as far as i can ascertain
            let mut mock_column = vec!["a", "b", "c", "d", "a", "z"];
            remove_column_footer(&mut mock_column);
            assert_eq!(mock_column, vec!["a", "b", "c", "d"]);
        }

        #[test]
        fn basic_rows_converted_to_columns() {
            let rows = vec![vec!["a", "a"], vec!["b", "b"]];
            let as_columns = vec![vec!["a", "b"], vec!["a", "b"]];
            assert_eq!(rows_to_columns(rows), as_columns);
        }

        #[test]
        fn basic_time_conversion() {
            // 1 * 3600 + 1 * 60 + 1
            assert_eq!(time_to_secs("1:1:1.0").unwrap(), 3661);
        }

        #[test]
        fn basic_deserialize_column() {
            let mut mock_map: HashMap<String, Vec<f64>> = HashMap::new();
            let mock_column = vec!["header", "1.0", "2.0", "3.0"];
            deserialize_column(&mut mock_map, mock_column);
            assert_eq!(mock_map["header"], vec![1.0, 2.0, 3.0]);
        }

        #[test]
        fn yes_no_deserialize_column() {
            let mut mock_map: HashMap<String, Vec<f64>> = HashMap::new();
            let mock_column = vec!["header", "Yes", "No", "Yes"];
            deserialize_column(&mut mock_map, mock_column);
            assert_eq!(mock_map["header"], vec![1.0, 0.0, 1.0]);
        }

        #[test]
        fn deserialize_column_ignore_date() {
            // make sure map is empty after doing the thing
            let mut mock_map: HashMap<String, Vec<f64>> = HashMap::new();
            let mock_column = vec!["Date", "0.0", "0.0", "0.0"];
            deserialize_column(&mut mock_map, mock_column);
            assert_eq!(mock_map.len(), 0);
        }

        #[test]
        fn basic_deserialize_csv() {
            let mock_csv = vec![
                vec!["a", "b", "c"],
                vec!["0.0", "1.0", "2.0"],
                vec!["0.0", "1.0", "2.0"],
                vec!["a", "b", "c"],
            ];
            let mut expected_output: HashMap<String, Vec<f64>> = HashMap::new();
            expected_output.insert("a".to_owned(), vec![0.0, 0.0]);
            expected_output.insert("b".to_owned(), vec![1.0, 1.0]);
            expected_output.insert("c".to_owned(), vec![2.0, 2.0]);

            assert_eq!(deserialize_csv(mock_csv), expected_output);
        }
    }
}
