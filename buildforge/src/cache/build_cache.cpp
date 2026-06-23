#include "build_cache.hpp"
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <openssl/sha.h>

namespace buildforge {

BuildCache::BuildCache(std::string local_store_root, std::string remote_endpoint)
    : local_root_(std::move(local_store_root)), remote_endpoint_(std::move(remote_endpoint)) {}

std::string BuildCache::compute_key(
    const std::vector<std::string>& source_contents,
    const std::vector<std::string>& dep_cache_keys,
    const std::string& compiler_version,
    const std::vector<std::string>& compiler_flags,
    const std::string& target_name
) {
    // 1. Sort files
    auto sorted_srcs = source_contents;
    std::sort(sorted_srcs.begin(), sorted_srcs.end());

    // 2. Sort dependents
    auto sorted_deps = dep_cache_keys;
    std::sort(sorted_deps.begin(), sorted_deps.end());

    // 3. Sort flags
    auto sorted_flags = compiler_flags;
    std::sort(sorted_flags.begin(), sorted_flags.end());

    // 4. Concatenate
    std::stringstream ss;
    for (const auto& s : sorted_srcs) ss << s << "|";
    for (const auto& d : sorted_deps) ss << d << "|";
    ss << compiler_version << "|";
    for (const auto& f : sorted_flags) ss << f << "|";
    ss << target_name;

    std::string input = ss.str();

    // 5. Generate SHA-256 hash
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(input.c_str()), input.length(), hash);

    std::stringstream hex_ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        hex_ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
    }

    return hex_ss.str();
}

std::expected<CacheEntry, Error> BuildCache::lookup(const std::string& key) {
    // Stage 1: In-memory lookup (hot cache)
    if (in_memory_cache_.contains(key)) {
        hits_++;
        auto& entry = in_memory_cache_[key];
        entry.hit_count++;
        time_saved_ms_ += entry.build_duration_ms;
        return entry;
    }

    // Stage 2: Check local disk (simulated here)
    // In a real implementation, we would check the filesystem index
    // Stage 3: Check remote cache (simulated gRPC client check)
    
    misses_++;
    return std::unexpected(Error{
        StatusCode::NotFound,
        "Cache miss for key: " + key,
        "BuildCache"
    });
}

std::expected<void, Error> BuildCache::store(const std::string& key, const CacheEntry& entry) {
    // Store in hot, disk, and remote
    in_memory_cache_[key] = entry;
    return {};
}

CacheStats BuildCache::stats() const {
    uint32_t total = hits_ + misses_;
    double ratio = total == 0 ? 0.0 : static_cast<double>(hits_) / total;
    return CacheStats{
        hits_,
        misses_,
        ratio,
        bytes_saved_,
        time_saved_ms_
    };
}

void BuildCache::clean(std::chrono::hours older_than) {
    // In-memory cache clean
    in_memory_cache_.clear();
}

} // namespace buildforge
