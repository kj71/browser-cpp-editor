#ifndef CPP_EDITOR_PB_DS_ASSOC_CONTAINER_HPP
#define CPP_EDITOR_PB_DS_ASSOC_CONTAINER_HPP

#include <cstddef>
#include <iterator>
#include <set>

// YoWASP Clang uses libc++ and does not include GNU libstdc++'s PBDS headers.
// This compatibility layer provides the ordered-set API commonly used in
// competitive programming, backed by std::set.
namespace __gnu_pbds {

struct null_type {};
struct rb_tree_tag {};
struct splay_tree_tag {};
struct ov_tree_tag {};

template <class...>
class null_node_update {};

template <
    class Key,
    class Mapped,
    class Cmp_Fn = std::less<Key>,
    class Tag = rb_tree_tag,
    template <class...> class Node_Update = null_node_update>
class tree : public std::set<Key, Cmp_Fn> {
  using base_type = std::set<Key, Cmp_Fn>;

 public:
  using base_type::base_type;
  using typename base_type::const_iterator;
  using typename base_type::iterator;
  using typename base_type::size_type;

  size_type order_of_key(const Key& key) const {
    return static_cast<size_type>(std::distance(this->begin(), this->lower_bound(key)));
  }

  iterator find_by_order(size_type order) {
    if (order >= this->size()) return this->end();
    auto result = this->begin();
    std::advance(result, static_cast<typename base_type::difference_type>(order));
    return result;
  }

  const_iterator find_by_order(size_type order) const {
    if (order >= this->size()) return this->end();
    auto result = this->cbegin();
    std::advance(result, static_cast<typename base_type::difference_type>(order));
    return result;
  }
};

}  // namespace __gnu_pbds

#endif
