#pragma once

#include "ast.hpp"
#include <string>
#include <vector>

namespace buildforge {

enum class TokenType {
    Ident,
    String,
    LPar,
    RPar,
    LBracket,
    RBracket,
    Equal,
    Comma,
    Eof,
    Unknown
};

struct Token {
    TokenType type;
    std::string lexeme;
    SourceLocation location;
};

class Lexer {
public:
    explicit Lexer(std::string source, std::string filepath);
    std::vector<Token> tokenize();

private:
    char peek() const;
    char get();
    void skip_whitespace_and_comments();
    Token lex_string();
    Token lex_ident();

    std::string source_;
    std::string filepath_;
    size_t cursor_{0};
    int line_{1};
    int col_{1};
};

} // namespace buildforge
