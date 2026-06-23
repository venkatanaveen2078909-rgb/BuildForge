#include "parser.hpp"
#include <algorithm>

namespace buildforge {

Parser::Parser(std::vector<Token> tokens) : tokens_(std::move(tokens)) {}

const Token& Parser::peek() const {
    if (cursor_ >= tokens_.size()) return tokens_.back();
    return tokens_[cursor_];
}

const Token& Parser::previous() const {
    if (cursor_ == 0) return tokens_[0];
    return tokens_[cursor_ - 1];
}

Token Parser::advance() {
    if (cursor_ < tokens_.size()) {
        cursor_++;
    }
    return previous();
}

bool Parser::check(TokenType type) const {
    return peek().type == type;
}

bool Parser::match(TokenType type) {
    if (check(type)) {
        advance();
        return true;
    }
    return false;
}

bool Parser::consume(TokenType type, const std::string& error_message) {
    if (check(type)) {
        advance();
        return true;
    }
    diagnostics_.push_back({
        Diagnostic::Severity::Error,
        error_message,
        peek().location,
        "Expected " + error_message
    });
    return false;
}

bool Parser::is_label(const std::string& str) const {
    // Label format: //pkg:target or :target
    if (str.starts_with("//") && str.find(':') != std::string::npos) return true;
    if (str.starts_with(':')) return true;
    return false;
}

Result<std::vector<RuleCall>> Parser::parse() {
    std::vector<RuleCall> rules;
    while (!check(TokenType::Eof)) {
        auto rule = rule_call();
        if (rule) {
            rules.push_back(*rule);
        } else {
            // synchronize to next statement
            while (!check(TokenType::Eof) && !check(TokenType::Ident)) {
                advance();
            }
        }
    }
    if (!diagnostics_.empty()) {
        bool has_error = std::ranges::any_of(diagnostics_, [](const auto& d) {
            return d.severity == Diagnostic::Severity::Error;
        });
        if (has_error) {
            return std::unexpected(Error{
                StatusCode::InvalidArgument,
                "Parsing failed with " + std::to_string(diagnostics_.size()) + " diagnostics",
                "Parser"
            });
        }
    }
    return rules;
}

Result<RuleCall> Parser::rule_call() {
    if (!check(TokenType::Ident)) {
        diagnostics_.push_back({
            Diagnostic::Severity::Error,
            "Expected rule name (e.g. cc_binary, cc_library)",
            peek().location,
            "Make sure your target begins with an identifier"
        });
        return std::unexpected(Error{StatusCode::InvalidArgument, "Expected rule indentifier", "Parser"});
    }
    Token rule_tok = advance();
    SourceLocation rule_loc = rule_tok.location;

    if (!consume(TokenType::LPar, "Expected '(' after rule type name")) {
        return std::unexpected(Error{StatusCode::InvalidArgument, "Expected (", "Parser"});
    }

    std::unordered_map<std::string, Expr> args;
    std::string name;

    while (!check(TokenType::RPar) && !check(TokenType::Eof)) {
        auto arg = named_arg();
        if (!arg) {
            return std::unexpected(arg.error());
        }
        args[arg->name] = arg->value;
        if (arg->name == "name") {
            if (auto* str = std::get_if<StringLiteral>(&arg->value)) {
                name = str->value;
            }
        }
        if (!match(TokenType::Comma)) {
            if (!check(TokenType::RPar)) {
                diagnostics_.push_back({
                    Diagnostic::Severity::Error,
                    "Expected ',' or ')' inside named arguments",
                    peek().location,
                    "Add commas to separate target attributes"
                });
                return std::unexpected(Error{StatusCode::InvalidArgument, "Expected ',' or ')'", "Parser"});
            }
        }
    }

    if (!consume(TokenType::RPar, "Expected ')' to close rule arguments")) {
        return std::unexpected(Error{StatusCode::InvalidArgument, "Expected )", "Parser"});
    }

    RuleCall call{rule_tok.lexeme, name, args, rule_loc};
    return call;
}

Result<NamedArg> Parser::named_arg() {
    if (!check(TokenType::Ident)) {
        diagnostics_.push_back({
            Diagnostic::Severity::Error,
            "Expected argument key identifier (e.g. name, srcs, deps)",
            peek().location,
            "Specify an attribute name"
        });
        return std::unexpected(Error{StatusCode::InvalidArgument, "Expected argument key identifier", "Parser"});
    }
    Token key_tok = advance();
    if (!consume(TokenType::Equal, "Expected '=' after attribute key")) {
        return std::unexpected(Error{StatusCode::InvalidArgument, "Expected =", "Parser"});
    }

    auto val_res = expr();
    if (!val_res) {
        return std::unexpected(val_res.error());
    }

    return NamedArg{key_tok.lexeme, *val_res, key_tok.location};
}

Result<Expr> Parser::expr() {
    SourceLocation loc = peek().location;
    if (match(TokenType::String)) {
        std::string s = previous().lexeme;
        if (is_label(s)) {
            return LabelExpr{s, loc};
        } else {
            return StringLiteral{s, loc};
        }
    } else if (check(TokenType::LBracket)) {
        auto list_res = list_expr();
        if (!list_res) return std::unexpected(list_res.error());
        return *list_res;
    }

    diagnostics_.push_back({
        Diagnostic::Severity::Error,
        "Expected expression (string or list)",
        loc,
        "Provide a string literal or string array [src, ...]"
    });
    return std::unexpected(Error{StatusCode::InvalidArgument, "Expected expression", "Parser"});
}

Result<ListExpr> Parser::list_expr() {
    SourceLocation loc = peek().location;
    advance(); // Consume '['

    std::vector<std::variant<StringLiteral, LabelExpr>> elements;
    while (!check(TokenType::RBracket) && !check(TokenType::Eof)) {
        auto element_res = expr();
        if (!element_res) {
            return std::unexpected(element_res.error());
        }
        
        // Ensure element is not nested list
        if (auto* str = std::get_if<StringLiteral>(&*element_res)) {
            elements.push_back(*str);
        } else if (auto* lbl = std::get_if<LabelExpr>(&*element_res)) {
            elements.push_back(*lbl);
        } else {
            diagnostics_.push_back({
                Diagnostic::Severity::Error,
                "Lists cannot contain nested lists in simple BUILD format",
                peek().location,
                "Remove double brackets"
            });
            return std::unexpected(Error{StatusCode::InvalidArgument, "Nested list forbidden", "Parser"});
        }

        if (!match(TokenType::Comma)) {
            if (!check(TokenType::RBracket)) {
                diagnostics_.push_back({
                    Diagnostic::Severity::Error,
                    "Expected ',' or ']' after list item",
                    peek().location,
                    "Add a separating comma"
                });
                return std::unexpected(Error{StatusCode::InvalidArgument, "Expected ','", "Parser"});
            }
        }
    }

    if (!consume(TokenType::RBracket, "Expected ']' at the end of list")) {
        return std::unexpected(Error{StatusCode::InvalidArgument, "Expected ]", "Parser"});
    }

    return ListExpr{elements, loc};
}

} // namespace buildforge
