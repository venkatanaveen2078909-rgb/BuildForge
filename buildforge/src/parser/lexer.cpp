#include "lexer.hpp"
#include <cctype>

namespace buildforge {

Lexer::Lexer(std::string source, std::string filepath)
    : source_(std::move(source)), filepath_(std::move(filepath)) {}

char Lexer::peek() const {
    if (cursor_ >= source_.length()) return '\0';
    return source_[cursor_];
}

char Lexer::get() {
    if (cursor_ >= source_.length()) return '\0';
    char c = source_[cursor_++];
    if (c == '\n') {
        line_++;
        col_ = 1;
    } else {
        col_++;
    }
    return c;
}

void Lexer::skip_whitespace_and_comments() {
    while (cursor_ < source_.length()) {
        char c = peek();
        if (std::isspace(c)) {
            get();
        } else if (c == '#') {
            // comment line
            while (cursor_ < source_.length() && peek() != '\n') {
                get();
            }
        } else {
            break;
        }
    }
}

Token Lexer::lex_string() {
    SourceLocation loc{filepath_, line_, col_};
    char quote = get(); // ' or "
    std::string value;
    while (cursor_ < source_.length() && peek() != quote) {
        if (peek() == '\\') {
            get(); // escape char
            if (cursor_ < source_.length()) {
                value += get();
            }
        } else {
            value += get();
        }
    }
    if (peek() == quote) {
        get(); // consume close quote
    }
    return Token{TokenType::String, value, loc};
}

Token Lexer::lex_ident() {
    SourceLocation loc{filepath_, line_, col_};
    std::string value;
    while (cursor_ < source_.length()) {
        char c = peek();
        if (std::isalnum(c) || c == '_') {
            value += get();
        } else {
            break;
        }
    }
    return Token{TokenType::Ident, value, loc};
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    while (true) {
        skip_whitespace_and_comments();
        char c = peek();
        if (c == '\0') {
            tokens.push_back(Token{TokenType::Eof, "", {filepath_, line_, col_}});
            break;
        }
        SourceLocation loc{filepath_, line_, col_};
        if (c == '(') {
            get();
            tokens.push_back(Token{TokenType::LPar, "(", loc});
        } else if (c == ')') {
            get();
            tokens.push_back(Token{TokenType::RPar, ")", loc});
        } else if (c == '[') {
            get();
            tokens.push_back(Token{TokenType::LBracket, "[", loc});
        } else if (c == ']') {
            get();
            tokens.push_back(Token{TokenType::RBracket, "]", loc});
        } else if (c == '=') {
            get();
            tokens.push_back(Token{TokenType::Equal, "=", loc});
        } else if (c == ',') {
            get();
            tokens.push_back(Token{TokenType::Comma, ",", loc});
        } else if (c == '"' || c == '\'') {
            tokens.push_back(lex_string());
        } else if (std::isalpha(c) || c == '_') {
            tokens.push_back(lex_ident());
        } else {
            get();
            tokens.push_back(Token{TokenType::Unknown, std::string(1, c), loc});
        }
    }
    return tokens;
}

} // namespace buildforge
