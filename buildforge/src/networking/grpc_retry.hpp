#pragma once

#include "../common/result.hpp"
#include <chrono>
#include <expected>
#include <random>
#include <thread>
#include <concepts>
#include <functional>

namespace buildforge {

struct RetryPolicy {
    int max_attempts{3};
    std::chrono::milliseconds initial_backoff{100};
    float backoff_multiplier{2.0f};
    std::chrono::milliseconds max_backoff{2000};
    bool retry_on_deadline_exceeded{true};
};

struct RpcError {
    StatusCode code;
    std::string message;
};

template<typename Fn>
requires std::invocable<Fn>
auto with_retry(Fn&& rpc_call, RetryPolicy policy) -> std::expected<std::invoke_result_t<Fn>, RpcError> {
    using ReturnType = std::invoke_result_t<Fn>;
    
    std::random_device rd;
    std::mt19937 gen(rd());
    
    std::chrono::milliseconds current_backoff = policy.initial_backoff;
    
    for (int attempt = 1;; ++attempt) {
        try {
            auto result = rpc_call();
            // In a real gRPC setup, we'd check if the status returned is Ok.
            // If it's a fallible type or expected, handle appropriately.
            return result;
        } catch (const std::exception& e) {
            // Check if we can retry
            if (attempt >= policy.max_attempts) {
                return std::unexpected(RpcError{StatusCode::Unavailable, std::string("RPC failed after max attempts: ") + e.what()});
            }
            
            // Jitter calculation
            std::uniform_real_distribution<float> jitter_dist(0.8f, 1.2f);
            float jitter = jitter_dist(gen);
            std::chrono::milliseconds backoff = std::chrono::duration_cast<std::chrono::milliseconds>(current_backoff * jitter);
            
            std::this_thread::sleep_for(backoff);
            
            current_backoff = std::chrono::duration_cast<std::chrono::milliseconds>(current_backoff * policy.backoff_multiplier);
            if (current_backoff > policy.max_backoff) {
                current_backoff = policy.max_backoff;
            }
        }
    }
}

} // namespace buildforge
