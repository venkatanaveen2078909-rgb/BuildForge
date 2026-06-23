#pragma once

#include "../common/result.hpp"
#include <string>
#include <vector>
#include <span>
#include <cstddef>

namespace buildforge {

using ArtifactId = std::string;

enum class CompressionLevel {
    Fast = 1,
    Default = 3,
    High = 9
};

enum class StoreError {
    DiskFull,
    CorruptionDetected,
    WriteFailed,
    ReadFailed,
    FileNotFound
};

class ArtifactStore {
public:
    virtual ~ArtifactStore() = default;

    virtual std::expected<ArtifactId, StoreError>
        store(std::span<const std::byte> data, CompressionLevel level) = 0;

    virtual std::expected<std::vector<std::byte>, StoreError>
        retrieve(ArtifactId id) = 0;

    virtual bool verify_integrity(ArtifactId id) = 0;
};

class LocalArtifactStore : public ArtifactStore {
public:
    explicit LocalArtifactStore(std::string store_root);

    std::expected<ArtifactId, StoreError>
        store(std::span<const std::byte> data, CompressionLevel level) override;

    std::expected<std::vector<std::byte>, StoreError>
        retrieve(ArtifactId id) override;

    bool verify_integrity(ArtifactId id) override;

private:
    std::string get_content_addressed_path(const ArtifactId& id) const;

    std::string store_root_;
};

} // namespace buildforge
