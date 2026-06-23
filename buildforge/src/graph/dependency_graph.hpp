#pragma once

#include "../common/result.hpp"
#include "../parser/ast.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <algorithm>
#include <expected>
#include <optional>
#include <format>

namespace buildforge {

struct CycleError {
    std::string message;
    std::vector<std::string> path;
};

struct BuildTarget {
    std::string name;
    std::string rule_type;
    std::vector<std::string> deps;
};

template<typename NodeId = std::string>
class DependencyGraph {
public:
    void add_node(NodeId id, BuildTarget target) {
        nodes_[id] = std::move(target);
        if (!adj_.contains(id)) {
            adj_[id] = {};
            in_degree_[id] = 0;
        }
    }

    void add_edge(NodeId from, NodeId to) {
        adj_[from].push_back(to);
        in_degree_[to]++;
        if (!nodes_.contains(to)) {
            // Placeholder target
            nodes_[to] = BuildTarget{to, "external", {}};
        }
        if (!nodes_.contains(from)) {
            nodes_[from] = BuildTarget{from, "external", {}};
        }
    }

    std::expected<std::vector<NodeId>, CycleError> topological_sort() const {
        std::unordered_map<NodeId, int> temp_in_degree = in_degree_;
        
        // Find all nodes (both in adjacent list and mapped targets)
        std::vector<NodeId> all_nodes;
        for (const auto& [node, _] : nodes_) {
            all_nodes.push_back(node);
        }
        // lex sort keys for determinism
        std::sort(all_nodes.begin(), all_nodes.end());

        std::priority_queue<NodeId, std::vector<NodeId>, std::greater<NodeId>> zero_in_degree;
        for (const auto& node : all_nodes) {
            if (temp_in_degree[node] == 0) {
                zero_in_degree.push(node);
            }
        }

        std::vector<NodeId> sorted;
        while (!zero_in_degree.empty()) {
            NodeId u = zero_in_degree.top();
            zero_in_degree.pop();
            sorted.push_back(u);

            if (auto it = adj_.find(u); it != adj_.end()) {
                for (const auto& v : it->second) {
                    temp_in_degree[v]--;
                    if (temp_in_degree[v] == 0) {
                        zero_in_degree.push(v);
                    }
                }
            }
        }

        if (sorted.size() < all_nodes.size()) {
            auto cycle = find_cycle();
            std::vector<std::string> cycle_paths;
            if (cycle) {
                for (const auto& n : *cycle) {
                    if constexpr (std::is_same_v<NodeId, std::string>) {
                        cycle_paths.push_back(n);
                    } else {
                        cycle_paths.push_back(std::format("{}", n)); // requires C++20/23 matching
                    }
                }
            }
            return std::unexpected(CycleError{
                "Dependency cycle detected in build graph.",
                cycle_paths
            });
        }

        return sorted;
    }

    std::optional<std::vector<NodeId>> find_cycle() const {
        std::unordered_set<NodeId> visited;
        std::unordered_set<NodeId> rec_stack;
        std::unordered_map<NodeId, NodeId> parent;
        std::vector<NodeId> cycle;

        auto dfs = [&](auto& self, NodeId u) -> bool {
            visited.insert(u);
            rec_stack.insert(u);

            if (auto it = adj_.find(u); it != adj_.end()) {
                for (const auto& v : it->second) {
                    if (!visited.contains(v)) {
                        parent[v] = u;
                        if (self(self, v)) return true;
                    } else if (rec_stack.contains(v)) {
                        // Found a back edge, reconstruct the cycle path
                        NodeId curr = u;
                        cycle.push_back(v);
                        while (curr != v) {
                            cycle.push_back(curr);
                            if (parent.contains(curr)) {
                                curr = parent[curr];
                            } else {
                                break;
                            }
                        }
                        cycle.push_back(v);
                        std::reverse(cycle.begin(), cycle.end());
                        return true;
                    }
                }
            }

            rec_stack.erase(u);
            return false;
        };

        for (const auto& [node, _] : nodes_) {
            if (!visited.contains(node)) {
                if (dfs(dfs, node)) {
                    return cycle;
                }
            }
        }

        return std::nullopt;
    }

    std::vector<std::vector<NodeId>> independent_batches() const {
        std::unordered_map<NodeId, int> temp_in_degree = in_degree_;
        std::unordered_set<NodeId> all_nodes_set;
        for (const auto& [node, _] : nodes_) {
            all_nodes_set.insert(node);
        }

        std::vector<std::vector<NodeId>> batches;
        std::vector<NodeId> current_batch;

        // Populate initial batch
        for (const auto& node : all_nodes_set) {
            if (temp_in_degree[node] == 0) {
                current_batch.push_back(node);
            }
        }
        std::sort(current_batch.begin(), current_batch.end());

        while (!current_batch.empty()) {
            batches.push_back(current_batch);
            std::vector<NodeId> next_batch;
            for (const auto& u : current_batch) {
                if (auto it = adj_.find(u); it != adj_.end()) {
                    for (const auto& v : it->second) {
                        temp_in_degree[v]--;
                        if (temp_in_degree[v] == 0) {
                            next_batch.push_back(v);
                        }
                    }
                }
            }
            std::sort(next_batch.begin(), next_batch.end());
            current_batch = std::move(next_batch);
        }

        return batches;
    }

    std::unordered_set<NodeId> transitive_deps(NodeId root) const {
        std::unordered_set<NodeId> visited;
        std::queue<NodeId> q;
        q.push(root);

        while (!q.empty()) {
            NodeId u = q.front();
            q.pop();

            if (auto it = adj_.find(u); it != adj_.end()) {
                for (const auto& v : it->second) {
                    if (!visited.contains(v)) {
                        visited.insert(v);
                        q.push(v);
                    }
                }
            }
        }

        return visited;
    }

    const std::unordered_map<NodeId, BuildTarget>& nodes() const { return nodes_; }
    const std::unordered_map<NodeId, std::vector<NodeId>>& adj() const { return adj_; }

private:
    std::unordered_map<NodeId, BuildTarget> nodes_;
    std::unordered_map<NodeId, std::vector<NodeId>> adj_;
    std::unordered_map<NodeId, int> in_degree_;
};

} // namespace buildforge
