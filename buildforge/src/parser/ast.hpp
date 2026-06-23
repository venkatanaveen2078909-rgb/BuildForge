#pragma once

#include <string>
#include <vector>
#include <variant>
#include <unordered_map>
#include <ostream>

namespace buildforge {

struct SourceLocation {
    std::string path;
    int line{0};
    int col{0};
};

struct StringLiteral {
    std::string value;
    SourceLocation location;
};

struct LabelExpr {
    std::string value; // e.g. "//pkg:target"
    SourceLocation location;
};

struct ListExpr {
    std::vector<std::variant<StringLiteral, LabelExpr>> elements;
    SourceLocation location;
};

using Expr = std::variant<StringLiteral, LabelExpr, ListExpr>;

struct NamedArg {
    std::string name;
    Expr value;
    SourceLocation location;
};

struct RuleCall {
    std::string rule_type; // e.g., "cc_binary", "cc_library"
    std::string name;      // The target name, unique in package
    std::unordered_map<std::string, Expr> args;
    SourceLocation location;
};

struct Diagnostic {
    enum class Severity { Info, Warning, Error };
    Severity severity;
    std::string message;
    SourceLocation location;
    std::string hint;
};

} // namespace buildforge
