#pragma once

#include "../common/result.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <chrono>
#include <memory>

namespace buildforge {

struct CacheEntry {
    std::string key; // SHA - 256 hash
    std::vector<std::string> artifact_paths;
    uint64_t build_duration_ms{0};
    uint64_t timestamp{0};
    uint32_t hit_count{0};
};

struct CacheStats {
    uint32_t hits{0};
    uint32_t misses{0};
    double hit_ratio{0.0};
    uint64_t bytes_saved{0};
    uint64_t time_saved_ms{0};
};

class BuildCache {
public:
    BuildCache(std::string local_store_root, std::string remote_endpoint);

    std::expected<CacheEntry, Error> lookup(const std::string& key);
    std::expected<void, Error> store(const std::string& key, const CacheEntry& entry);
    
    CacheStats stats() const;
    void clean(std::chrono::hours older_than);

    // Compute key of a target
    static std::string compute_key(
        const std::vector<std::string>& source_contents,
        const std::vector<std::string>& dep_cache_keys,
        const std::string& compiler_version,
        const std::vector<std::string>& compiler_flags,
        const std::string& target_name
    );

private:
    std::string local_root_;
    std::string remote_endpoint_;
    
    // In-memory index (hot tier)
    std::unordered_map<std::string, CacheEntry> in_memory_cache_;
    
    mutable uint32_t hits_{0};
    mutable uint32_t misses_{0};
    mutable uint64_t time_saved_ms_{0};
    mutable uint64_t bytes_saved_{0};
};

} // namespace buildforge
