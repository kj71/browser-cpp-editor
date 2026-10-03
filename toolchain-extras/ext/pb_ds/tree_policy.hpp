#ifndef CPP_EDITOR_PB_DS_TREE_POLICY_HPP
#define CPP_EDITOR_PB_DS_TREE_POLICY_HPP

namespace __gnu_pbds {

// PBDS accepts this policy as the fifth template argument to tree. The
// compatibility tree implements order statistics directly, so the policy
// type itself carries no behavior.
template <class...>
class tree_order_statistics_node_update {};

}  // namespace __gnu_pbds

#endif
