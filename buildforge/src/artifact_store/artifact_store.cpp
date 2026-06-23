#include "artifact_store.hpp"
#include <iomanip>
#include <sstream>
#include <filesystem>
#include <fstream>
#include <openssl/sha.h>

namespace buildforge {

LocalArtifactStore::LocalArtifactStore(std::string store_root)
    : store_root_(std::move(store_root)) {
    std::filesystem::create_directories(store_root_);
}

std::string LocalArtifactStore::get_content_addressed_path(const ArtifactId& id) const {
    if (id.length() < 5) return store_root_ + "/" + id;
    std::string part1 = id.substr(0, 2);
    std::string part2 = id.substr(2, 2);
    std::string rest = id.substr(4);
    return store_root_ + "/" + part1 + "/" + part2 + "/" + rest;
}

std::expected<ArtifactId, StoreError>
LocalArtifactStore::store(std::span<const std::byte> data, CompressionLevel level) {
    // 1. Compute SHA-256 for Content Addressing
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(data.data()), data.size_bytes(), hash);

    std::stringstream hex_ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        hex_ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
    }
    ArtifactId id = hex_ss.str();
    
    std::string target_path = get_content_addressed_path(id);
    std::filesystem::create_directories(std::filesystem::path(target_path).parent_path());

    // 2. Write details (simulated compression with a zstd tag)
    std::ofstream out(target_path, std::ios::binary);
    if (!out) return std::unexpected(StoreError::WriteFailed);

    // Write a mock header indicating compression
    const char header[] = "ZSTD_MOCK_COMPRESSED_V1";
    out.write(header, sizeof(header));
    out.write(reinterpret_cast<const char*>(data.data()), data.size_bytes());
    
    return id;
}

std::expected<std::vector<std::byte>, StoreError>
LocalArtifactStore::retrieve(ArtifactId id) {
    std::string target_path = get_content_addressed_path(id);
    if (!std::filesystem::exists(target_path)) {
        return std::unexpected(StoreError::FileNotFound);
    }

    std::ifstream in(target_path, std::ios::binary | std::ios::ate);
    if (!in) return std::unexpected(StoreError::ReadFailed);

    std::streamsize file_size = in.tellg();
    in.seekg(0, std::ios::beg);

    const char expected_header[] = "ZSTD_MOCK_COMPRESSED_V1";
    char header_buff[sizeof(expected_header)];
    in.read(header_buff, sizeof(expected_header));
    
    std::streamsize data_size = file_size - sizeof(expected_header);
    std::vector<std::byte> buffer(data_size);
    in.read(reinterpret_cast<char*>(buffer.data()), data_size);

    return buffer;
}

bool LocalArtifactStore::verify_integrity(ArtifactId id) {
    auto data_res = retrieve(id);
    if (!data_res) return false;

    // Recompute hash
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(data_res->data()), data_res->size(), hash);

    std::stringstream hex_ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        hex_ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
    }
    
    return hex_ss.str() == id;
}

} // namespace buildforge
