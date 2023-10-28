https://github.com/rust-bakery/nom/blob/main/doc/making_a_new_parser_from_scratch.md

Nom is a zero copy parsing library.

Storing all parsing code in a separate module is encouraged

## Parsing functions
Nom parsers are defined as functions that return the `nom::IResult` type. This type has a required `input` type, a required `output` type, and an optional `error` type. It returns `Ok(input, output)` if the structure was parsed successfully, and `Err<E>` if parsing fails. 

## Combinators
Small functions with a very specific purpose are written, then stacked to create a more complete parser.

An example combinator that gathers every char between parentheses might look like this:

```rust
use nom::{
  IResult,
  sequence::delimited,
  // see the "streaming/complete" paragraph lower for an explanation of these submodules
  character::complete::char,
  bytes::complete::is_not
};

fn parens(input: &str) -> IResult<&str, &str> {
  // the delimited function combines multiple parsers, discarding the result of the first parser,
  // in this case `(`. It collects everything from the second parser, in this case any character that is not `)`. It then discards the result of the first parser.
  delimited(char('('), is_not(")"), char(')'))(input)
}
```