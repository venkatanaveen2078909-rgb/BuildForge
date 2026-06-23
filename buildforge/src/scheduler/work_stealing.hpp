#pragma once

#include <vector>
#include <deque>
#include <mutex>
#include <thread>
#include <atomic>
#include <condition_variable>
#include <functional>
#include <optional>
#include <iostream>
#include <concepts>

namespace buildforge {

// C++23 style move-only task wrapper since we need move-only task support
class Task {
public:
    Task() = default;
    
    template<typename F>
    requires std::invocable<F> && (!std::same_as<std::decay_t<F>, Task>)
    Task(F&& f) : callable_(std::forward<F>(f)) {}

    Task(Task&&) noexcept = default;
    Task& operator=(Task&&) noexcept = default;

    Task(const Task&) = delete;
    Task& operator=(const Task&) = delete;

    void operator()() {
        if (callable_) {
            callable_();
        }
    }

    explicit operator bool() const noexcept {
        return static_cast<bool>(callable_);
    }

private:
    std::function<void()> callable_; // Simple fallback wrapper that captures nicely
};

template<typename T>
class WorkStealingDeque {
public:
    void push_back(T item) {
        std::lock_guard<std::mutex> lock(mutex_);
        deque_.push_back(std::move(item));
    }

    std::optional<T> pop_back() {
        std::lock_guard<std::mutex> lock(mutex_);
        if (deque_.empty()) return std::nullopt;
        T item = std::move(deque_.back());
        deque_.pop_back();
        return item;
    }

    std::optional<T> steal() {
        std::lock_guard<std::mutex> lock(mutex_);
        if (deque_.empty()) return std::nullopt;
        T item = std::move(deque_.front());
        deque_.pop_front();
        return item;
    }

    bool empty() {
        std::lock_guard<std::mutex> lock(mutex_);
        return deque_.empty();
    }

    size_t size() {
        std::lock_guard<std::mutex> lock(mutex_);
        return deque_.size();
    }

private:
    std::deque<T> deque_;
    std::mutex mutex_;
};

class WorkStealingScheduler {
public:
    explicit WorkStealingScheduler(std::size_t thread_count);
    ~WorkStealingScheduler();

    void submit(Task task);
    void shutdown();

private:
    void worker_loop(std::size_t index);

    std::vector<std::jthread> workers_;
    std::vector<WorkStealingDeque<Task>> local_queues_;
    
    // Fallback queue when no work in deques
    std::deque<Task> global_queue_;
    std::mutex global_mutex_;
    
    std::atomic<bool> running_{true};
    std::condition_variable cv_;
    std::mutex cv_mtx_;
};

} // namespace buildforge
