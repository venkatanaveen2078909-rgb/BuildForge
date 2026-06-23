#include "work_stealing.hpp"
#include <random>

namespace buildforge {

WorkStealingScheduler::WorkStealingScheduler(std::size_t thread_count)
    : local_queues_(thread_count) {
    
    for (std::size_t i = 0; i < thread_count; ++i) {
        workers_.emplace_back([this, i](std::stop_token st) {
            // Register stop callback or just run the worker loop
            worker_loop(i);
        });
    }
}

WorkStealingScheduler::~WorkStealingScheduler() {
    shutdown();
}

void WorkStealingScheduler::submit(Task task) {
    static std::atomic<std::size_t> round_robin_counter{0};
    
    if (!running_) return;

    // Distribute among deques evenly
    std::size_t idx = round_robin_counter.fetch_add(1) % local_queues_.size();
    local_queues_[idx].push_back(std::move(task));
    
    cv_.notify_all();
}

void WorkStealingScheduler::shutdown() {
    if (running_.exchange(false)) {
        cv_.notify_all();
        for (auto& wrk : workers_) {
            if (wrk.joinable()) {
                wrk.request_stop();
            }
        }
    }
}

void WorkStealingScheduler::worker_loop(std::size_t index) {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<std::size_t> dist(0, local_queues_.size() - 1);

    while (running_) {
        std::optional<Task> task;

        // 1. Pop from local queue tail
        task = local_queues_[index].pop_back();

        // 2. If empty, try to steal from other queues (from their head)
        if (!task) {
            std::size_t victim = dist(gen);
            if (victim != index) {
                task = local_queues_[victim].steal();
            }
        }

        // 3. If still empty, check global queue
        if (!task) {
            std::lock_guard<std::mutex> lock(global_mutex_);
            if (!global_queue_.empty()) {
                task = std::move(global_queue_.front());
                global_queue_.pop_front();
            }
        }

        // 4. Run the task with exception safety
        if (task) {
            try {
                (*task)();
            } catch (const std::exception& e) {
                std::cerr << "[WorkStealingScheduler] Task threw exception: " << e.what() << "\n";
            } catch (...) {
                std::cerr << "[WorkStealingScheduler] Task threw unknown exception\n";
            }
        } else {
            // 5. Block on condition variable if all queues empty
            std::unique_lock<std::mutex> lock(cv_mtx_);
            cv_.wait_for(lock, std::chrono::milliseconds(10), [this, index]() {
                if (!running_) return true;
                if (!local_queues_[index].empty()) return true;
                return false;
            });
        }
    }
}

} // namespace buildforge
