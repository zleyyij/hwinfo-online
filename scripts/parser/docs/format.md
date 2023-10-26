# Definitions
All definitions are derived from the [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180) specification of the `.csv` file format, although there is no formal specification. 

## Records
A record can be thought of similar to a row, and each record is located on a separate line, with records being delimited by a newline. The standard dictates that newlines be `CRLF`, but hwinfo appears to use `LF` endings.

The last record in a file may or may not end with a line ending.

## Fields
Within each record, there may be one or more fields, separated by a comma. Each record should have the same number of fields. 

Each field may be enclosed with double quotes. If a field is enclosed with double quotes, than more double quotes within the field, the record delimiter (usually commas), and newlines may exist within a field. If double quotes are not present, the field must not contain the record delimiter character, or double quotes. 

### Headers
This line is not required, but it should have the same number of fields as records in the rest of the file. Each field should correspond to the same "nth" field for other records.

# HWInfo CSV specific info
## Character encoding
The file appears to be encoded in ISO-8559-1 encoding.
## Delimiters
Log files appear to use `LF` line endings to delineate between different records.

Commas act as field separators, and there is a hanging comma, right before the line ending.

## Fields
Fields that appear to have spaces or commas use double quotes

Boolean values appear to be stored as `Yes`, or `No`.

