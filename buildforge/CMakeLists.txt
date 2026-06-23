cmake_minimum_required(VERSION 3.25)
project(BuildForge
    VERSION 1.0.0
    LANGUAGES CXX
)

# Force C++23 execution
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Treat warnings as errors
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Werror)
endif()

# Find Protobuf and gRPC
find_package(gRPC CONFIG REQUIRED)
find_package(Protobuf REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(fmt CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)

# Include directories can be handled modernly by linking target interfaces
add_library(buildforge_common INTERFACE)
target_include_directories(buildforge_common INTERFACE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Create Proto library
protobuf_generate_cpp(PROTO_SRCS PROTO_HDRS proto/buildforge.proto)
# In standard C++ setups, grpc generates code as well:
# grpc_generate_cpp(GRPC_SRCS GRPC_HDRS proto/buildforge.proto)

add_library(buildforge_proto
    ${PROTO_SRCS}
    ${PROTO_HDRS}
)
target_link_libraries(buildforge_proto PUBLIC
    protobuf::libprotobuf
    gRPC::grpc++
)

# Parser target
add_library(buildforge_parser STATIC
    src/parser/lexer.cpp
    src/parser/parser.cpp
)
target_link_libraries(buildforge_parser PUBLIC
    buildforge_common
)

# Artifact and Cache targets
add_library(buildforge_cache STATIC
    src/cache/build_cache.cpp
    src/artifact_store/artifact_store.cpp
)
target_link_libraries(buildforge_cache PUBLIC
    buildforge_common
    OpenSSL::SSL
    OpenSSL::Crypto
)

# Scheduler target
add_library(buildforge_scheduler STATIC
    src/scheduler/work_stealing.cpp
)
target_link_libraries(buildforge_scheduler PUBLIC
    buildforge_common
)

# Main Executable
add_executable(buildforge_cli
    src/main.cpp
)
target_link_libraries(buildforge_cli PRIVATE
    buildforge_parser
    buildforge_cache
    buildforge_scheduler
    buildforge_proto
    fmt::fmt
    spdlog::spdlog
    nlohmann_json::nlohmann_json
)
