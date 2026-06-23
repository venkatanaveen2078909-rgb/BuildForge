#pragma once

#include <expected>
#include <string>
#include <system_error>

namespace buildforge {

enum class StatusCode {
    Ok = 0,
    Cancelled = 1,
    Unknown = 2,
    InvalidArgument = 3,
    DeadlineExceeded = 4,
    NotFound = 5,
    AlreadyExists = 6,
    PermissionDenied = 7,
    ResourceExhausted = 8,
    FailedPrecondition = 9,
    Aborted = 10,
    OutOfRange = 11,
    Unimplemented = 12,
    Internal = 13,
    Unavailable = 14,
    DataLoss = 15,
    Unauthenticated = 16
};

struct Error {
    StatusCode code;
    std::string message;
    std::string module;

    [[nodiscard]] std::string to_string() const {
        return "[" + module + "] Error (" + std::to_string(static_cast<int>(code)) + "): " + message;
    }
};

template<typename T>
using Result = std::expected<T, Error>;

} // namespace buildforge
