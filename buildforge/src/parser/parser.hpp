#pragma once

#include "lexer.hpp"
#include "ast.hpp"
#include "../common/result.hpp"
#include <memory>
#include <vector>

namespace buildforge {

class Parser {
public:
    explicit Parser(std::vector<Token> tokens);
    
    Result<std::vector<RuleCall>> parse();
    const std::vector<Diagnostic>& diagnostics() const { return diagnostics_; }

private:
    const Token& peek() const;
    const Token& previous() const;
    Token advance();
    bool check(TokenType type) const;
    bool match(TokenType type);
    bool consume(TokenType type, const std::string& error_message);

    Result<RuleCall> rule_call();
    Result<NamedArg> named_arg();
    Result<Expr> expr();
    Result<ListExpr> list_expr();

    bool is_label(const std::string& str) const;

    std::vector<Token> tokens_;
    std::vector<Diagnostic> diagnostics_;
    size_t cursor_{0};
};

} // namespace buildforge
