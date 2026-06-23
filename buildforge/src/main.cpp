#include "parser/lexer.hpp"
#include "parser/parser.hpp"
#include "graph/dependency_graph.hpp"
#include "scheduler/work_stealing.hpp"
#include "cache/build_cache.hpp"
#include <iostream>
#include <vector>
#include <string>

int main(int argc, char* argv[]) {
    std::cout << "===========================================\n";
    std::cout << " BuildForge Distributed Incremental Builder\n";
    std::cout << "===========================================\n\n";

    // Standard sample BUILD file string
    std::string build_file_content = R"(
        cc_library(
            name = "common_utils",
            srcs = ["utils.cpp", "hash.cpp"],
            deps = []
        )

        cc_library(
            name = "graph_engine",
            srcs = ["graph.cpp"],
            deps = [":common_utils"]
        )

        cc_library(
            name = "work_stealer",
            srcs = ["scheduler.cpp"],
            deps = [":common_utils"]
        )

        cc_binary(
            name = "buildforge_core",
            srcs = ["main.cpp"],
            deps = [":graph_engine", ":work_stealer"]
        )
    )";

    std::cout << "[Step 1] Initializing Handwritten Lexer & Parser...\n";
    buildforge::Lexer lexer(build_file_content, "BUILD");
    auto tokens = lexer.tokenize();
    std::cout << " -> Tokenized " << tokens.size() << " elements.\n";

    buildforge::Parser parser(tokens);
    auto rules_res = parser.parse();
    if (!rules_res) {
        std::cerr << " -> Syntax check failed: " << rules_res.error().to_string() << "\n";
        return 1;
    }
    std::cout << " -> Parser parsed " << rules_res->size() << " build targets successfully.\n";

    std::cout << "\n[Step 2] Engineering Dependency DAG and detecting cycle constraints...\n";
    buildforge::DependencyGraph<std::string> graph;

    // Load rules into DAG
    for (const auto& rule : *rules_res) {
        buildforge::BuildTarget target{rule.name, rule.rule_type, {}};
        
        // Extract dependencies
        if (rule.args.contains("deps")) {
            if (auto* list = std::get_if<buildforge::ListExpr>(&rule.args.at("deps"))) {
                for (const auto& elem : list->elements) {
                    if (auto* lbl = std::get_if<buildforge::LabelExpr>(&elem)) {
                        std::string dep_name = lbl->value.starts_with(":") ? "//" + lbl->value.substr(1) : lbl->value;
                        std::string clean_node = "//:" + rule.name;
                        std::string clean_dep = dep_name.starts_with("//:") ? dep_name : "//:" + dep_name.substr(dep_name.find(':') + 1);
                        graph.add_edge(clean_dep, clean_node);
                        target.deps.push_back(clean_dep);
                    }
                }
            }
        }
        graph.add_node("//:" + rule.name, target);
    }

    auto sort_res = graph.topological_sort();
    if (!sort_res) {
        std::cerr << " -> Critical: circular dependency cycle detected!\n";
        for (const auto& node : sort_res.error().path) {
            std::cerr << "   " << node << " ->\n";
        }
        return 2;
    }

    std::cout << " -> Topological sorting successful. Order of execution:\n";
    for (const auto& node : *sort_res) {
        std::cout << "   - " << node << "\n";
    }

    std::cout << "\n[Step 3] Grouping independent parallel batches...\n";
    auto batches = graph.independent_batches();
    for (size_t col = 0; col < batches.size(); ++col) {
        std::cout << "  Layer " << col << ": ";
        for (const auto& node : batches[col]) {
            std::cout << node << " ";
        }
        std::cout << "\n";
    }

    std::cout << "\n[Step 4] Starting Work-Stealing scheduler thread-pool (4 hardware cores)...\n";
    buildforge::WorkStealingScheduler scheduler(4);

    // Submit mock jobs
    std::cout << " -> Submitting targets to decentralized worker queues...\n";
    for (const auto& node : *sort_res) {
        scheduler.submit(buildforge::Task([node]() {
            std::cout << "   [Thread " << std::this_thread::get_id() << "] Resolving node: " << node << "\n";
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
        }));
    }

    // Wait and shutdown
    std::this_thread::sleep_for(std::chrono::milliseconds(300));
    scheduler.shutdown();

    std::cout << "\n[Success] BuildForge successfully built all targets incrementallly.\n";
    return 0;
}
